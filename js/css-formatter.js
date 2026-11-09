"use strict";

// =========================================
// DOM ELEMENTS
// =========================================

const cssInput = document.getElementById("cssInput");
const cssOutput = document.getElementById("cssOutput");

const indentSize = document.getElementById("indentSize");

const formatBtn = document.getElementById("formatBtn");
const validateBtn = document.getElementById("validateBtn");
const minifyBtn = document.getElementById("minifyBtn");

const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const cssStatus = document.getElementById("cssStatus");
const statusMessage = document.getElementById("statusMessage");

const cssError = document.getElementById("cssError");
const errorMessage = document.getElementById("errorMessage");

// =========================================
// STATUS AND ERROR HANDLING
// =========================================

function showStatus(message, type = "info") {
  cssStatus.className = "css-status";

  if (type) {
    cssStatus.classList.add(`is-${type}`);
  }

  statusMessage.textContent = message;
}

function showError(message) {
  errorMessage.textContent = message;
  cssError.hidden = false;

  showStatus("CSS processing failed.", "error");
}

function hideError() {
  cssError.hidden = true;
  errorMessage.textContent = "";
}
// =========================================
// BUTTON FEEDBACK
// =========================================

const feedbackTimers = new Map();

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
function getIndentation(depth, indentUnit) {
  return indentUnit.repeat(Math.max(0, depth));
}

function getIndentUnit() {
  const selected = indentSize.value;

  if (selected === "tab") {
    return "\t";
  }

  return " ".repeat(Number(selected) || 2);
}

// =========================================
// CSS VALIDATION
// =========================================

function validateCSS(css) {
  const stack = [];

  let quote = null;
  let inComment = false;
  let commentOnOwnLine = false;
  let escaped = false;

  const opening = {
    "{": "}",
    "(": ")",
    "[": "]",
  };

  const closing = {
    "}": "{",
    ")": "(",
    "]": "[",
  };

  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const next = css[i + 1];

    // Handle comments
    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        i++;
      }

      continue;
    }

    // Handle quoted strings
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    // Start comments
    if (char === "/" && next === "*") {
      inComment = true;
      i++;
      continue;
    }

    // Start strings
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    // Check opening brackets
    if (opening[char]) {
      stack.push({
        character: char,
        position: i,
      });

      continue;
    }

    // Check closing brackets
    if (closing[char]) {
      if (
        stack.length === 0 ||
        stack[stack.length - 1].character !== closing[char]
      ) {
        return {
          valid: false,
          message: `Unexpected "${char}" at position ${i + 1}.`,
        };
      }

      stack.pop();
    }
  }

  if (inComment) {
    return {
      valid: false,
      message: "Unterminated CSS comment. Check for a missing */.",
    };
  }

  if (quote) {
    return {
      valid: false,
      message: `Unterminated ${quote === '"' ? "double" : "single"}-quoted string.`,
    };
  }

  if (stack.length > 0) {
    const last = stack[stack.length - 1];

    return {
      valid: false,
      message: `Missing closing "${opening[last.character]}" for "${last.character}" at position ${last.position + 1}.`,
    };
  }

  return {
    valid: true,
    message: "CSS syntax structure looks valid.",
  };
}

// =========================================
// CSS FORMATTER
// =========================================

function formatCSS(css, indentUnit) {
  let result = "";
  let depth = 0;

  let quote = null;
  let inComment = false;
  let commentOnOwnLine = false;
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;

  let segment = "";

  function trimLine() {
    result = result.replace(/[ \t]+$/, "");
  }

  function addIndent() {
    if (result.length === 0 || result.endsWith("\n")) {
      result += getIndentation(depth, indentUnit);
    }
  }

  function newLine() {
    trimLine();

    if (result.length > 0 && !result.endsWith("\n")) {
      result += "\n";
    }
  }

  function isDeclarationSegment() {
    const text = segment.trim();

    return (
      /^--[a-zA-Z0-9_-]+$/.test(text) || /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(text)
    );
  }

  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const next = css[i + 1];

    // Preserve comments
    if (inComment) {
      result += char;

      if (char === "*" && next === "/") {
        result += "/";
        i++;
        inComment = false;

        // Add spacing after standalone top-level comments
        if (commentOnOwnLine) {
          result += "\n\n";
        }

        commentOnOwnLine = false;
      }

      continue;
    }

    // Preserve strings
    if (quote) {
      result += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    // Start comments
    if (char === "/" && next === "*") {
      commentOnOwnLine =
        depth === 0 && (result.length === 0 || result.endsWith("\n"));

      if (result.length > 0 && !/[\s\n]$/.test(result)) {
        result += " ";
      }

      result += "/*";
      i++;
      inComment = true;
      continue;
    }

    // Start strings
    if (char === '"' || char === "'") {
      addIndent();
      result += char;
      quote = char;
      segment += char;
      continue;
    }

    // Track parentheses and brackets
    if (char === "(") parentheses++;
    if (char === ")") parentheses--;

    if (char === "[") brackets++;
    if (char === "]") brackets--;

    // Preserve whitespace inside functions and brackets
    if (/\s/.test(char)) {
      if (
        (parentheses > 0 || brackets > 0) &&
        result.length > 0 &&
        !/\s$/.test(result)
      ) {
        result += char === "\n" ? "\n" : " ";
      } else if (
        parentheses === 0 &&
        brackets === 0 &&
        result.length > 0 &&
        !/[\s\n]$/.test(result)
      ) {
        result += " ";
      }

      continue;
    }

    // Opening brace
    if (char === "{" && parentheses === 0) {
      trimLine();

      if (result.length > 0 && !result.endsWith("\n")) {
        result += " ";
      }

      result += "{\n";

      depth++;
      segment = "";
      continue;
    }

    // Closing brace
    if (char === "}" && parentheses === 0) {
      newLine();

      depth = Math.max(0, depth - 1);

      addIndent();
      result += "}\n";

      segment = "";
      continue;
    }

    // Semicolon
    if (char === ";" && parentheses === 0) {
      trimLine();
      result += ";\n";

      segment = "";
      continue;
    }

    // Colon
    if (char === ":" && parentheses === 0) {
      trimLine();
      result += ":";

      if (depth > 0 && isDeclarationSegment() && next !== ":") {
        result += " ";
      }

      segment += char;
      continue;
    }

    // Regular characters
    addIndent();
    result += char;

    if (char !== "\n") {
      segment += char;
    }
  }

  // Remove trailing whitespace
  result = result.replace(/[ \t]+\n/g, "\n");
  result = result.trim();

  return result ? result + "\n" : "";
}

