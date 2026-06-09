const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const preview = document.getElementById("preview");
const statusText = document.getElementById("status");

const sortBtn = document.getElementById("sortBtn");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");

const pdfModeSelect = document.getElementById("pdfMode");
const pageSizeSelect = document.getElementById("pageSize");
const orientationSelect = document.getElementById("orientation");
const imageQualitySelect = document.getElementById("imageQuality");

let selectedImages = [];

/* Manual drag reorder */
new Sortable(preview, {
  animation: 150,
  handle: ".drag-handle",
  ghostClass: "sortable-ghost",
  onEnd: updateOrderFromDOM
});

/* Click upload */
imageInput.addEventListener("change", function () {
  addFiles(this.files);
  imageInput.value = "";
});

/* Drag over */
dropZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

/* Drag leave */
dropZone.addEventListener("dragleave", function () {
  dropZone.classList.remove("drag-over");
});

/* Drop upload */
dropZone.addEventListener("drop", function (e) {
  e.preventDefault();
  dropZone.classList.remove("drag-over");

  addFiles(e.dataTransfer.files);
});

/* Sort button */
sortBtn.addEventListener("click", function () {
  sortFilesByName();
  renderPreview();
  updateStatus("Images sorted by filename.");
});

/* Clear button */
clearBtn.addEventListener("click", function () {
  selectedImages = [];
  preview.innerHTML = "";
  updateStatus("Cleared all images.");
});

/* Remove one image */
preview.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;

    selectedImages = selectedImages.filter(item => item.id !== id);

    renderPreview();
    updateStatus(`${selectedImages.length} images selected.`);
  }
});

