// =================================
// WORD COUNTER - FILE READER
// =================================

document.addEventListener("DOMContentLoaded", () => {
  const textEditor = document.getElementById("text-editor");
  const editorActions = document.querySelector(".editor-actions");

  if (!textEditor || !editorActions) {
    console.error(
      "File reader could not initialize. Required editor elements were not found.",
    );
    return;
  }

  // Maximum allowed file size: 5 MB.
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // ---------------------------------
  // CREATE FILE INPUTS
  // ---------------------------------

  function createFileInput(accept, label) {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = accept;
    input.hidden = true;
    input.setAttribute("aria-label", label);

    return input;
  }

  const txtInput = createFileInput(".txt,text/plain", "Choose a TXT file");

  const docxInput = createFileInput(".docx", "Choose a DOCX file");

  // ---------------------------------
  // CREATE IMPORT BUTTONS
  // ---------------------------------

  function createImportButton(text, className, label) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `action-placeholder import-action ${className}`;
    button.textContent = text;
    button.setAttribute("aria-label", label);

    return button;
  }

  const txtButton = createImportButton(
    "Import TXT",
    "import-txt-action",
    "Import a TXT file",
  );

  const docxButton = createImportButton(
    "Import DOCX",
    "import-docx-action",
    "Import a DOCX Word document",
  );

  editorActions.append(txtButton, txtInput, docxButton, docxInput);

  // ---------------------------------
  // STATUS MESSAGES
  // ---------------------------------

  function showMessage(message) {
    const status = document.querySelector(".editor-action-status");

    if (status) {
      status.textContent = message;
    }
  }

  // ---------------------------------
  // COMMON FILE VALIDATION
  // ---------------------------------

  function validateFile(file, extension) {
    if (!file.name.toLowerCase().endsWith(extension)) {
      showMessage(`Please select a valid ${extension.toUpperCase()} file.`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      showMessage(`The file is too large. Maximum allowed size is 5 MB.`);
      return false;
    }

    return true;
  }

  // ---------------------------------
  // LOAD EXTRACTED TEXT INTO EDITOR
  // ---------------------------------

  function loadTextIntoEditor(text, fileName) {
    textEditor.value = text;

    // Update word count, statistics and word goal.
    textEditor.dispatchEvent(new Event("input", { bubbles: true }));

    showMessage(`"${fileName}" imported successfully.`);

    textEditor.focus();
  }

  // =================================
  // TXT IMPORT
  // =================================

  txtButton.addEventListener("click", () => {
    txtInput.click();
  });

  txtInput.addEventListener("change", () => {
    const file = txtInput.files[0];

    if (!file) {
      return;
    }

    if (!validateFile(file, ".txt")) {
      txtInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showMessage("Unable to read this file as text.");
        txtInput.value = "";
        return;
      }

      loadTextIntoEditor(reader.result, file.name);

      // Allow the same file to be selected again.
      txtInput.value = "";
    };

    reader.onerror = () => {
      console.error("TXT file reading failed:", reader.error);

      showMessage("Unable to read the TXT file. Please try again.");

      txtInput.value = "";
    };

    reader.readAsText(file, "UTF-8");
  });

  // =================================
  // DOCX IMPORT
  // =================================

  docxButton.addEventListener("click", () => {
    if (typeof window.mammoth === "undefined") {
      showMessage(
        "DOCX reader could not load. Check your internet connection and refresh the page.",
      );
      return;
    }

    docxInput.click();
  });

  docxInput.addEventListener("change", async () => {
    const file = docxInput.files[0];

    if (!file) {
      return;
    }

    if (!validateFile(file, ".docx")) {
      docxInput.value = "";
      return;
    }

    if (typeof window.mammoth === "undefined") {
      showMessage(
        "DOCX reader is unavailable. Please refresh the page and try again.",
      );
      docxInput.value = "";
      return;
    }

    docxButton.disabled = true;
    txtButton.disabled = true;

    showMessage("Reading your DOCX document...");

    try {
      // Read the document locally as an ArrayBuffer.
      const arrayBuffer = await file.arrayBuffer();

      // Extract plain text using Mammoth.js.
      const result = await window.mammoth.extractRawText({
        arrayBuffer: arrayBuffer,
      });

      if (typeof result.value !== "string" || !result.value.trim()) {
        showMessage("No readable text was found in this DOCX document.");
        return;
      }

      loadTextIntoEditor(result.value, file.name);
    } catch (error) {
      console.error("DOCX extraction failed:", error);

      showMessage(
        "Unable to read this DOCX document. Please check the file and try again.",
      );
    } finally {
      docxInput.value = "";
      docxButton.disabled = false;
      txtButton.disabled = false;
    }
  });
});
