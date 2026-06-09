const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");
const preview = document.getElementById("preview");
const statusText = document.getElementById("status");

const sortBtn = document.getElementById("sortBtn");
const convertBtn = document.getElementById("convertBtn");
const clearBtn = document.getElementById("clearBtn");

const languageSelect = document.getElementById("languageSelect");
const pdfModeSelect = document.getElementById("pdfMode");
const pageSizeSelect = document.getElementById("pageSize");
const orientationSelect = document.getElementById("orientation");
const imageQualitySelect = document.getElementById("imageQuality");

const fileNameModal = document.getElementById("fileNameModal");
const pdfFileNameInput = document.getElementById("pdfFileNameInput");
const confirmPdfBtn = document.getElementById("confirmPdfBtn");
const cancelPdfBtn = document.getElementById("cancelPdfBtn");

let selectedImages = [];
let currentLang = localStorage.getItem("appLanguage") || "my";

let lastStatus = {
  key: "initialStatus",
  values: {}
};

const translations = {
  my: {
    languageLabel: "ဘာသာစကား",
    appTitle: "Image to PDF Converter",
    subtitle: "Image တွေ upload လုပ်ပြီး filename အလိုက် sort စီကာ PDF ပြောင်းပါ",
    uploadText: "📁 Click သို့မဟုတ် Drag & Drop Images",
    uploadHint: "PNG, JPG, JPEG, WEBP စတဲ့ image files တွေ upload လုပ်နိုင်ပါတယ်",

    pdfModeLabel: "PDF Mode",
    continuousMode: "Continuous - ပုံတွေကို ပူးပြီးထုတ်မယ်",
    normalMode: "Normal - တစ်ပုံတစ်မျက်နှာ",

    pageSizeLabel: "PDF Page Size",
    orientationLabel: "Orientation",
    imageQualityLabel: "Image Quality",

    sortBtn: "Sort by File Name",
    convertBtn: "Convert to PDF",
    convertingBtn: "Converting...",
    clearBtn: "Clear All",

    previewTitle: "Images Preview",
    previewHint: "Card တွေကို drag ဆွဲပြီး manual reorder လုပ်နိုင်ပါတယ်။ PDF ထုတ်တဲ့အခါ ဒီ order အတိုင်းထွက်ပါမယ်။",

    modalTitle: "PDF File Name",
    modalText: "PDF ထုတ်မယ့် file name ကို ပြင်နိုင်ပါတယ်။",
    confirmPdfBtn: "Create PDF",
    creatingPdfBtn: "Creating...",
    cancelPdfBtn: "Cancel",

    initialStatus: "No images selected.",
    noImages: "ပထမဆုံး image upload လုပ်ပါ။",
    noImageFile: "Image file မတွေ့ပါ။",
    cleared: "Cleared all images.",
    sorted: "Images sorted by filename.",
    selectedSorted: "{count} images selected and sorted.",
    selected: "{count} images selected.",
    cancelled: "PDF create cancelled.",

    normalStart: "Normal PDF ပြောင်းနေပါတယ်...",
    continuousStart: "Continuous PDF ပြောင်းနေပါတယ်...",
    normalProcessing: "Normal PDF ပြောင်းနေပါတယ်... {current}/{total}",
    continuousProcessing: "Continuous PDF ပြောင်းနေပါတယ်... {current}/{total}",

    pdfDoneClear: "PDF download ပြီးပါပြီ။ Browser data cleared.",
    pdfError: "PDF ပြောင်းရာမှာ error ဖြစ်သွားပါတယ်။ Image quality ကို Medium/Low ထားပြီး ပြန်စမ်းပါ။"
  },

  en: {
    languageLabel: "Language",
    appTitle: "Image to PDF Converter",
    subtitle: "Upload images, sort them by filename, and convert them to PDF.",
    uploadText: "📁 Click or Drag & Drop Images",
    uploadHint: "You can upload PNG, JPG, JPEG, and WEBP image files.",

    pdfModeLabel: "PDF Mode",
    continuousMode: "Continuous - Join images without gaps",
    normalMode: "Normal - One image per page",

    pageSizeLabel: "PDF Page Size",
    orientationLabel: "Orientation",
    imageQualityLabel: "Image Quality",

    sortBtn: "Sort by File Name",
    convertBtn: "Convert to PDF",
    convertingBtn: "Converting...",
    clearBtn: "Clear All",

    previewTitle: "Images Preview",
    previewHint: "You can drag cards to manually reorder images. The PDF will follow this order.",

    modalTitle: "PDF File Name",
    modalText: "You can edit the file name before creating the PDF.",
    confirmPdfBtn: "Create PDF",
    creatingPdfBtn: "Creating...",
    cancelPdfBtn: "Cancel",

    initialStatus: "No images selected.",
    noImages: "Please upload images first.",
    noImageFile: "No image file found.",
    cleared: "Cleared all images.",
    sorted: "Images sorted by filename.",
    selectedSorted: "{count} images selected and sorted.",
    selected: "{count} images selected.",
    cancelled: "PDF creation cancelled.",

    normalStart: "Creating normal PDF...",
    continuousStart: "Creating continuous PDF...",
    normalProcessing: "Creating normal PDF... {current}/{total}",
    continuousProcessing: "Creating continuous PDF... {current}/{total}",

    pdfDoneClear: "PDF downloaded successfully. Browser data cleared.",
    pdfError: "An error occurred while creating the PDF. Try again with Medium or Low image quality."
  }
};

