document.addEventListener("DOMContentLoaded", () => {
  // XML input and output
  const xmlInput = document.getElementById("xmlInput");
  const xmlOutput = document.getElementById("xmlOutput");

  // Toolbar controls
  const indentSize = document.getElementById("indentSize");
  const formatBtn = document.getElementById("formatBtn");
  const validateBtn = document.getElementById("validateBtn");
  const minifyBtn = document.getElementById("minifyBtn");

  // Editor actions
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  // Status and error elements
  const xmlStatus = document.getElementById("xmlStatus");
  const statusMessage = document.getElementById("statusMessage");
  const xmlError = document.getElementById("xmlError");
  const errorMessage = document.getElementById("errorMessage");

  // Check that the required HTML elements exist
  if (
    !xmlInput ||
    !xmlOutput ||
    !indentSize ||
    !formatBtn ||
    !validateBtn ||
    !minifyBtn
  ) {
    console.error("XML Formatter: Required HTML elements were not found.");
    return;
  }

  let feedbackTimers = new Map();

  // --------------------------------------------------
  // STATUS AND BUTTON FEEDBACK
  // --------------------------------------------------

  function showStatus(message, type = "info") {
    if (!xmlStatus || !statusMessage) return;

    statusMessage.textContent = message;

    xmlStatus.classList.remove("is-success", "is-error", "is-info");

    xmlStatus.classList.add(`is-${type}`);
  }

  function showError(message) {
    if (!xmlError || !errorMessage) return;

    errorMessage.textContent = message;
    xmlError.hidden = false;
  }

  function hideError() {
    if (!xmlError || !errorMessage) return;

    errorMessage.textContent = "";
    xmlError.hidden = true;
  }

  function showButtonFeedback(button, message, type = "success") {
    if (!button) return;

    const previousTimer = feedbackTimers.get(button);

    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    button.classList.remove("is-success", "is-error");
    button.classList.add(`is-${type}`);

    const originalText = button.dataset.originalText || button.textContent;

    if (!button.dataset.originalText) {
      button.dataset.originalText = originalText;
    }

    button.textContent = message;

    const timer = setTimeout(() => {
      button.classList.remove("is-success", "is-error");
      button.textContent = originalText;
      feedbackTimers.delete(button);
    }, 1800);

    feedbackTimers.set(button, timer);
  }

  // --------------------------------------------------
  // XML PARSING AND VALIDATION
  // --------------------------------------------------

  function parseXML(xml) {
    if (!xml.trim()) {
      throw new Error("Please enter some XML data first.");
    }

    const parser = new DOMParser();

    const documentXML = parser.parseFromString(xml, "application/xml");

    // Check for XML parsing errors
    const parserErrors = documentXML.getElementsByTagNameNS("*", "parsererror");

    const root = documentXML.documentElement;

    if (
      parserErrors.length > 0 ||
      !root ||
      root.namespaceURI ===
        "http://www.mozilla.org/newlayout/xml/parsererror.xml"
    ) {
      const errorText =
        parserErrors.length > 0
          ? parserErrors[0].textContent.trim()
          : "The XML document could not be parsed.";

      throw new Error(errorText || "Invalid XML syntax.");
    }

    return documentXML;
  }

  // --------------------------------------------------
  // XML SERIALIZATION
  // --------------------------------------------------

  const serializer = new XMLSerializer();

  function getIndentation(depth, indentUnit) {
    return indentUnit.repeat(depth);
  }

  function serializeNode(node, depth, indentUnit, pretty) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        return serializeElement(node, depth, indentUnit, pretty);

      case Node.TEXT_NODE:
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE:
      case Node.DOCUMENT_TYPE_NODE:
        return serializer.serializeToString(node);

      default:
        return "";
    }
  }

  function serializeElement(element, depth, indentUnit, pretty) {
    const openingTag = serializer
      .serializeToString(element.cloneNode(false))
      .replace(/\/>$/, ">");

    const closingTag = `</${element.nodeName}>`;

    const children = Array.from(element.childNodes);

    if (children.length === 0) {
      return openingTag.replace(/>$/, "/>");
    }

    const hasMeaningfulText = children.some(
      (child) =>
        child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== "",
    );

    // Mixed content must stay together to preserve its meaning.
    if (hasMeaningfulText) {
      const content = children
        .map((child) => serializeNode(child, depth + 1, indentUnit, false))
        .join("");

      return openingTag + content + closingTag;
    }

    // Element-only content can safely be indented.
    const meaningfulChildren = children.filter((child) => {
      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent.trim() === ""
      ) {
        return false;
      }

      return true;
    });

    if (meaningfulChildren.length === 0) {
      return openingTag.replace(/>$/, "/>");
    }

    if (!pretty) {
      const content = meaningfulChildren
        .map((child) => serializeNode(child, depth + 1, indentUnit, false))
        .join("");

      return openingTag + content + closingTag;
    }

    const content = meaningfulChildren
      .map((child) => {
        const childContent = serializeNode(child, depth + 1, indentUnit, true);

        return getIndentation(depth + 1, indentUnit) + childContent;
      })
      .join("\n");

    return (
      openingTag +
      "\n" +
      content +
      "\n" +
      getIndentation(depth, indentUnit) +
      closingTag
    );
  }

  function serializeDocument(documentXML, pretty = true) {
    const originalXMLDeclaration = xmlInput.value.match(
      /^\uFEFF?\s*(<\?xml\s+[\s\S]*?\?>)/i,
    );

    const declaration = originalXMLDeclaration ? originalXMLDeclaration[1] : "";

    const indentUnit =
      indentSize.value === "tab"
        ? "\t"
        : " ".repeat(Number(indentSize.value) || 2);

    const documentNodes = Array.from(documentXML.childNodes);

    const outputParts = documentNodes
      .map((node) => {
        if (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim() === ""
        ) {
          return "";
        }

        return serializeNode(node, 0, indentUnit, pretty);
      })
      .filter(Boolean);

    let result = outputParts.join(pretty ? "\n" : "");

    if (declaration) {
      result = declaration + (result ? (pretty ? "\n" : "") + result : "");
    }

    return result;
  }

  // --------------------------------------------------
  // FORMAT XML
  // --------------------------------------------------

  function formatXML() {
    hideError();

    try {
      const documentXML = parseXML(xmlInput.value);
      const formattedXML = serializeDocument(documentXML, true);

      xmlOutput.value = formattedXML;

      showStatus("XML formatted successfully.", "success");
      showButtonFeedback(formatBtn, "Formatted", "success");
    } catch (error) {
      xmlOutput.value = "";

      showError(error.message);
      showStatus("Unable to format XML.", "error");
      showButtonFeedback(formatBtn, "Error", "error");
    }
  }

  // --------------------------------------------------
  // VALIDATE XML
  // --------------------------------------------------

  function validateXML() {
    hideError();

    try {
      parseXML(xmlInput.value);

      showStatus("Valid XML. No syntax errors found.", "success");
      showButtonFeedback(validateBtn, "Valid", "success");
    } catch (error) {
      showError(error.message);
      showStatus("Invalid XML. Please check the syntax.", "error");
      showButtonFeedback(validateBtn, "Invalid", "error");
    }
  }

  // --------------------------------------------------
  // MINIFY XML
  // --------------------------------------------------

  function minifyXML() {
    hideError();

    try {
      const documentXML = parseXML(xmlInput.value);
      const minifiedXML = serializeDocument(documentXML, false);

      xmlOutput.value = minifiedXML;

      showStatus("XML minified successfully.", "success");
      showButtonFeedback(minifyBtn, "Minified", "success");
    } catch (error) {
      xmlOutput.value = "";

      showError(error.message);
      showStatus("Unable to minify XML.", "error");
      showButtonFeedback(minifyBtn, "Error", "error");
    }
  }

  // --------------------------------------------------
  // CLEAR EDITORS
  // --------------------------------------------------

  function clearEditors() {
    xmlInput.value = "";
    xmlOutput.value = "";

    hideError();
    showStatus("Editors cleared.", "info");

    xmlInput.focus();

    showButtonFeedback(clearBtn, "Cleared", "success");
  }

  // --------------------------------------------------
  // COPY OUTPUT
  // --------------------------------------------------

  async function copyOutput() {
    const output = xmlOutput.value;

    if (!output.trim()) {
      showStatus("There is no output to copy.", "error");
      showButtonFeedback(copyBtn, "No Output", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);

      showStatus("XML copied to clipboard.", "success");
      showButtonFeedback(copyBtn, "Copied", "success");
    } catch (error) {
      // Fallback for browsers where Clipboard API is unavailable.
      try {
        xmlOutput.focus();
        xmlOutput.select();

        const copied = document.execCommand("copy");

        if (!copied) {
          throw new Error("Copy command was unsuccessful.");
        }

        showStatus("XML copied to clipboard.", "success");
        showButtonFeedback(copyBtn, "Copied", "success");
      } catch (fallbackError) {
        showStatus("Unable to copy XML. Please copy it manually.", "error");
        showButtonFeedback(copyBtn, "Failed", "error");
      }
    }
  }

  // --------------------------------------------------
  // DOWNLOAD OUTPUT
  // --------------------------------------------------

  function downloadXML() {
    const output = xmlOutput.value;

    if (!output.trim()) {
      showStatus("There is no output to download.", "error");
      showButtonFeedback(downloadBtn, "No Output", "error");
      return;
    }

    const blob = new Blob([output], {
      type: "application/xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "formatted.xml";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showStatus("XML file downloaded successfully.", "success");
    showButtonFeedback(downloadBtn, "Downloaded", "success");
  }

  // --------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------

  formatBtn.addEventListener("click", formatXML);
  validateBtn.addEventListener("click", validateXML);
  minifyBtn.addEventListener("click", minifyXML);

  if (clearBtn) {
    clearBtn.addEventListener("click", clearEditors);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", copyOutput);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadXML);
  }

  // Clear old errors when the user edits the input.
  xmlInput.addEventListener("input", () => {
    hideError();
    showStatus("Ready to process XML.", "info");
  });
});
