/* =================================
   WORD COUNTER - PPTX READER
================================= */

document.addEventListener("DOMContentLoaded", () => {
  const textEditor = document.getElementById("text-editor");
  const editorActions = document.querySelector(".editor-actions");

  if (!textEditor || !editorActions) {
    console.error(
      "PPTX reader could not initialize. Required editor elements were not found.",
    );
    return;
  }

  if (typeof window.JSZip === "undefined") {
    console.error("JSZip library could not be loaded.");
    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const PRESENTATION_PATH = "ppt/presentation.xml";
  const PRESENTATION_RELS_PATH = "ppt/_rels/presentation.xml.rels";

  const PRESENTATION_NS =
    "http://schemas.openxmlformats.org/presentationml/2006/main";

  const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";

  const RELATIONSHIP_NS =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  // ---------------------------------
  // CREATE FILE INPUT
  // ---------------------------------

  const pptxInput = document.createElement("input");

  pptxInput.type = "file";
  pptxInput.accept =
    ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
  pptxInput.hidden = true;
  pptxInput.setAttribute("aria-label", "Choose a PPTX file");

  // ---------------------------------
  // CREATE IMPORT BUTTON
  // ---------------------------------

  const pptxButton = document.createElement("button");

  pptxButton.type = "button";
  pptxButton.className = "action-placeholder import-action pptx-import-action";
  pptxButton.textContent = "Import PPTX";
  pptxButton.setAttribute("aria-label", "Import a PowerPoint presentation");

  const downloadButton = editorActions.querySelector(".download-action");

  if (downloadButton) {
    editorActions.insertBefore(pptxButton, downloadButton);
    editorActions.appendChild(pptxInput);
  } else {
    editorActions.append(pptxButton, pptxInput);
  }

  // ---------------------------------
  // STATUS MESSAGE
  // ---------------------------------

  function showMessage(message) {
    const status = document.querySelector(".editor-action-status");

    if (status) {
      status.textContent = message;
    }
  }

  // ---------------------------------
  // PARSE XML SAFELY
  // ---------------------------------

  function parseXML(xmlText, fileName) {
    const parser = new DOMParser();
    const xmlDocument = parser.parseFromString(xmlText, "application/xml");

    if (xmlDocument.getElementsByTagName("parsererror").length > 0) {
      throw new Error(`Invalid XML found in ${fileName}.`);
    }

    return xmlDocument;
  }

  // ---------------------------------
  // RESOLVE PPTX FILE PATHS
  // ---------------------------------

  function resolveZipPath(baseDirectory, target) {
    const combinedPath = target.startsWith("/")
      ? target.slice(1)
      : `${baseDirectory}/${target}`;

    const pathParts = [];

    for (const part of combinedPath.split("/")) {
      if (!part || part === ".") {
        continue;
      }

      if (part === "..") {
        pathParts.pop();
      } else {
        pathParts.push(part);
      }
    }

    return pathParts.join("/");
  }

  // ---------------------------------
  // GET SLIDE FILES IN PRESENTATION ORDER
  // ---------------------------------

  async function getSlidePaths(zip) {
    const presentationFile = zip.file(PRESENTATION_PATH);
    const relationshipsFile = zip.file(PRESENTATION_RELS_PATH);

    if (!presentationFile || !relationshipsFile) {
      throw new Error(
        "This file does not contain a valid PowerPoint presentation.",
      );
    }

    const [presentationXML, relationshipsXML] = await Promise.all([
      presentationFile.async("string"),
      relationshipsFile.async("string"),
    ]);

    const presentation = parseXML(presentationXML, PRESENTATION_PATH);

    const relationships = parseXML(relationshipsXML, PRESENTATION_RELS_PATH);

    const relationshipMap = new Map();

    const relationshipElements = relationships.getElementsByTagNameNS(
      "*",
      "Relationship",
    );

    for (const relationship of relationshipElements) {
      const id = relationship.getAttribute("Id");
      const target = relationship.getAttribute("Target");
      const type = relationship.getAttribute("Type") || "";

      // Only use slide relationships.
      if (id && target && type.endsWith("/slide")) {
        const slidePath = resolveZipPath("ppt", target);
        relationshipMap.set(id, slidePath);
      }
    }

    const slideIds = presentation.getElementsByTagNameNS(
      PRESENTATION_NS,
      "sldId",
    );

    const slidePaths = [];

    for (const slideId of slideIds) {
      const relationshipId =
        slideId.getAttributeNS(RELATIONSHIP_NS, "id") ||
        slideId.getAttribute("r:id");

      const slidePath = relationshipMap.get(relationshipId);

      if (slidePath) {
        slidePaths.push(slidePath);
      }
    }

    // Fallback for unusual files with missing slide relationships.
    if (slidePaths.length === 0) {
      return Object.keys(zip.files)
        .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
        .sort((a, b) => {
          const numberA = Number(a.match(/slide(\d+)\.xml/i)[1]);
          const numberB = Number(b.match(/slide(\d+)\.xml/i)[1]);

          return numberA - numberB;
        });
    }

    return slidePaths;
  }

  // ---------------------------------
  // EXTRACT TEXT FROM ONE SLIDE
  // ---------------------------------

  function extractSlideText(xmlText, slidePath) {
    const slideXML = parseXML(xmlText, slidePath);

    const paragraphs = slideXML.getElementsByTagNameNS(DRAWING_NS, "p");

    const paragraphTexts = [];

    for (const paragraph of paragraphs) {
      const textElements = paragraph.getElementsByTagNameNS(DRAWING_NS, "t");

      // Join text runs without inserting unnecessary spaces.
      const paragraphText = Array.from(textElements)
        .map((element) => element.textContent || "")
        .join("")
        .trim();

      if (paragraphText) {
        paragraphTexts.push(paragraphText);
      }
    }

    return paragraphTexts.join("\n");
  }

  // ---------------------------------
  // EXTRACT TEXT FROM PPTX
  // ---------------------------------

  async function extractPPTXText(file) {
    const arrayBuffer = await file.arrayBuffer();

    const zip = await window.JSZip.loadAsync(arrayBuffer);

    const slidePaths = await getSlidePaths(zip);

    if (slidePaths.length === 0) {
      throw new Error("No slides were found in this presentation.");
    }

    const slideTexts = [];

    for (const slidePath of slidePaths) {
      const slideFile = zip.file(slidePath);

      if (!slideFile) {
        throw new Error(`Unable to find ${slidePath}.`);
      }

      const slideXML = await slideFile.async("string");
      const slideText = extractSlideText(slideXML, slidePath);

      if (slideText) {
        slideTexts.push(slideText);
      }
    }

    return slideTexts.join("\n\n").trim();
  }

  // ---------------------------------
  // OPEN FILE PICKER
  // ---------------------------------

  pptxButton.addEventListener("click", () => {
    pptxInput.click();
  });

  // ---------------------------------
  // HANDLE PPTX IMPORT
  // ---------------------------------

  pptxInput.addEventListener("change", async () => {
    const file = pptxInput.files[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      showMessage("Please select a valid PPTX file.");
      pptxInput.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showMessage("The PPTX file is too large. Maximum allowed size is 5 MB.");
      pptxInput.value = "";
      return;
    }

    if (file.size === 0) {
      showMessage("The selected PPTX file is empty.");
      pptxInput.value = "";
      return;
    }

    pptxButton.disabled = true;
    showMessage("Extracting text from your PowerPoint presentation...");

    try {
      const extractedText = await extractPPTXText(file);

      if (!extractedText) {
        showMessage(
          "No readable text was found in this PowerPoint presentation.",
        );
        return;
      }

      // Load extracted text into the existing editor.
      textEditor.value = extractedText;

      // Update statistics and word-goal progress.
      textEditor.dispatchEvent(new Event("input", { bubbles: true }));

      showMessage(`"${file.name}" imported successfully.`);
      textEditor.focus();
    } catch (error) {
      console.error("PPTX extraction failed:", error);

      showMessage(
        "Unable to read this PowerPoint file. It may be damaged, password-protected or unsupported.",
      );
    } finally {
      pptxInput.value = "";
      pptxButton.disabled = false;
    }
  });
});