/* Manual drag reorder */
new Sortable(preview, {
  animation: 150,
  handle: ".drag-handle",
  ghostClass: "sortable-ghost",
  onEnd: updateOrderFromDOM
});

/* Init language */
if (languageSelect) {
  languageSelect.addEventListener("change", function () {
    setLanguage(this.value);
  });
}

setLanguage(currentLang);
updateStatusByKey("initialStatus");

/* Upload input */
imageInput.addEventListener("change", function () {
  addFiles(this.files);
  imageInput.value = "";
});

/* Drag events */
dropZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", function () {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", function (e) {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles(e.dataTransfer.files);
});

/* Sort */
sortBtn.addEventListener("click", function () {
  sortFilesByName();
  renderPreview();
  updateStatusByKey("sorted");
});

/* Clear */
clearBtn.addEventListener("click", function () {
  clearAllImages();
  updateStatusByKey("cleared");
});

/* Remove one image */
preview.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;

    const removedItem = selectedImages.find(item => item.id === id);
    if (removedItem && removedItem.previewUrl) {
      URL.revokeObjectURL(removedItem.previewUrl);
    }

    selectedImages = selectedImages.filter(item => item.id !== id);
    renderPreview();

    if (selectedImages.length === 0) {
      updateStatusByKey("initialStatus");
    } else {
      updateStatusByKey("selected", {
        count: selectedImages.length
      });
    }
  }
});

/* Open filename modal before generating PDF */
convertBtn.addEventListener("click", function () {
  if (selectedImages.length === 0) {
    updateStatusByKey("noImages");
    return;
  }

  updateOrderFromDOM();

  const defaultName = generateDefaultPdfName();
  pdfFileNameInput.value = defaultName;

  openFileNameModal();

  setTimeout(() => {
    pdfFileNameInput.focus();
    pdfFileNameInput.select();
  }, 100);
});

/* Confirm PDF create */
confirmPdfBtn.addEventListener("click", async function () {
  if (selectedImages.length === 0) {
    closeFileNameModal();
    updateStatusByKey("noImages");
    return;
  }

  let fileName = pdfFileNameInput.value.trim();

  if (!fileName) {
    fileName = generateDefaultPdfName();
  }

  fileName = sanitizePdfFileName(fileName);

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    fileName += ".pdf";
  }

  closeFileNameModal();

  const pdfMode = pdfModeSelect.value;

  try {
    setLoadingState(true);

    if (pdfMode === "continuous") {
      await createContinuousPdf(fileName);
    } else {
      await createNormalPdf(fileName);
    }

    setTimeout(() => {
      clearAllImages();
      updateStatusByKey("pdfDoneClear");
    }, 500);

  } catch (error) {
    console.error(error);
    updateStatusByKey("pdfError");
  } finally {
    setLoadingState(false);
  }
});

