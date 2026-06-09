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

/*
  Manual drag reorder
*/
new Sortable(preview, {
  animation: 150,
  handle: ".drag-handle",
  ghostClass: "sortable-ghost",
  onEnd: updateOrderFromDOM
});

/*
  Click upload
*/
imageInput.addEventListener("change", function () {
  addFiles(this.files);
  imageInput.value = "";
});

/*
  Drag over
*/
dropZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

/*
  Drag leave
*/
dropZone.addEventListener("dragleave", function () {
  dropZone.classList.remove("drag-over");
});

/*
  Drop upload
*/
dropZone.addEventListener("drop", function (e) {
  e.preventDefault();
  dropZone.classList.remove("drag-over");

  addFiles(e.dataTransfer.files);
});

/*
  Sort by file name
*/
sortBtn.addEventListener("click", function () {
  sortFilesByName();
  renderPreview();
  updateStatus("Images sorted by filename.");
});

/*
  Clear all button
*/
clearBtn.addEventListener("click", function () {
  clearAllImages();
  updateStatus("Cleared all images.");
});

/*
  Remove one image
*/
preview.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;

    const removedItem = selectedImages.find(item => item.id === id);

    if (removedItem && removedItem.previewUrl) {
      URL.revokeObjectURL(removedItem.previewUrl);
    }

    selectedImages = selectedImages.filter(item => item.id !== id);

    renderPreview();
    updateStatus(`${selectedImages.length} images selected.`);
  }
});

/*
  Convert button
*/
convertBtn.addEventListener("click", async function () {
  if (selectedImages.length === 0) {
    updateStatus("ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  updateOrderFromDOM();

  const pdfMode = pdfModeSelect.value;

  try {
    convertBtn.disabled = true;
    sortBtn.disabled = true;
    clearBtn.disabled = true;
    convertBtn.textContent = "Converting...";

    if (pdfMode === "continuous") {
      await createContinuousPdf();
    } else {
      await createNormalPdf();
    }

    /*
      PDF ထုတ်ပြီးတာနဲ့ browser ထဲက uploaded images,
      preview, input, object URLs တွေကို clear လုပ်မယ်
    */
    setTimeout(() => {
      clearAllImages();
      updateStatus("PDF download ပြီးပါပြီ။ Browser data cleared.");
    }, 500);

  } catch (error) {
    console.error(error);
    updateStatus("PDF ပြောင်းရာမှာ error ဖြစ်သွားပါတယ်။ Image quality ကို Medium/Low ထားပြီး ပြန်စမ်းပါ။");
  } finally {
    convertBtn.disabled = false;
    sortBtn.disabled = false;
    clearBtn.disabled = false;
    convertBtn.textContent = "Convert to PDF";
  }
});

/*
  Add uploaded files
*/
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
      file: file,
      previewUrl: URL.createObjectURL(file)
    });
  });

  sortFilesByName();
  renderPreview();

  updateStatus(`${selectedImages.length} images selected and sorted.`);
}

