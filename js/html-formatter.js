document.addEventListener("DOMContentLoaded", () => {
  // =========================================
  // ELEMENT REFERENCES
  // =========================================

  const htmlInput = document.getElementById("htmlInput");
  const htmlOutput = document.getElementById("htmlOutput");

  const indentSize = document.getElementById("indentSize");

  const formatBtn = document.getElementById("formatBtn");
  const validateBtn = document.getElementById("validateBtn");
  const minifyBtn = document.getElementById("minifyBtn");

  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const htmlStatus = document.getElementById("htmlStatus");
  const statusMessage = document.getElementById("statusMessage");

  const htmlError = document.getElementById("htmlError");
  const errorMessage = document.getElementById("errorMessage");

  if (
    !htmlInput ||
    !htmlOutput ||
    !indentSize ||
    !formatBtn ||
    !validateBtn ||
    !minifyBtn
  ) {
    console.error("HTML Formatter: Required HTML elements were not found.");
    return;
  }

  const feedbackTimers = new Map();

  // =========================================
  // HTML ELEMENT CLASSIFICATIONS
  // =========================================

  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const rawTextElements = new Set(["script", "style"]);

  const preserveWhitespaceElements = new Set(["pre", "textarea"]);

  const blockElements = new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "body",
    "caption",
    "dd",
    "details",
    "dialog",
    "div",
    "dl",
    "dt",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "html",
    "legend",
    "li",
    "main",
    "menu",
    "nav",
    "ol",
    "optgroup",
    "option",
    "p",
    "section",
    "summary",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
  ]);

  // =========================================
  // STATUS AND ERROR HANDLING
  // =========================================

  function showStatus(message, type = "info") {
    if (!htmlStatus || !statusMessage) return;

    statusMessage.textContent = message;

    htmlStatus.classList.remove("is-success", "is-error", "is-info");

    htmlStatus.classList.add(`is-${type}`);
  }

  function showError(message) {
    if (!htmlError || !errorMessage) return;

    errorMessage.textContent = message;
    htmlError.hidden = false;
  }

  function hideError() {
    if (!htmlError || !errorMessage) return;

    errorMessage.textContent = "";
    htmlError.hidden = true;
  }

  function showButtonFeedback(button, message, type = "success") {
    if (!button) return;

    const previousTimer = feedbackTimers.get(button);

    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.classList.remove("is-success", "is-error");
    button.classList.add(`is-${type}`);

    button.textContent = message;

    const timer = setTimeout(() => {
      button.classList.remove("is-success", "is-error");
      button.textContent = button.dataset.originalText;

      feedbackTimers.delete(button);
    }, 1800);

    feedbackTimers.set(button, timer);
  }

  // =========================================
  // HTML PARSING
  // =========================================

  function parseHTML(source) {
    if (!source.trim()) {
      throw new Error("Please enter some HTML code first.");
    }

    const parser = new DOMParser();

    return parser.parseFromString(source, "text/html");
  }

  // =========================================
  // HTML ESCAPING
  // =========================================

  function escapeText(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttribute(value) {
    return escapeText(value).replace(/"/g, "&quot;");
  }

  // =========================================
  // ATTRIBUTE SERIALIZATION
  // =========================================

  function serializeAttributes(element) {
    return Array.from(element.attributes)
      .map((attribute) => {
        const name = attribute.name;
        const value = escapeAttribute(attribute.value);

        return ` ${name}="${value}"`;
      })
      .join("");
  }

  // =========================================
  // NODE SERIALIZATION
  // =========================================

  function getIndentation(depth, indentUnit) {
    return indentUnit.repeat(depth);
  }

  function serializeNode(node, depth, indentUnit, pretty) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        return serializeElement(node, depth, indentUnit, pretty);

      case Node.TEXT_NODE:
        return escapeText(node.textContent);

      case Node.COMMENT_NODE:
        return `<!--${node.data}-->`;

      case Node.DOCUMENT_TYPE_NODE:
        return "<!DOCTYPE html>";

      default:
        return "";
    }
  }

  // =========================================
  // ELEMENT CLASSIFICATION
  // =========================================

  function isBlockNode(node) {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      blockElements.has(node.tagName.toLowerCase())
    );
  }

  function isWhitespaceText(node) {
    return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "";
  }

  // =========================================
  // INLINE CHILDREN SERIALIZATION
  // =========================================

  function serializeInlineChildren(children, depth, indentUnit, pretty) {
    return children
      .map((child, index) => {
        if (!isWhitespaceText(child)) {
          return serializeNode(child, depth + 1, indentUnit, pretty);
        }

        const previous = children[index - 1];
        const next = children[index + 1];

        // Handle whitespace at the beginning or end.
        if (!previous || !next) {
          // Preserve intentional single-line whitespace.
          // Ignore indentation-only newlines.
          return /[\r\n]/.test(child.textContent) ? "" : child.textContent;
        }

        // Preserve meaningful spacing between inline elements.
        if (!isBlockNode(previous) && !isBlockNode(next)) {
          return " ";
        }

        // Ignore formatting whitespace around block elements.
        return "";
      })
      .join("");
  }

  // =========================================
  // BLOCK CHILDREN SERIALIZATION
  // =========================================

  function serializeBlockChildren(
    children,
    depth,
    indentUnit,
    pretty,
    forceSeparate = false,
  ) {
    const segments = [];
    let inlineNodes = [];

    function flushInlineNodes() {
      if (inlineNodes.length === 0) return;

      segments.push({
        type: "inline",
        nodes: inlineNodes,
      });

      inlineNodes = [];
    }

    children.forEach((child, index) => {
      if (isWhitespaceText(child)) {
        // Ignore formatting whitespace between forced block elements.
        if (forceSeparate) {
          return;
        }

        // Find the nearest meaningful nodes.
        let previousIndex = index - 1;
        let nextIndex = index + 1;

        while (
          previousIndex >= 0 &&
          isWhitespaceText(children[previousIndex])
        ) {
          previousIndex--;
        }

        while (
          nextIndex < children.length &&
          isWhitespaceText(children[nextIndex])
        ) {
          nextIndex++;
        }

        const previous = children[previousIndex];
        const next = children[nextIndex];

        // Preserve spacing between inline elements.
        if (previous && next && !isBlockNode(previous) && !isBlockNode(next)) {
          inlineNodes.push(child);
        }

        return;
      }

      // Separate block elements and comments.
      if (
        forceSeparate ||
        isBlockNode(child) ||
        child.nodeType === Node.COMMENT_NODE
      ) {
        flushInlineNodes();

        segments.push({
          type: "block",
          node: child,
        });

        return;
      }

      // Collect inline elements and text together.
      inlineNodes.push(child);
    });

    flushInlineNodes();

    const output = segments.map((segment) => {
      if (segment.type === "inline") {
        return segment.nodes
          .map((node) => serializeNode(node, depth + 1, indentUnit, pretty))
          .join("");
      }

      return serializeNode(segment.node, depth + 1, indentUnit, pretty);
    });

    // Compact output.
    if (!pretty) {
      return output.join("");
    }

    // Pretty output.
    return output
      .map((content) => {
        return getIndentation(depth + 1, indentUnit) + content;
      })
      .join("\n");
  }

  // =========================================
  // ELEMENT SERIALIZATION
  // =========================================

  function serializeElement(element, depth, indentUnit, pretty) {
    const tagName = element.tagName.toLowerCase();

    const openingTag = `<${tagName}${serializeAttributes(element)}>`;

    // Void elements.
    if (voidElements.has(tagName)) {
      return openingTag;
    }

    const closingTag = `</${tagName}>`;

    const children = Array.from(element.childNodes);

    if (children.length === 0) {
      return openingTag + closingTag;
    }

    // Preserve script and style contents.
    if (rawTextElements.has(tagName)) {
      const rawContent = children.map((child) => child.textContent).join("");

      if (!pretty) {
        const content = rawContent
          .replace(/^\s*\r?\n/, "")
          .replace(/\r?\n\s*$/, "");

        return openingTag + content + closingTag;
      }

      const content = rawContent.replace(/\s+$/, "");

      if (!content) {
        return openingTag + closingTag;
      }

      return (
        openingTag +
        content +
        "\n" +
        getIndentation(depth, indentUnit) +
        closingTag
      );
    }

    // Preserve whitespace-sensitive contents.
    if (preserveWhitespaceElements.has(tagName)) {
      const content = children
        .map((child) => serializeNode(child, depth + 1, indentUnit, false))
        .join("");

      return openingTag + content + closingTag;
    }

    // Check for meaningful direct text.
    const hasMeaningfulText = children.some(
      (child) =>
        child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== "",
    );

    // Keep mixed text and inline content together.
    if (hasMeaningfulText) {
      const content = serializeInlineChildren(
        children,
        depth,
        indentUnit,
        pretty,
      );

      return openingTag + content + closingTag;
    }

    // Decide whether child elements need separate lines.
    const shouldFormatAsBlock =
      tagName === "head" ||
      tagName === "form" ||
      children.some(
        (child) => isBlockNode(child) || child.nodeType === Node.COMMENT_NODE,
      );

    // Keep inline content together.
    if (!shouldFormatAsBlock) {
      const content = serializeInlineChildren(
        children,
        depth,
        indentUnit,
        pretty,
      );

      return openingTag + content + closingTag;
    }

    // Serialize block children.
    const content = serializeBlockChildren(
      children,
      depth,
      indentUnit,
      pretty,
      tagName === "head" || tagName === "form",
    );

    // Minified output.
    if (!pretty) {
      return openingTag + content + closingTag;
    }

    // Avoid unnecessary blank lines.
    if (!content) {
      return openingTag + closingTag;
    }

    // Pretty output.
    return (
      openingTag +
      "\n" +
      content +
      "\n" +
      getIndentation(depth, indentUnit) +
      closingTag
    );
  }

  // =========================================
  // DOCUMENT SERIALIZATION
  // =========================================

  function serializeDocument(documentHTML, pretty = true) {
    const indentUnit =
      indentSize.value === "tab"
        ? "\t"
        : " ".repeat(Number(indentSize.value) || 2);

    const outputParts = [];

    // Preserve DOCTYPE when supplied.
    const hasDoctype = /<!doctype\s+html/i.test(htmlInput.value);

    if (hasDoctype) {
      outputParts.push("<!DOCTYPE html>");
    }

    const htmlElement = documentHTML.documentElement;

    if (htmlElement) {
      outputParts.push(serializeElement(htmlElement, 0, indentUnit, pretty));
    }

    return outputParts.join(pretty ? "\n" : "");
  }

  // =========================================
  // FORMAT HTML
  // =========================================

  function formatHTML() {
    hideError();

    try {
      const documentHTML = parseHTML(htmlInput.value);

      const formattedHTML = serializeDocument(documentHTML, true);

      htmlOutput.value = formattedHTML;

      showStatus("HTML formatted successfully.", "success");

      showButtonFeedback(formatBtn, "Formatted", "success");
    } catch (error) {
      htmlOutput.value = "";

      showError(error.message);

      showStatus("Unable to format HTML.", "error");

      showButtonFeedback(formatBtn, "Error", "error");
    }
  }

  // =========================================
  // VALIDATE HTML
  // =========================================

  function validateHTML() {
    hideError();

    try {
      const documentHTML = parseHTML(htmlInput.value);

      const issues = [];

      const htmlElement = documentHTML.documentElement;

      // Check document language.
      if (htmlElement && !htmlElement.hasAttribute("lang")) {
        issues.push("The HTML element is missing a lang attribute.");
      }

      // Check document title.
      if (!documentHTML.title.trim()) {
        issues.push("The document is missing a page title.");
      }

      // Check DOCTYPE.
      if (!/<!doctype\s+html/i.test(htmlInput.value)) {
        issues.push("The HTML document is missing <!DOCTYPE html>.");
      }

      // Check duplicate IDs.
      const ids = new Set();

      documentHTML.querySelectorAll("[id]").forEach((element) => {
        const id = element.getAttribute("id");

        if (ids.has(id)) {
          issues.push(`Duplicate ID found: "${id}".`);
        } else {
          ids.add(id);
        }
      });

      // Check image alt attributes.
      documentHTML.querySelectorAll("img").forEach((image) => {
        if (!image.hasAttribute("alt")) {
          issues.push("An image is missing its alt attribute.");
        }
      });

      // Check empty links.
      documentHTML.querySelectorAll("a[href]").forEach((link) => {
        if (!link.getAttribute("href").trim()) {
          issues.push("A link has an empty href attribute.");
        }
      });

      // Check empty image sources.
      documentHTML.querySelectorAll("img[src]").forEach((image) => {
        if (!image.getAttribute("src").trim()) {
          issues.push("An image has an empty src attribute.");
        }
      });

      // Check empty form labels.
      documentHTML.querySelectorAll("label").forEach((label) => {
        if (
          !label.textContent.trim() &&
          !label.querySelector("input, select, textarea, img")
        ) {
          issues.push("An empty label element was found.");
        }
      });

      // Display validation results.
      if (issues.length === 0) {
        showStatus("HTML checks completed. No common issues found.", "success");

        showButtonFeedback(validateBtn, "Passed", "success");
      } else {
        const issueList = issues
          .map((issue, index) => `${index + 1}. ${issue}`)
          .join("\n");

        showError(`${issues.length} issue(s) found:\n${issueList}`);

        showStatus(`${issues.length} common HTML issue(s) found.`, "error");

        showButtonFeedback(validateBtn, "Issues Found", "error");
      }
    } catch (error) {
      showError(error.message);

      showStatus("Unable to validate HTML.", "error");

      showButtonFeedback(validateBtn, "Error", "error");
    }
  }

  // =========================================
  // MINIFY HTML
  // =========================================

  // =========================================
  // MINIFY HTML, CSS AND JAVASCRIPT
  // =========================================

  async function minifyHTML() {
    hideError();

    try {
      const source = htmlInput.value;

      if (!source.trim()) {
        throw new Error("Please enter some HTML code first.");
      }

      if (!window.HTMLMinifier || !window.HTMLMinifier.minify) {
        throw new Error(
          "The HTML minifier library could not be loaded. Please refresh the page and try again.",
        );
      }

      const minifiedHTML = await window.HTMLMinifier.minify(source, {
        collapseWhitespace: true,
        conservativeCollapse: false,
        removeComments: true,

        minifyCSS: true,
        minifyJS: true,

        removeOptionalTags: false,
        removeAttributeQuotes: false,
        removeRedundantAttributes: false,
        removeEmptyAttributes: false,
        keepClosingSlash: true,

        caseSensitive: false,
      });

      htmlOutput.value = minifiedHTML;

      showStatus("HTML, CSS and JavaScript minified successfully.", "success");

      showButtonFeedback(minifyBtn, "Minified", "success");
    } catch (error) {
      htmlOutput.value = "";

      showError(error.message);

      showStatus("Unable to minify HTML.", "error");

      showButtonFeedback(minifyBtn, "Error", "error");
    }
  }

  // =========================================
  // CLEAR EDITORS
  // =========================================

  function clearEditors() {
    htmlInput.value = "";
    htmlOutput.value = "";

    hideError();

    showStatus("Editors cleared.", "info");

    htmlInput.focus();

    showButtonFeedback(clearBtn, "Cleared", "success");
  }

  // =========================================
  // COPY OUTPUT
  // =========================================

  async function copyOutput() {
    const output = htmlOutput.value;

    if (!output.trim()) {
      showStatus("There is no output to copy.", "error");

      showButtonFeedback(copyBtn, "No Output", "error");

      return;
    }

    try {
      await navigator.clipboard.writeText(output);

      showStatus("HTML copied to clipboard.", "success");

      showButtonFeedback(copyBtn, "Copied", "success");
    } catch (error) {
      try {
        htmlOutput.focus();
        htmlOutput.select();

        const copied = document.execCommand("copy");

        if (!copied) {
          throw new Error("Copy command failed.");
        }

        showStatus("HTML copied to clipboard.", "success");

        showButtonFeedback(copyBtn, "Copied", "success");
      } catch (fallbackError) {
        showStatus("Unable to copy HTML. Please copy it manually.", "error");

        showButtonFeedback(copyBtn, "Failed", "error");
      }
    }
  }

  // =========================================
  // DOWNLOAD OUTPUT
  // =========================================

  function downloadHTML() {
    const output = htmlOutput.value;

    if (!output.trim()) {
      showStatus("There is no output to download.", "error");

      showButtonFeedback(downloadBtn, "No Output", "error");

      return;
    }

    const blob = new Blob([output], {
      type: "text/html;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "formatted.html";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showStatus("HTML file downloaded successfully.", "success");

    showButtonFeedback(downloadBtn, "Downloaded", "success");
  }

  // =========================================
  // EVENT LISTENERS
  // =========================================

  formatBtn.addEventListener("click", formatHTML);

  validateBtn.addEventListener("click", validateHTML);

  minifyBtn.addEventListener("click", minifyHTML);

  if (clearBtn) {
    clearBtn.addEventListener("click", clearEditors);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", copyOutput);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadHTML);
  }

  htmlInput.addEventListener("input", () => {
    hideError();

    showStatus("Ready to process HTML.", "info");
  });
});
