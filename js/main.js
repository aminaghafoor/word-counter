// =================================
// WORD COUNTER - MAIN JAVASCRIPT
// =================================

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------
  // 1. SELECT PAGE ELEMENTS
  // ---------------------------------

  const textEditor = document.getElementById("text-editor");
  const statisticsGrid = document.querySelector(".statistics-grid");

  const additionalStats = document.querySelectorAll(
    ".additional-stats .additional-stat strong",
  );

  const editorCharacterCountElement = document.querySelector(
    ".editor-meta > span > span",
  );

  const statisticElements = statisticsGrid
    ? statisticsGrid.querySelectorAll(".stat-card .stat-value")
    : [];

  const goalPlaceholder = document.querySelector(".goal-placeholder");

  if (
    !textEditor ||
    !window.WordCounter ||
    statisticElements.length < 6 ||
    additionalStats.length < 3 ||
    !editorCharacterCountElement ||
    !goalPlaceholder
  ) {
    console.error(
      "Word Counter could not initialize. Check the HTML elements and script loading order.",
    );
    return;
  }

  // ---------------------------------
  // 2. FORMAT TIME ESTIMATES
  // ---------------------------------

  function formatTime(seconds) {
    if (!seconds || seconds <= 0) {
      return "0 min";
    }

    const totalSeconds = Math.ceil(seconds);

    if (totalSeconds < 60) {
      return `${totalSeconds} sec`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return remainingSeconds === 0
      ? `${minutes} min`
      : `${minutes} min ${remainingSeconds} sec`;
  }

  // ---------------------------------
  // 3. UPDATE TEXT STATISTICS
  // ---------------------------------

  function updateStatistics() {
    const text = textEditor.value;
    const statistics = window.WordCounter.analyzeText(text);

    statisticElements[0].textContent = statistics.words.toLocaleString();

    statisticElements[1].textContent = statistics.characters.toLocaleString();

    statisticElements[2].textContent =
      statistics.charactersWithoutSpaces.toLocaleString();

    statisticElements[3].textContent = statistics.sentences.toLocaleString();

    statisticElements[4].textContent = statistics.paragraphs.toLocaleString();

    statisticElements[5].textContent = statistics.lines.toLocaleString();

    additionalStats[0].textContent = `${statistics.averageWordLength.toFixed(1)} characters`;

    additionalStats[1].textContent = formatTime(statistics.readingTime);

    additionalStats[2].textContent = formatTime(statistics.speakingTime);

    editorCharacterCountElement.textContent = `${statistics.characters.toLocaleString()} characters`;

    updateGoalProgress(statistics.words);
    updateActionAvailability();
  }

  // ---------------------------------
  // 4. CONVERT EDITOR CONTROLS
  // ---------------------------------

  function convertToButton(element, ariaLabel) {
    if (!element) {
      return null;
    }

    const button = document.createElement("button");

    button.type = "button";
    button.className = element.className;
    button.innerHTML = element.innerHTML;
    button.setAttribute("aria-label", ariaLabel);

    element.replaceWith(button);

    return button;
  }

  const originalActions = document.querySelectorAll(
    ".editor-actions .action-placeholder",
  );

  const clearButton = convertToButton(originalActions[0], "Clear editor text");

  const copyButton = convertToButton(originalActions[1], "Copy editor text");

  // Create a download button.
  const downloadButton = document.createElement("button");

  downloadButton.type = "button";
  downloadButton.className = "action-placeholder download-action";

  downloadButton.textContent = "Download TXT";
  downloadButton.setAttribute("aria-label", "Download text as a TXT file");

  const editorActions = document.querySelector(".editor-actions");

  editorActions.appendChild(downloadButton);

  // Create an accessible status message.
  const actionStatus = document.createElement("p");

  actionStatus.className = "editor-action-status";
  actionStatus.setAttribute("role", "status");
  actionStatus.setAttribute("aria-live", "polite");

  editorActions.parentElement.after(actionStatus);

  // ---------------------------------
  // 5. ACTION AVAILABILITY
  // ---------------------------------

  function updateActionAvailability() {
    const hasText = textEditor.value.length > 0;

    clearButton.disabled = !hasText;
    copyButton.disabled = !hasText;
    downloadButton.disabled = !hasText;
  }

  // ---------------------------------
  // 6. CLEAR TEXT
  // ---------------------------------

  clearButton.addEventListener("click", () => {
    if (!textEditor.value) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear all your text?",
    );

    if (!confirmed) {
      return;
    }

    textEditor.value = "";

    // Recalculate all statistics after clearing.
    textEditor.dispatchEvent(new Event("input", { bubbles: true }));

    actionStatus.textContent = "Text cleared successfully.";

    textEditor.focus();
  });

  // ---------------------------------
  // 7. COPY TEXT
  // ---------------------------------

  // ---------------------------------
  // 7. COPY TEXT
  // ---------------------------------

  let copyFeedbackTimer;

  async function copyText() {
    const text = textEditor.value;

    if (!text) {
      return;
    }

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers without Clipboard API support.
        const temporaryTextarea = document.createElement("textarea");

        temporaryTextarea.value = text;
        temporaryTextarea.setAttribute("readonly", "");
        temporaryTextarea.className = "clipboard-fallback";

        document.body.appendChild(temporaryTextarea);

        temporaryTextarea.select();

        const copied = document.execCommand("copy");

        temporaryTextarea.remove();

        if (!copied) {
          throw new Error("Clipboard copy was unsuccessful.");
        }
      }

      // Clear any previous feedback timer.
      window.clearTimeout(copyFeedbackTimer);

      // Change the button appearance.
      copyButton.innerHTML = "✓ Copied!";
      copyButton.classList.add("copy-success");
      copyButton.setAttribute("aria-label", "Text copied successfully");

      // No need for a separate success message below the editor.
      actionStatus.textContent = "";

      // Restore the original button after two seconds.
      copyFeedbackTimer = window.setTimeout(() => {
        copyButton.innerHTML = originalCopyButtonContent;
        copyButton.classList.remove("copy-success");
        copyButton.setAttribute("aria-label", "Copy editor text");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);

      actionStatus.textContent =
        "Unable to copy text. Please check browser permissions.";
    }
  }

  // Save the original button content before it changes.
  const originalCopyButtonContent = copyButton.innerHTML;

  copyButton.addEventListener("click", copyText);

  // ---------------------------------
  // 8. DOWNLOAD TEXT AS TXT
  // ---------------------------------

  function downloadText() {
    const text = textEditor.value;

    if (!text) {
      return;
    }

    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });

      const downloadURL = URL.createObjectURL(blob);

      const temporaryLink = document.createElement("a");

      temporaryLink.href = downloadURL;
      temporaryLink.download = "word-counter-text.txt";

      document.body.appendChild(temporaryLink);
      temporaryLink.click();
      temporaryLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadURL);
      }, 1000);

      actionStatus.textContent = "Your TXT file download has started.";
    } catch (error) {
      console.error("Download failed:", error);

      actionStatus.textContent =
        "Unable to download the text. Please try again.";
    }
  }

  downloadButton.addEventListener("click", downloadText);

  // ---------------------------------
  // 9. CREATE WORD GOAL INTERFACE
  // ---------------------------------

  let wordGoal = null;

  const goalForm = document.createElement("form");
  goalForm.className = "goal-form";

  const goalInputGroup = document.createElement("div");
  goalInputGroup.className = "goal-input-group";

  const goalLabel = document.createElement("label");
  goalLabel.htmlFor = "word-goal-input";
  goalLabel.textContent = "Your word target";

  const goalInput = document.createElement("input");
  goalInput.type = "number";
  goalInput.id = "word-goal-input";
  goalInput.min = "1";
  goalInput.step = "1";
  goalInput.placeholder = "e.g. 1000";
  goalInput.required = true;

  const goalButton = document.createElement("button");
  goalButton.type = "submit";
  goalButton.className = "goal-set-button";
  goalButton.textContent = "Set Goal";

  const goalProgressContainer = document.createElement("div");
  goalProgressContainer.className = "goal-progress-container";
  goalProgressContainer.hidden = true;

  const goalProgressHeader = document.createElement("div");
  goalProgressHeader.className = "goal-progress-header";

  const goalProgressText = document.createElement("span");
  const goalPercentage = document.createElement("strong");

  goalProgressHeader.append(goalProgressText, goalPercentage);

  const progressTrack = document.createElement("div");
  progressTrack.className = "goal-progress-track";
  progressTrack.setAttribute("role", "progressbar");
  progressTrack.setAttribute("aria-label", "Word goal progress");
  progressTrack.setAttribute("aria-valuemin", "0");

  const progressBar = document.createElement("div");
  progressBar.className = "goal-progress-bar";

  progressTrack.appendChild(progressBar);

  const goalStatus = document.createElement("p");
  goalStatus.className = "goal-status";
  goalStatus.setAttribute("aria-live", "polite");

  const removeGoalButton = document.createElement("button");
  removeGoalButton.type = "button";
  removeGoalButton.className = "goal-remove-button";
  removeGoalButton.textContent = "Remove goal";

  goalInputGroup.append(goalLabel, goalInput, goalButton);

  goalForm.append(goalInputGroup, goalProgressContainer);

  goalProgressContainer.append(
    goalProgressHeader,
    progressTrack,
    goalStatus,
    removeGoalButton,
  );

  // Replace the original placeholder.
  goalPlaceholder.replaceWith(goalForm);

  // ---------------------------------
  // 10. UPDATE WORD GOAL PROGRESS
  // ---------------------------------

  function updateGoalProgress(currentWords) {
    if (wordGoal === null) {
      return;
    }

    const percentage = Math.min((currentWords / wordGoal) * 100, 100);
    const displayedPercentage = Math.round(percentage);
    const cappedPercentage = Math.min(percentage, 100);

    const remainingWords = Math.max(wordGoal - currentWords, 0);

    goalProgressText.textContent = `${currentWords.toLocaleString()} / ${wordGoal.toLocaleString()} words`;

    goalPercentage.textContent = `${displayedPercentage}%`;

    progressBar.style.width = `${cappedPercentage}%`;

    progressTrack.setAttribute(
      "aria-valuenow",
      String(Math.min(displayedPercentage, 100)),
    );

    progressTrack.setAttribute("aria-valuemax", "100");

    if (currentWords >= wordGoal) {
      goalStatus.textContent =
        "Congratulations! You have reached your word goal.";
      goalStatus.classList.add("goal-completed");
    } else {
      goalStatus.textContent = `${remainingWords.toLocaleString()} words remaining.`;

      goalStatus.classList.remove("goal-completed");
    }
  }

  // ---------------------------------
  // 11. SET AND REMOVE WORD GOAL
  // ---------------------------------

  goalForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const target = Number(goalInput.value);

    if (!Number.isSafeInteger(target) || target < 1) {
      goalInput.setCustomValidity(
        "Please enter a positive whole-number word target.",
      );

      goalInput.reportValidity();
      return;
    }

    goalInput.setCustomValidity("");

    wordGoal = target;

    goalProgressContainer.hidden = false;

    updateGoalProgress(window.WordCounter.analyzeText(textEditor.value).words);
  });

  goalInput.addEventListener("input", () => {
    goalInput.setCustomValidity("");
  });

  removeGoalButton.addEventListener("click", () => {
    wordGoal = null;
    goalInput.value = "";

    goalProgressContainer.hidden = true;
    goalProgressText.textContent = "";
    goalPercentage.textContent = "";

    progressBar.style.width = "0%";
    goalStatus.textContent = "";

    goalStatus.classList.remove("goal-completed");

    goalInput.focus();
  });

  // ---------------------------------
  // 12. LISTEN FOR TEXT CHANGES
  // ---------------------------------

  textEditor.addEventListener("input", updateStatistics);

  // ---------------------------------
  // 13. INITIALIZE APPLICATION
  // ---------------------------------

  updateStatistics();
});