/*
  Natural sorting
  Example:
  page1.jpg
  page2.jpg
  page10.jpg
*/
function sortFilesByName() {
  selectedImages.sort((a, b) => {
    return a.file.name.localeCompare(b.file.name, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

/*
  Render image preview
*/
function renderPreview() {
  preview.innerHTML = "";

  selectedImages.forEach((item, index) => {
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
    img.src = item.previewUrl;
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

/*
  Update selectedImages order after manual drag
*/
function updateOrderFromDOM() {
  const ids = Array.from(preview.children).map(child => child.dataset.id);

  selectedImages = ids
    .map(id => selectedImages.find(item => item.id === id))
    .filter(Boolean);

  updateOrderNumbers();
}

/*
  Update preview order number
*/
function updateOrderNumbers() {
  const numbers = document.querySelectorAll(".order-number");

  numbers.forEach((number, index) => {
    number.textContent = `${index + 1}.`;
  });
}

/*
  Normal PDF
  One image per page
*/
async function createNormalPdf() {
  updateStatus("Normal PDF ပြောင်းနေပါတယ်...");

  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const orientation = orientationSelect.value;
  const quality = Number(imageQualitySelect.value);

  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: pageSize,
    compress: true
  });

  /*
    Browser memory မကြီးအောင် image width limit
  */
  const MAX_CANVAS_WIDTH = 1400;

  for (let i = 0; i < selectedImages.length; i++) {
    updateStatus(`Normal PDF ပြောင်းနေပါတယ်... ${i + 1}/${selectedImages.length}`);

    const img = await loadImage(selectedImages[i].file);

    if (i !== 0) {
      pdf.addPage();
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const ratio = Math.min(
      pageWidth / img.width,
      pageHeight / img.height
    );

    const imgWidthMm = img.width * ratio;
    const imgHeightMm = img.height * ratio;

    const x = (pageWidth - imgWidthMm) / 2;
    const y = (pageHeight - imgHeightMm) / 2;

    const canvasWidth = Math.min(img.width, MAX_CANVAS_WIDTH);
    const canvasHeight = Math.ceil((img.height * canvasWidth) / img.width);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    const imageData = canvasToJpegDataUrl(canvas, quality);

    pdf.addImage(
      imageData,
      "JPEG",
      x,
      y,
      imgWidthMm,
      imgHeightMm,
      undefined,
      "FAST"
    );

    /*
      Memory release
    */
    canvas.width = 0;
    canvas.height = 0;

    await waitFrame();
  }

  pdf.save("normal-images.pdf");
}

/*
  Continuous PDF
  Images are joined vertically without gap.
  Large image count friendly method.
*/
async function createContinuousPdf() {
  updateStatus("Continuous PDF ပြောင်းနေပါတယ်...");

  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const orientation = orientationSelect.value;
  const quality = Number(imageQualitySelect.value);

  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: pageSize,
    compress: true
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  /*
    Important:
    Canvas တစ်ခုတည်းကို အကြီးကြီးမလုပ်ဘဲ
    image တစ်ခုချင်း / slice တစ်ခုချင်း PDF ထဲထည့်မယ်။
    ဒါကြောင့် image 100+ လည်း handle ပိုကောင်းမယ်။
  */
  const MAX_CANVAS_WIDTH = 1400;

  let currentY = 0;

  for (let i = 0; i < selectedImages.length; i++) {
    updateStatus(`Continuous PDF ပြောင်းနေပါတယ်... ${i + 1}/${selectedImages.length}`);

    const img = await loadImage(selectedImages[i].file);

    let sourceY = 0;

    while (sourceY < img.height) {
      let remainingPageHeightMm = pageHeightMm - currentY;

      /*
        Current page ပြည့်သွားရင် page အသစ်ထည့်မယ်
      */
      if (remainingPageHeightMm < 1) {
        pdf.addPage();
        currentY = 0;
        remainingPageHeightMm = pageHeightMm;
      }

      /*
        PDF page ထဲကျန်တဲ့ height အတိုင်း
        original image ထဲက ဖြတ်ယူမယ့် pixel height တွက်မယ်
      */
      const sourceHeightThatFits = Math.floor(
        (remainingPageHeightMm * img.width) / pageWidthMm
      );

      const sourceHeight = Math.min(
        img.height - sourceY,
        Math.max(1, sourceHeightThatFits)
      );

      const sliceHeightMm = (sourceHeight * pageWidthMm) / img.width;

      /*
        Slice canvas
      */
      const canvasWidth = Math.min(img.width, MAX_CANVAS_WIDTH);
      const canvasHeight = Math.ceil((sourceHeight * canvasWidth) / img.width);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        0,
        sourceY,
        img.width,
        sourceHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      const imageData = canvasToJpegDataUrl(canvas, quality);

      pdf.addImage(
        imageData,
        "JPEG",
        0,
        currentY,
        pageWidthMm,
        sliceHeightMm,
        undefined,
        "FAST"
      );

      currentY += sliceHeightMm;
      sourceY += sourceHeight;

      /*
        Memory release
      */
      canvas.width = 0;
      canvas.height = 0;

      await waitFrame();
    }
  }

  pdf.save("continuous-images.pdf");
}

/*
  Load image from File
*/
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    img.src = url;
  });
}

/*
  Canvas to JPEG
*/
function canvasToJpegDataUrl(canvas, quality = 0.85) {
  return canvas.toDataURL("image/jpeg", quality);
}

/*
  Clear browser selected images, preview, input, object URLs
*/
function clearAllImages() {
  selectedImages.forEach(item => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });

  selectedImages = [];
  imageInput.value = "";
  preview.innerHTML = "";
}

/*
  Wait one frame to keep browser responsive
*/
function waitFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

/*
  Generate unique ID
*/
function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() + Math.random().toString(16).slice(2);
}

/*
  Status text
*/
function updateStatus(message) {
  statusText.textContent = message;
}

/*
  Prevent HTML injection from file name
*/
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}