/* Convert button */
convertBtn.addEventListener("click", async function () {
  if (selectedImages.length === 0) {
    updateStatus("ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  updateOrderFromDOM();

  const pdfMode = pdfModeSelect.value;

  try {
    convertBtn.disabled = true;
    convertBtn.textContent = "Converting...";

    if (pdfMode === "continuous") {
      await createContinuousPdf();
    } else {
      await createNormalPdf();
    }
  } catch (error) {
    console.error(error);
    updateStatus("PDF ပြောင်းရာမှာ error ဖြစ်သွားပါတယ်။ Image size လျှော့ပြီးပြန်စမ်းပါ။");
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to PDF";
  }
});

/* Add uploaded files */
function addFiles(files) {
  const imageFiles = Array.from(files).filter(file =>
    file.type.startsWith("image/")
  );

  if (imageFiles.length === 0) {
    updateStatus("Image file မတွေ့ပါ။");
    return;
  }

  imageFiles.forEach(file => {
    selectedImages.push({
      id: generateId(),
      file: file
    });
  });

  sortFilesByName();
  renderPreview();
  updateStatus(`${selectedImages.length} images selected and sorted.`);
}

/* Natural sorting: page1, page2, page10 */
function sortFilesByName() {
  selectedImages.sort((a, b) => {
    return a.file.name.localeCompare(b.file.name, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

/* Render preview */
function renderPreview() {
  preview.innerHTML = "";

  selectedImages.forEach((item, index) => {
    const imageUrl = URL.createObjectURL(item.file);

    const div = document.createElement("div");
    div.className = "item";
    div.dataset.id = item.id;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "☰";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.dataset.id = item.id;

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = item.file.name;

    const fileName = document.createElement("p");
    fileName.innerHTML = `
      <span class="order-number">${index + 1}.</span>
      ${escapeHtml(item.file.name)}
    `;

    div.appendChild(handle);
    div.appendChild(removeBtn);
    div.appendChild(img);
    div.appendChild(fileName);

    preview.appendChild(div);
  });
}

/* Update selectedImages order after drag */
function updateOrderFromDOM() {
  const ids = Array.from(preview.children).map(child => child.dataset.id);

  selectedImages = ids
    .map(id => selectedImages.find(item => item.id === id))
    .filter(Boolean);

  updateOrderNumbers();
}

/* Update preview numbers */
function updateOrderNumbers() {
  const numbers = document.querySelectorAll(".order-number");

  numbers.forEach((number, index) => {
    number.textContent = `${index + 1}.`;
  });
}

/* Normal PDF: one image per page */
async function createNormalPdf() {
  updateStatus("Normal PDF ပြောင်းနေပါတယ်...");

  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const orientation = orientationSelect.value;
  const quality = Number(imageQualitySelect.value);

  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: pageSize
  });

  const margin = 0;

  for (let i = 0; i < selectedImages.length; i++) {
    const file = selectedImages[i].file;
    const img = await loadImage(file);
    const imageData = imageToJpegDataUrl(img, quality);

    if (i !== 0) {
      pdf.addPage();
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const ratio = Math.min(
      maxWidth / img.width,
      maxHeight / img.height
    );

    const imgWidth = img.width * ratio;
    const imgHeight = img.height * ratio;

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imageData, "JPEG", x, y, imgWidth, imgHeight);
  }

  pdf.save("normal-images.pdf");
  updateStatus("Normal PDF download ပြီးပါပြီ။");
}

/* Continuous PDF: images joined vertically with no gap */
async function createContinuousPdf() {
  updateStatus("Continuous PDF ပြောင်းနေပါတယ်...");

  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const orientation = orientationSelect.value;
  const quality = Number(imageQualitySelect.value);

  const tempPdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: pageSize
  });

  const pdfWidthMm = tempPdf.internal.pageSize.getWidth();

  /*
    1 mm ≈ 3.7795 px
    PDF width ကို px ပြောင်းပြီး image အားလုံးကို width တူအောင် scale လုပ်မယ်
  */
  const targetWidthPx = Math.floor(pdfWidthMm * 3.7795);

  const loadedImages = [];

  for (let i = 0; i < selectedImages.length; i++) {
    const img = await loadImage(selectedImages[i].file);
    loadedImages.push(img);
  }

  let totalHeightPx = 0;
  const scaledHeights = [];

  loadedImages.forEach(img => {
    const scaledHeight = Math.floor((img.height * targetWidthPx) / img.width);
    scaledHeights.push(scaledHeight);
    totalHeightPx += scaledHeight;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = targetWidthPx;
  canvas.height = totalHeightPx;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = 0;

  loadedImages.forEach((img, index) => {
    const drawHeight = scaledHeights[index];

    /*
      x = 0
      y = currentY
      width = targetWidthPx
      height = drawHeight

      ဒီနေရာမှာ gap မထည့်ထားလို့ image တွေ ပူးနေမယ်
    */
    ctx.drawImage(img, 0, currentY, targetWidthPx, drawHeight);

    currentY += drawHeight;
  });

  const mergedImageData = canvas.toDataURL("image/jpeg", quality);

  const pxToMm = px => px * 0.264583;
  const pdfHeightMm = pxToMm(totalHeightPx);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfWidthMm, pdfHeightMm]
  });

  pdf.addImage(
    mergedImageData,
    "JPEG",
    0,
    0,
    pdfWidthMm,
    pdfHeightMm
  );

  pdf.save("continuous-images.pdf");
  updateStatus("ပုံတွေ ပူးနေတဲ့ Continuous PDF download ပြီးပါပြီ။");
}

/* Load image */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));

    img.src = URL.createObjectURL(file);
  });
}

/* Convert image to JPEG data URL */
function imageToJpegDataUrl(img, quality = 0.95) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  /*
    PNG / WEBP transparent background ဖြစ်ခဲ့ရင်
    PDF ထဲမှာ black မဖြစ်အောင် white background ခံထားတာ
  */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL("image/jpeg", quality);
}

/* Generate unique ID */
function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() + Math.random().toString(16).slice(2);
}

/* Status text */
function updateStatus(message) {
  statusText.textContent = message;
}

/* Prevent HTML injection in filename */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}