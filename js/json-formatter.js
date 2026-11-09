// JSON FORMATTER - FORMATTING FUNCTIONALITY

const jsonInput = document.getElementById("jsonInput");
const jsonOutput = document.getElementById("jsonOutput");
const formatBtn = document.getElementById("formatBtn");
const indentSize = document.getElementById("indentSize");
const validateBtn = document.getElementById("validateBtn");
const minifyBtn = document.getElementById("minifyBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

const jsonStatus = document.getElementById("jsonStatus");
const statusMessage = document.getElementById("statusMessage");
const jsonError = document.getElementById("jsonError");
const errorMessage = document.getElementById("errorMessage");

// BUTTON FEEDBACK FUNCTIONS

const feedbackTimers = new Map();

function clearButtonFeedback() {
  document.querySelectorAll(".json-btn, .editor-action").forEach((button) => {
    clearTimeout(feedbackTimers.get(button));

    button.classList.remove("is-success", "is-error");
    feedbackTimers.delete(button);
  });
}

function showButtonFeedback(button, state) {
  clearButtonFeedback();

  button.classList.add(`is-${state}`);

  const timer = setTimeout(() => {
    button.classList.remove(`is-${state}`);
    feedbackTimers.delete(button);
  }, 1800);

  feedbackTimers.set(button, timer);
}

// FORMAT JSON

formatBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();

  if (!input) {
    jsonOutput.value = "";
    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent = "Please enter some JSON data to format.";

    showButtonFeedback(formatBtn, "error");
    return;
  }

  try {
    const parsedJSON = JSON.parse(input);

    let indentation;

    if (indentSize.value === "tab") {
      indentation = "\t";
    } else {
      indentation = Number(indentSize.value);
    }

    const formattedJSON = JSON.stringify(parsedJSON, null, indentation);

    jsonOutput.value = formattedJSON;

    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent = "JSON formatted successfully.";

    showButtonFeedback(formatBtn, "success");
  } catch (error) {
    jsonOutput.value = "";

    jsonStatus.hidden = true;
    jsonError.hidden = false;
    errorMessage.textContent = error.message;

    showButtonFeedback(formatBtn, "error");
  }
});

// VALIDATE JSON

validateBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();

  if (!input) {
    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent = "Please enter some JSON data to validate.";

    showButtonFeedback(validateBtn, "error");
    return;
  }

  try {
    JSON.parse(input);

    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent =
      "Valid JSON! Your JSON data has no syntax errors.";

    showButtonFeedback(validateBtn, "success");
  } catch (error) {
    jsonStatus.hidden = true;
    jsonError.hidden = false;
    errorMessage.textContent = error.message;

    showButtonFeedback(validateBtn, "error");
  }
});

// MINIFY JSON

minifyBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();

  if (!input) {
    jsonError.hidden = true;
    jsonOutput.value = "";
    jsonStatus.hidden = false;
    statusMessage.textContent = "Please enter some JSON data to minify.";

    showButtonFeedback(minifyBtn, "error");
    return;
  }

  try {
    const parsedJSON = JSON.parse(input);
    const minifiedJSON = JSON.stringify(parsedJSON);

    jsonOutput.value = minifiedJSON;

    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent = "JSON minified successfully.";

    showButtonFeedback(minifyBtn, "success");
  } catch (error) {
    jsonStatus.hidden = true;
    jsonOutput.value = "";
    jsonError.hidden = false;
    errorMessage.textContent = error.message;

    showButtonFeedback(minifyBtn, "error");
  }
});

// COPY JSON

copyBtn.addEventListener("click", async () => {
  const output = jsonOutput.value;

  if (!output.trim()) {
    jsonStatus.hidden = false;
    jsonError.hidden = true;
    statusMessage.textContent = "There is no JSON data to copy.";

    showButtonFeedback(copyBtn, "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(output);

    jsonError.hidden = true;
    jsonStatus.hidden = false;
    statusMessage.textContent = "JSON copied to clipboard.";

    showButtonFeedback(copyBtn, "success");
  } catch (error) {
    jsonStatus.hidden = true;
    jsonError.hidden = false;
    errorMessage.textContent = "Unable to copy JSON. Please try again.";

    showButtonFeedback(copyBtn, "error");
  }
});

// DOWNLOAD JSON

downloadBtn.addEventListener("click", () => {
  const output = jsonOutput.value;

  if (!output.trim()) {
    jsonStatus.hidden = false;
    jsonError.hidden = true;
    statusMessage.textContent = "There is no JSON data to download.";

    showButtonFeedback(downloadBtn, "error");
    return;
  }

  const blob = new Blob([output], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "formatted-data.json";

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  jsonError.hidden = true;
  jsonStatus.hidden = false;
  statusMessage.textContent = "JSON file downloaded successfully.";

  showButtonFeedback(downloadBtn, "success");
});

// CLEAR JSON EDITORS

clearBtn.addEventListener("click", () => {
  clearButtonFeedback();

  jsonInput.value = "";
  jsonOutput.value = "";

  jsonStatus.hidden = true;
  jsonError.hidden = true;

  jsonInput.focus();
});
