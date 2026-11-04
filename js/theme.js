// =================================
// WORD COUNTER - SHARED THEME
// =================================

(() => {
  const root = document.documentElement;
  const storageKey = "word-counter-theme";

  // Apply the saved theme before the page is displayed.
  let savedTheme = "light";

  try {
    const storedTheme = localStorage.getItem(storageKey);

    if (storedTheme === "light" || storedTheme === "dark") {
      savedTheme = storedTheme;
    }
  } catch (error) {
    // Continue with the light theme if storage is unavailable.
  }

  root.dataset.theme = savedTheme;

  function updateThemeColor(theme) {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        "content",
        theme === "dark" ? "#0f172a" : "#f8fafc",
      );
    }
  }

  function updateToggleButton(button, theme) {
    const isDark = theme === "dark";

    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme",
    );
    button.setAttribute(
      "title",
      isDark ? "Switch to light theme" : "Switch to dark theme",
    );
  }

  updateThemeColor(savedTheme);

  document.addEventListener("DOMContentLoaded", () => {
    const themeButton = document.getElementById("theme-toggle");

    if (!themeButton) {
      return;
    }

    updateToggleButton(themeButton, root.dataset.theme);

    themeButton.addEventListener("click", () => {
      const newTheme = root.dataset.theme === "dark" ? "light" : "dark";

      root.dataset.theme = newTheme;

      updateToggleButton(themeButton, newTheme);
      updateThemeColor(newTheme);

      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (error) {
        // The theme still works for this page if storage is unavailable.
      }
    });
  });
})();
