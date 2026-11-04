// WORD COUNTER - COUNTING ENGINE

// Use native Unicode grapheme segmentation when available.
const nativeSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

// Use Grapheme Splitter as a fallback.
const graphemeSplitter =
  typeof window.GraphemeSplitter === "function"
    ? new window.GraphemeSplitter()
    : null;

// Match words, including numbers and apostrophes.
function getWords(text) {
  const wordPattern =
    /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}\p{N}]+)*/gu;

  return text.match(wordPattern) || [];
}

// Count words.
function countWords(text) {
  return getWords(text).length;
}

// Count visible characters.
function countCharacters(text) {
  if (nativeSegmenter) {
    return Array.from(nativeSegmenter.segment(text)).length;
  }

  if (graphemeSplitter) {
    return graphemeSplitter.countGraphemes(text);
  }

  return Array.from(text).length;
}

// Count characters excluding whitespace.
function countCharactersWithoutSpaces(text) {
  return countCharacters(text.replace(/\s/gu, ""));
}

// Count sentences using sentence-ending punctuation.

// Count sentences while avoiding false sentence breaks
// inside email addresses and URLs.
function countSentences(text) {
  if (!text.trim()) {
    return 0;
  }

  const protectPeriods = (value) => value.replace(/\./gu, "\uE000");

  let protectedText = text;

  // Protect periods inside email addresses.
  protectedText = protectedText.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    protectPeriods,
  );

  // Protect periods inside URLs while preserving
  // punctuation that follows the URL.
  protectedText = protectedText.replace(
    /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu,
    (url) => {
      const trailingPunctuation = url.match(/[.!?,;:)\]]+$/u)?.[0] || "";
      const urlCore = trailingPunctuation
        ? url.slice(0, -trailingPunctuation.length)
        : url;

      return protectPeriods(urlCore) + trailingPunctuation;
    },
  );

  const sentenceParts = protectedText.trim().split(/[.!?]+(?:["'”’)\]]*)\s*/u);

  return sentenceParts.filter((part) => getWords(part).length > 0).length;
}

// Count non-empty paragraphs.
// A blank line separates one paragraph from another.
function countParagraphs(text) {
  if (!text.trim()) {
    return 0;
  }

  return text
    .trim()
    .split(/(?:\r\n|\r|\n)[\t ]*(?:\r\n|\r|\n)+/u)
    .filter((paragraph) => paragraph.trim().length > 0).length;
}

// Count lines, including intentionally empty lines.
function countLines(text) {
  if (!text.length) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/u).length;
}

// Calculate average visible characters per word.
function calculateAverageWordLength(text) {
  const words = getWords(text);

  if (words.length === 0) {
    return 0;
  }

  const totalCharacters = words.reduce(
    (total, word) => total + countCharacters(word),
    0,
  );

  return Number((totalCharacters / words.length).toFixed(1));
}

// Estimate reading time at 200 words per minute.
function calculateReadingTime(words) {
  return (words / 200) * 60;
}

// Estimate speaking time at 130 words per minute.
function calculateSpeakingTime(words) {
  return (words / 130) * 60;
}

// Analyze all text statistics.
function analyzeText(text) {
  const words = countWords(text);

  return {
    words,
    characters: countCharacters(text),
    charactersWithoutSpaces: countCharactersWithoutSpaces(text),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    lines: countLines(text),
    averageWordLength: calculateAverageWordLength(text),
    readingTime: calculateReadingTime(words),
    speakingTime: calculateSpeakingTime(words),
  };
}

// Make functions available to the main application.
window.WordCounter = {
  countWords,
  countCharacters,
  countCharactersWithoutSpaces,
  countSentences,
  countParagraphs,
  countLines,
  calculateAverageWordLength,
  calculateReadingTime,
  calculateSpeakingTime,
  analyzeText,
};