/* Cancel PDF create */
cancelPdfBtn.addEventListener("click", function () {
  closeFileNameModal();
  updateStatusByKey("cancelled");
});

/* Modal keyboard */
pdfFileNameInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    confirmPdfBtn.click();
  }

  if (e.key === "Escape") {
    closeFileNameModal();
    updateStatusByKey("cancelled");
  }
});

/* Modal outside click */
fileNameModal.addEventListener("click", function (e) {
  if (e.target === fileNameModal) {
    closeFileNameModal();
    updateStatusByKey("cancelled");
  }
});

/* Add files */
function addFiles(files) {
  const imageFiles = Array.from(files).filter(file =>
    file.type.startsWith("image/")
  );

  if (imageFiles.length === 0) {
    updateStatusByKey("noImageFile");
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

  updateStatusByKey("selectedSorted", {
    count: selectedImages.length
  });
}

/* Natural sort */
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

/* Reorder selectedImages from DOM */
function updateOrderFromDOM() {
  const ids = Array.from(preview.children).map(child => child.dataset.id);

  selectedImages = ids
    .map(id => selectedImages.find(item => item.id === id))
    .filter(Boolean);

  updateOrderNumbers();
}

/* Update preview numbering */
function updateOrderNumbers() {
  const numbers = document.querySelectorAll(".order-number");

  numbers.forEach((number, index) => {
    number.textContent = `${index + 1}.`;
  });
}

/* Normal PDF: one image per page */
async function createNormalPdf(fileName = "normal-images.pdf") {
  updateStatusByKey("normalStart");

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

  const MAX_CANVAS_WIDTH = 1400;

  for (let i = 0; i < selectedImages.length; i++) {
    updateStatusByKey("normalProcessing", {
      current: i + 1,
      total: selectedImages.length
    });

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
    const ctx = canvas.getContext("2d", { alpha: false });

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

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

    canvas.width = 0;
    canvas.height = 0;

    await waitFrame();
  }

  pdf.save(fileName);
}

/* Enhanced Continuous PDF:
   - stitch images vertically with no gap
   - chunk pages to avoid giant canvas issues
   - edge trim to reduce join lines */
async function createContinuousPdf(fileName = "continuous-images.pdf") {
  updateStatusByKey("continuousStart");

  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const orientation = orientationSelect.value;
  const quality = Number(imageQualitySelect.value);

  const tempPdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: pageSize,
    compress: true
  });

  const pdfWidthMm = tempPdf.internal.pageSize.getWidth();

  const TARGET_WIDTH_PX = 1400;
  const MAX_PAGE_HEIGHT_PX = 14000;
  const EDGE_TRIM_PX = 2;

  let pdf = null;
  let isFirstPdfPage = true;

  let pageCanvas = document.createElement("canvas");
  let pageCtx = pageCanvas.getContext("2d", { alpha: false });

  pageCanvas.width = TARGET_WIDTH_PX;
  pageCanvas.height = MAX_PAGE_HEIGHT_PX;

  pageCtx.fillStyle = "#ffffff";
  pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

  let usedHeightPx = 0;

  async function flushCurrentPage() {
    if (usedHeightPx <= 0) return;

    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d", { alpha: false });

    exportCanvas.width = TARGET_WIDTH_PX;
    exportCanvas.height = usedHeightPx;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(
      pageCanvas,
      0,
      0,
      TARGET_WIDTH_PX,
      usedHeightPx,
      0,
      0,
      TARGET_WIDTH_PX,
      usedHeightPx
    );

    const pageHeightMm = (usedHeightPx * pdfWidthMm) / TARGET_WIDTH_PX;
    const imageData = exportCanvas.toDataURL("image/jpeg", quality);

    if (isFirstPdfPage) {
      pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pdfWidthMm, pageHeightMm],
        compress: true
      });

      pdf.addImage(
        imageData,
        "JPEG",
        0,
        0,
        pdfWidthMm,
        pageHeightMm,
        undefined,
        "FAST"
      );

      isFirstPdfPage = false;
    } else {
      pdf.addPage([pdfWidthMm, pageHeightMm], orientation);

      pdf.addImage(
        imageData,
        "JPEG",
        0,
        0,
        pdfWidthMm,
        pageHeightMm,
        undefined,
        "FAST"
      );
    }

    pageCtx.fillStyle = "#ffffff";
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    usedHeightPx = 0;

    exportCanvas.width = 0;
    exportCanvas.height = 0;

    await waitFrame();
  }

  for (let i = 0; i < selectedImages.length; i++) {
    updateStatusByKey("continuousProcessing", {
      current: i + 1,
      total: selectedImages.length
    });

    const img = await loadImage(selectedImages[i].file);

    let sourceY = 0;

    if (i > 0) {
      sourceY = EDGE_TRIM_PX;
    }

    while (sourceY < img.height) {
      const availableHeightPx = MAX_PAGE_HEIGHT_PX - usedHeightPx;

      if (availableHeightPx <= 0) {
        await flushCurrentPage();
        continue;
      }

      const sourceHeightThatFits = Math.floor(
        (availableHeightPx * img.width) / TARGET_WIDTH_PX
      );

      const remainingSourceHeight = img.height - sourceY;

      const sourceHeight = Math.min(
        remainingSourceHeight,
        Math.max(1, sourceHeightThatFits)
      );

      const drawHeightPx = Math.ceil(
        (sourceHeight * TARGET_WIDTH_PX) / img.width
      );

      pageCtx.drawImage(
        img,
        0,
        sourceY,
        img.width,
        sourceHeight,
        0,
        usedHeightPx,
        TARGET_WIDTH_PX,
        drawHeightPx
      );

      usedHeightPx += drawHeightPx;
      sourceY += sourceHeight;

      if (usedHeightPx >= MAX_PAGE_HEIGHT_PX) {
        await flushCurrentPage();
      }

      await waitFrame();
    }
  }

  await flushCurrentPage();

  if (pdf) {
    pdf.save(fileName);
  } else {
    throw new Error("PDF could not be created.");
  }

  pageCanvas.width = 0;
  pageCanvas.height = 0;
}

