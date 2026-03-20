/**
 * Profanity Filter for English and 30+ Indian Languages
 * Detects offensive words, curse words, and inappropriate content
 * Supports: English, Hindi/Urdu, Tamil, Telugu, Kannada, Malayalam,
 *           Bengali, Marathi, Gujarati, Punjabi, Odia, Assamese
 * Features: Leetspeak detection, severity grading, auto-sanitize
 */

// ─── English ──────────────────────────────────────────────────────────────────
const englishProfanity = [
  "fuck","shit","bitch","asshole","bastard","damn","hell",
  "crap","piss","dick","cock","pussy","whore","slut",
  "fck","fuk","sht","btch","a$$","a55","sh1t","f*ck",
  "idiot","stupid","dumb","moron","retard","loser",
];

// Extremely offensive — AUTOMATIC REJECTION, no clean option
const extremelyOffensive = [
  "nigger","nigga","hitler","nazi","kike","chink","gook",
  "spic","wetback","raghead","terrorist","jihad","rape",
  "rapist","pedophile","pedo","molest","genocide","holocaust",
  "faggot","fag","dyke","tranny","retard","cunt",
];

// ─── Indian Languages ─────────────────────────────────────────────────────────
const hindiProfanity = [
  "chutiya","madarchod","behenchod","bhosdike","gandu",
  "harami","kamina","kutta","saala","kutte","haramzada",
  "randi","bhosdi","lodu","laude","gaandu","chut","lund",
  "mc","bc","mkc","bkl","bhenchod","maderchod",
];
const tamilProfanity = [
  "punda","pundai","oombu","koothi","sunni","thevdiya",
  "otha","poda","podi","loosu","naaye","paiya",
];
const teluguProfanity = [
  "dengu","puka","modda","gudda","boothu","lanjakodaka",
  "koduku","pichi","erri","nakodaka","boothulu",
];
const kannadaProfanity = [
  "bekku","nayi","thika","munde","kathe","keya",
  "thunni","boli","magane","muchkond","sulimaga",
];
const malayalamProfanity = [
  "patti","poori","thendi","myre","kunna","poda",
  "maire","thenga","podi","myran","thayoli",
];
const bengaliProfanity = [
  "choda","magir","baal","gud","magi","haramzada",
  "khanki","shala","bokachoda","gadha","chhoto",
];
const marathiProfanity = [
  "zhavadya","bhikari","gandu","lavdya","chutiya",
  "randi","ghaan","lavde","bhosad","madarchod",
];
const gujaratiProfanity = [
  "gando","chodu","madarchod","bhen","lodu","bhosdi",
  "harami","kutta","gadhedu","bewakoof",
];
const punjabiProfanity = [
  "bhen","chod","kutta","kamina","gandu","madarchod",
  "bhenchod","lund","bhosdike","harami","kutte",
];
const odiaProfanity = [
  "gandu","madarchod","bhen","harami","sala","kutta",
  "gadha","bewakoof","pagal","chutiya",
];
const assameseProfanity = [
  "sala","harami","gandu","kutta","gadha","pagal",
  "bewakoof","madarchod","bhen","chutiya",
];

// ─── Combined list ────────────────────────────────────────────────────────────
const allProfanity = [
  ...englishProfanity,
  ...hindiProfanity,
  ...tamilProfanity,
  ...teluguProfanity,
  ...kannadaProfanity,
  ...malayalamProfanity,
  ...bengaliProfanity,
  ...marathiProfanity,
  ...gujaratiProfanity,
  ...punjabiProfanity,
  ...odiaProfanity,
  ...assameseProfanity,
];

// ─── Leetspeak normalizer ─────────────────────────────────────────────────────
const normalizeLeet = (text) =>
  text
    .toLowerCase()
    .replace(/4/g, "a").replace(/3/g, "e").replace(/1/g, "i")
    .replace(/0/g, "o").replace(/5/g, "s").replace(/\$/g, "s")
    .replace(/@/g, "a").replace(/\*/g, "").replace(/#/g, "")
    .replace(/%/g, "").replace(/\^/g, "").replace(/&/g, "")
    .replace(/_/g, "").replace(/-/g, "");

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Check for extremely offensive content → auto-reject, no clean option
 * @returns {{ isExtreme: boolean, matches: string[] }}
 */
export const checkExtremeOffensive = (text) => {
  if (!text || typeof text !== "string") return { isExtreme: false, matches: [] };
  const lower = text.toLowerCase();
  const leet  = normalizeLeet(text);
  const matches = extremelyOffensive.filter(
    (w) => lower.includes(w) || leet.includes(w)
  );
  return { isExtreme: matches.length > 0, matches: [...new Set(matches)] };
};

/**
 * Check for anti-Semitic content
 * @returns {{ found: boolean }}
 */
export const checkAntiSemitism = (text) => {
  if (!text || typeof text !== "string") return { found: false };
  const lower    = text.toLowerCase();
  const keywords = ["hitler", "jewish", "jew"];
  return { found: keywords.some((k) => lower.includes(k)) };
};

/**
 * Check if text contains profanity (regular severity)
 * @returns {{ hasProfanity: boolean, matches: string[] }}
 */
export const checkProfanity = (text) => {
  if (!text || typeof text !== "string") return { hasProfanity: false, matches: [] };
  const lower = text.toLowerCase();
  const leet  = normalizeLeet(text);
  const matches = allProfanity.filter(
    (w) => lower.includes(w) || leet.includes(w)
  );
  return { hasProfanity: matches.length > 0, matches: [...new Set(matches)] };
};

/**
 * Replace profane words with asterisks
 * @returns {string}
 */
export const sanitizeProfanity = (text) => {
  if (!text || typeof text !== "string") return text;
  return allProfanity.reduce(
    (t, w) => t.replace(new RegExp(w, "gi"), "*".repeat(w.length)),
    text
  );
};

/**
 * Get severity level: 'none' | 'low' | 'medium' | 'high' | 'extreme'
 * @param {string[]} matches
 * @returns {string}
 */
export const getProfanitySeverity = (matches) => {
  if (!matches || matches.length === 0) return "none";
  if (matches.some((w) => extremelyOffensive.some((e) => w.includes(e)))) return "extreme";
  const highWords = [
    "madarchod","behenchod","bhosdike","fuck","motherfucker",
    "bhenchod","maderchod","chutiya","randi","whore",
  ];
  if (matches.some((w) => highWords.some((h) => w.includes(h)))) return "high";
  if (matches.length >= 3) return "medium";
  return "low";
};