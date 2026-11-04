/* =================================
   WORD COUNTER - PDF READER
================================= */

import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs";

function initializePDFReader() {
  const textEditor = document.getElementById("text-editor");
  const editorActions = document.querySelector(".editor-actions");

  if (!textEditor || !editorActions) {
    console.error("PDF reader initialization failed.");
    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const pdfInput = document.createElement("input");
  pdfInput.type = "file";
  pdfInput.accept = ".pdf,application/pdf";
  pdfInput.hidden = true;
  pdfInput.setAttribute("aria-label", "Choose a PDF file");

  const pdfButton = document.createElement("button");
  pdfButton.type = "button";
  pdfButton.className = "action-placeholder import-action pdf-import-action";
  pdfButton.textContent = "Import PDF";
  pdfButton.setAttribute("aria-label", "Import a PDF document");

  editorActions.append(pdfButton, pdfInput);

  function showMessage(message) {
    const status = document.querySelector(".editor-action-status");

    if (status) {
      status.textContent = message;
    }
  }

  // ---------------------------------
  // EXTRACT TEXT FROM PDF
  // ---------------------------------

  async function extractPDFText(file) {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    try {
      const pdfDocument = await loadingTask.promise;
      const pageTexts = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .filter((item) => typeof item.str === "string")
          .map((item) => item.str + (item.hasEOL ? "\n" : " "))
          .join("")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        pageTexts.push(pageText);

        page.cleanup();
      }

      return pageTexts.join("\n\n").trim();
    } finally {
      // Destroy the loading task, not the PDF document.
      await loadingTask.destroy();
    }
  }

  // ---------------------------------
  // OPEN FILE PICKER
  // ---------------------------------

  pdfButton.addEventListener("click", () => {
    pdfInput.click();
  });

  // ---------------------------------
  // HANDLE PDF IMPORT
  // ---------------------------------

  pdfInput.addEventListener("change", async () => {
    const file = pdfInput.files[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showMessage("Please select a valid PDF file.");
      pdfInput.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showMessage("The PDF file is too large. Maximum allowed size is 5 MB.");
      pdfInput.value = "";
      return;
    }

    if (file.size === 0) {
      showMessage("The selected PDF file is empty.");
      pdfInput.value = "";
      return;
    }

    pdfButton.disabled = true;
    showMessage("Extracting text from your PDF...");

    try {
      const extractedText = await extractPDFText(file);

      if (!extractedText) {
        showMessage(
          "No selectable text was found. This PDF may contain scanned pages or images.",
        );
        return;
      }

      textEditor.value = extractedText;

      textEditor.dispatchEvent(new Event("input", { bubbles: true }));

      showMessage(`"${file.name}" imported successfully.`);
      textEditor.focus();
    } catch (error) {
      console.error("PDF extraction failed:", error);

      showMessage(
        "Unable to read this PDF. It may be damaged, password-protected or unsupported.",
      );
    } finally {
      pdfInput.value = "";
      pdfButton.disabled = false;
    }
  });
}

// ---------------------------------
// INITIALIZE AFTER DOM IS READY
// ---------------------------------

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePDFReader);
} else {
  initializePDFReader();
}