/* Load image */
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

/* Canvas to JPEG */
function canvasToJpegDataUrl(canvas, quality = 0.85) {
  return canvas.toDataURL("image/jpeg", quality);
}

/* Clear all selected images */
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

/* Loading state */
function setLoadingState(isLoading) {
  convertBtn.disabled = isLoading;
  sortBtn.disabled = isLoading;
  clearBtn.disabled = isLoading;
  confirmPdfBtn.disabled = isLoading;
  cancelPdfBtn.disabled = isLoading;

  convertBtn.textContent = isLoading
    ? t("convertingBtn")
    : t("convertBtn");

  confirmPdfBtn.textContent = isLoading
    ? t("creatingPdfBtn")
    : t("confirmPdfBtn");
}

/* Translation helper */
function t(key, values = {}) {
  let text = translations[currentLang]?.[key] || key;

  Object.keys(values).forEach(name => {
    text = text.replace(`{${name}}`, values[name]);
  });

  return text;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("appLanguage", lang);

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    }
  });

  if (languageSelect) {
    languageSelect.value = currentLang;
  }

  updateStatusByKey(lastStatus.key, lastStatus.values, false);
}

function updateStatusByKey(key, values = {}, save = true) {
  if (save) {
    lastStatus = { key, values };
  }

  statusText.textContent = t(key, values);
}

/* Modal helpers */
function openFileNameModal() {
  fileNameModal.classList.remove("hidden");
}

function closeFileNameModal() {
  fileNameModal.classList.add("hidden");
}

/* Default PDF name */
function generateDefaultPdfName() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `images-${year}${month}${day}-${hour}${minute}`;
}

/* Sanitize filename */
function sanitizePdfFileName(fileName) {
  return fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/* Wait next frame */
function waitFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

/* Generate unique id */
function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() + Math.random().toString(16).slice(2);
}

/* Escape filename text */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}