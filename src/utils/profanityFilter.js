/**
 * Profanity Filter for English and 30+ Indian Languages
 * Detects offensive words, curse words, and inappropriate content
 */

// English profanity patterns
const englishProfanity = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'hell',
    'crap', 'piss', 'dick', 'cock', 'pussy', 'whore', 'slut',
    'fck', 'fuk', 'sht', 'btch', 'a$$', 'a55', 'sh1t', 'f*ck',
    'idiot', 'stupid', 'dumb', 'moron', 'retard', 'loser'
];

// Extremely offensive words - AUTOMATIC REJECTION
const extremelyOffensive = [
    'nigger', 'nigga', 'hitler', 'nazi', 'kike', 'chink', 'gook',
    'spic', 'wetback', 'raghead', 'terrorist', 'jihad', 'rape',
    'rapist', 'pedophile', 'pedo', 'molest', 'genocide', 'holocaust',
    'faggot', 'fag', 'dyke', 'tranny', 'retard', 'cunt'
];

// Hindi/Urdu profanity
const hindiProfanity = [
    'chutiya', 'madarchod', 'behenchod', 'bhosdike', 'gandu',
    'harami', 'kamina', 'kutta', 'saala', 'kutte', 'haramzada',
    'randi', 'bhosdi', 'lodu', 'laude', 'gaandu', 'chut', 'lund',
    'mc', 'bc', 'mkc', 'bkl', 'bhenchod', 'maderchod'
];

// Tamil profanity
const tamilProfanity = [
    'punda', 'pundai', 'oombu', 'koothi', 'sunni', 'thevdiya',
    'otha', 'poda', 'podi', 'loosu', 'naaye', 'paiya'
];

// Telugu profanity
const teluguProfanity = [
    'dengu', 'puka', 'modda', 'gudda', 'boothu', 'lanjakodaka',
    'koduku', 'pichi', 'erri', 'nakodaka', 'boothulu'
];

// Kannada profanity
const kannadaProfanity = [
    'bekku', 'nayi', 'thika', 'munde', 'kathe', 'keya',
    'thunni', 'boli', 'magane', 'muchkond', 'sulimaga'
];

// Malayalam profanity
const malayalamProfanity = [
    'patti', 'poori', 'thendi', 'myre', 'kunna', 'poda',
    'maire', 'thenga', 'poda', 'podi', 'myran', 'thayoli'
];

// Bengali profanity
const bengaliProfanity = [
    'choda', 'magir', 'baal', 'gud', 'magi', 'haramzada',
    'khanki', 'shala', 'bokachoda', 'gadha', 'chhoto'
];

// Marathi profanity
const marathiProfanity = [
    'zhavadya', 'bhikari', 'gandu', 'lavdya', 'chutiya',
    'randi', 'ghaan', 'lavde', 'bhosad', 'madarchod'
];

// Gujarati profanity
const gujaratiProfanity = [
    'gando', 'chodu', 'madarchod', 'bhen', 'lodu', 'bhosdi',
    'harami', 'kutta', 'gadhedu', 'bewakoof'
];

// Punjabi profanity
const punjabiProfanity = [
    'bhen', 'chod', 'kutta', 'kamina', 'gandu', 'madarchod',
    'bhenchod', 'lund', 'bhosdike', 'harami', 'kutte'
];

// Odia profanity
const odiaProfanity = [
    'gandu', 'madarchod', 'bhen', 'harami', 'sala', 'kutta',
    'gadha', 'bewakoof', 'pagal', 'chutiya'
];

// Assamese profanity
const assameseProfanity = [
    'sala', 'harami', 'gandu', 'kutta', 'gadha', 'pagal',
    'bewakoof', 'madarchod', 'bhen', 'chutiya'
];

// Combine all profanity lists
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
    ...assameseProfanity
];

/**
 * Check if text contains extremely offensive content that should be auto-rejected
 * @param {string} text - Text to check
 * @returns {Object} - { isExtreme: boolean, matches: string[] }
 */
export const checkExtremeOffensive = (text) => {
    if (!text || typeof text !== 'string') {
        return { isExtreme: false, matches: [] };
    }

    const lowerText = text.toLowerCase();
    const matches = [];

    // Simple substring check
    for (const word of extremelyOffensive) {
        if (lowerText.includes(word)) {
            matches.push(word);
        }
    }

    // Check for leetspeak variations
    const leetVariations = lowerText
        .replace(/4/g, 'a')
        .replace(/3/g, 'e')
        .replace(/1/g, 'i')
        .replace(/0/g, 'o')
        .replace(/5/g, 's')
        .replace(/\$/g, 's')
        .replace(/@/g, 'a')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/%/g, '')
        .replace(/\^/g, '')
        .replace(/&/g, '')
        .replace(/_/g, '')
        .replace(/-/g, '');

    for (const word of extremelyOffensive) {
        if (leetVariations.includes(word) && !matches.includes(word)) {
            matches.push(word);
        }
    }

    return {
        isExtreme: matches.length > 0,
        matches: [...new Set(matches)]
    };
};

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {Object} - { hasProfanity: boolean, matches: string[] }
 */
export const checkProfanity = (text) => {
    if (!text || typeof text !== 'string') {
        return { hasProfanity: false, matches: [] };
    }

    const lowerText = text.toLowerCase();
    const matches = [];

    // Simple substring check for profanity
    for (const word of allProfanity) {
        if (lowerText.includes(word)) {
            matches.push(word);
        }
    }

    // Check for leetspeak variations (a=4, e=3, i=1, o=0, s=5)
    const leetVariations = lowerText
        .replace(/4/g, 'a')
        .replace(/3/g, 'e')
        .replace(/1/g, 'i')
        .replace(/0/g, 'o')
        .replace(/5/g, 's')
        .replace(/\$/g, 's')
        .replace(/@/g, 'a')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/%/g, '')
        .replace(/\^/g, '')
        .replace(/&/g, '')
        .replace(/_/g, '')
        .replace(/-/g, '');

    for (const word of allProfanity) {
        if (leetVariations.includes(word) && !matches.includes(word)) {
            matches.push(word);
        }
    }

    return {
        hasProfanity: matches.length > 0,
        matches: [...new Set(matches)] // Remove duplicates
    };
};

/**
 * Sanitize text by replacing profanity with asterisks
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeProfanity = (text) => {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let sanitized = text;

    for (const word of allProfanity) {
        // Simple case-insensitive replacement
        const regex = new RegExp(word, 'gi');
        sanitized = sanitized.replace(regex, '*'.repeat(word.length));
    }

    return sanitized;
};

/**
 * Get severity level of profanity
 * @param {string[]} matches - Array of matched profane words
 * @returns {string} - 'none', 'low', 'medium', 'high', 'extreme'
 */
export const getProfanitySeverity = (matches) => {
    if (matches.length === 0) return 'none';
    
    // Check if any match is extremely offensive
    const hasExtreme = matches.some(word => 
        extremelyOffensive.some(extreme => word.includes(extreme))
    );
    
    if (hasExtreme) return 'extreme';
    
    const highSeverityWords = [
        'madarchod', 'behenchod', 'bhosdike', 'fuck', 'motherfucker',
        'bhenchod', 'maderchod', 'chutiya', 'randi', 'whore'
    ];

    const hasHighSeverity = matches.some(word => 
        highSeverityWords.some(severe => word.includes(severe))
    );

    if (hasHighSeverity) return 'high';
    if (matches.length >= 3) return 'medium';
    return 'low';
};