// =========================================
// CSS MINIFIER
// =========================================

function minifyCSS(css) {
  let result = "";

  let quote = null;
  let inComment = false;
  let escaped = false;

  let pendingSpace = false;

  function needsSpace(previous, current) {
    return (
      /[a-zA-Z0-9_%#.-]/.test(previous) && /[a-zA-Z0-9_%#.-]/.test(current)
    );
  }

  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const next = css[i + 1];

    // Preserve strings
    if (quote) {
      result += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    // Preserve comments
    if (inComment) {
      result += char;

      if (char === "*" && next === "/") {
        result += "/";
        i++;
        inComment = false;

        // Add a line break after a comment
        newLine();
        segment = "";
      }

      continue;
    }

    // Remove ordinary comments
    if (char === "/" && next === "*") {
      const commentEnd = css.indexOf("*/", i + 2);

      if (commentEnd === -1) {
        result += css.slice(i);
        break;
      }

      const comment = css.slice(i, commentEnd + 2);

      if (/^\/\*[\s!]/.test(comment)) {
        if (pendingSpace && result && needsSpace(result.at(-1), "/")) {
          result += " ";
        }

        result += comment;
      }

      i = commentEnd + 1;
      pendingSpace = true;
      continue;
    }

    // Start strings
    if (char === '"' || char === "'") {
      if (
        pendingSpace &&
        result.length > 0 &&
        needsSpace(result.at(-1), char)
      ) {
        result += " ";
      }

      pendingSpace = false;
      quote = char;
      result += char;
      continue;
    }

    // Collect whitespace
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    // Remove unnecessary spaces around punctuation
    if (/[{}:;,>+~]/.test(char)) {
      result = result.replace(/\s+$/, "");
      result += char;
      pendingSpace = false;
      continue;
    }

    // Preserve required spaces between tokens
    if (pendingSpace && result.length > 0 && needsSpace(result.at(-1), char)) {
      result += " ";
    }

    pendingSpace = false;
    result += char;
  }

  return result.trim();
}

// =========================================
// FORMAT BUTTON
// =========================================

formatBtn.addEventListener("click", () => {
  hideError();

  const css = cssInput.value;

  if (!css.trim()) {
    showError("Please enter CSS code before formatting.");
    return;
  }

  const validation = validateCSS(css);

  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  try {
    const formatted = formatCSS(css, getIndentUnit());

    cssOutput.value = formatted;

    showStatus("CSS formatted successfully.", "success");
  } catch (error) {
    showError("Unable to format CSS. Please check your input.");
  }
});

// =========================================
// MINIFY BUTTON
// =========================================

minifyBtn.addEventListener("click", () => {
  hideError();

  const css = cssInput.value;

  if (!css.trim()) {
    showError("Please enter CSS code before minifying.");
    return;
  }

  const validation = validateCSS(css);

  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  try {
    const minified = minifyCSS(css);

    cssOutput.value = minified;

    showStatus("CSS minified successfully.", "success");
    showButtonFeedback(minifyBtn, "Minified!", "success");
  } catch (error) {
    showError("Unable to minify CSS. Please check your input.");
  }
});

// =========================================
// VALIDATE BUTTON
// =========================================

validateBtn.addEventListener("click", () => {
  hideError();

  const css = cssInput.value;

  if (!css.trim()) {
    showError("Please enter CSS code before validating.");
    return;
  }

  const validation = validateCSS(css);

  if (validation.valid) {
    showStatus(validation.message, "success");
    showButtonFeedback(validateBtn, "Valid!", "success");
  } else {
    showError(validation.message);
  }
});

// =========================================
// CLEAR BUTTON
// =========================================

clearBtn.addEventListener("click", () => {
  cssInput.value = "";
  cssOutput.value = "";

  hideError();

  showStatus("CSS editor cleared.", "info");
  showButtonFeedback(clearBtn, "Cleared!", "success");

  cssInput.focus();
});

// =========================================
// COPY BUTTON
// =========================================

copyBtn.addEventListener("click", async () => {
  hideError();

  const output = cssOutput.value;

  if (!output.trim()) {
    showError("There is no formatted CSS to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(output);

    showStatus("CSS copied to clipboard successfully.", "success");
    showButtonFeedback(copyBtn, "Copied!", "success");
  } catch (error) {
    showError(
      "Unable to copy CSS. Please check your browser clipboard permissions.",
    );
  }
});

// =========================================
// DOWNLOAD BUTTON
// =========================================

downloadBtn.addEventListener("click", () => {
  hideError();

  const output = cssOutput.value;

  if (!output.trim()) {
    showError("There is no CSS available to download.");
    return;
  }

  try {
    const blob = new Blob([output], {
      type: "text/css;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "formatted.css";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showStatus("CSS file downloaded successfully.", "success");
    showButtonFeedback(downloadBtn, "Downloaded!", "success");
  } catch (error) {
    showError("Unable to download the CSS file.");
  }
});
