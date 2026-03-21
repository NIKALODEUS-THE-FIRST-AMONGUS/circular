/**
 * Centralized Profanity Filter Utility
 * Used to moderate user feedback and other community content.
 */

// Basic list of common profanity
const PROFANE_WORDS = [
  "abuse", "idiot", "stupid", "dumb", "fool", "damn", "hell", "suck",
  "shut up", "nonsense", "crap", "bloody", "bastard"
];

// Extreme offensive terms (racist, hate speech)
const EXTREME_WORDS = [
  "racistWord1", "racistWord2", "nazi", "hitler", "hate", "kill"
];

// Targeted hate speech (e.g. anti-Semitic terms)
const ANTI_SEMITIC_WORDS = [
  "antiSemiticTerm1", "antiSemiticTerm2", "jew", "holocaust", "zionist"
];

/**
 * Checks if a string contains any profanity.
 */
export const checkProfanity = (text) => {
  if (!text) return { hasProfanity: false, matches: [] };
  const words = text.toLowerCase().split(/\s+/);
  const matches = words.filter(word => PROFANE_WORDS.includes(word));
  return {
    hasProfanity: matches.length > 0,
    matches
  };
};

/**
 * Categorizes the severity of profanity matches.
 */
export const getProfanitySeverity = (matches) => {
  if (matches.length > 3) return "high";
  if (matches.length > 0) return "low";
  return "none";
};

/**
 * Checks for extremely offensive terms.
 */
export const checkExtremeOffensive = (text) => {
  if (!text) return { isExtreme: false };
  const words = text.toLowerCase().split(/\s+/);
  const hasExtreme = words.some(word => EXTREME_WORDS.includes(word));
  return { isExtreme: hasExtreme };
};

/**
 * Sanitizes profane words from text by replacing them with asterisks.
 */
export const sanitizeProfanity = (text) => {
  if (!text) return "";
  let sanitized = text;
  PROFANE_WORDS.concat(EXTREME_WORDS).forEach(word => {
    const reg = new RegExp(`\\b${word}\\b`, "gi");
    sanitized = sanitized.replace(reg, "*".repeat(word.length));
  });
  return sanitized;
};

/**
 * Specifically checks for targeted hate speech.
 */
export const checkAntiSemitism = (text) => {
  if (!text) return { found: false };
  const words = text.toLowerCase().split(/\s+/);
  const found = words.some(word => ANTI_SEMITIC_WORDS.includes(word));
  return { found };
};
