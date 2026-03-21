// SuchnaX Link - Multilingual Branding Configuration

export const BRAND_CONFIG = {
    // Brand name with language variants
    name: {
        en: 'SuchnaX Link',
        hi: 'सूचनाX लिंक',
        te: 'సూచనాX లింక్',
        ta: 'சூச்சனாX லிங்க்',
        kn: 'ಸೂಚನಾX ಲಿಂಕ್'
    },
    
    // National slogan with language variants
    slogan: {
        en: 'Proudly Built for India\'s Digital Institutions.',
        hi: 'भारत की डिजिटल संस्थाओं के लिए समर्पित।',
        te: 'భారత డిజిటల్ సంస్థల కోసం నిర్మించబడింది.',
        ta: 'இந்தியாவின் டிஜிட்டல் நிறுவனங்களுக்காக உருவாக்கப்பட்டது.',
        kn: 'ಭಾರತದ ಡಿಜಿಟಲ್ ಸಂಸ್ಥೆಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ.'
    },
    
    // Language options for selector
    languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' }
    ],
    
    // Brand colors
    colors: {
        saffron: '#FF9933',
        white: '#FFFFFF',
        green: '#138808',
        navy: '#000080',
        darkSlate: '#1E1E2F',
        // Royal Dark Premium Palette
        royalDark: {
            bg: '#0a0b0f',
            surface: '#11141b',
            border: 'rgba(255, 255, 255, 0.08)',
            text: '#f1f3f9',
            muted: '#94a3b8',
            blue: '#3b82f6',
            accent: 'rgba(59, 130, 246, 0.15)'
        }
    },
    
    // Font families by language
    fonts: {
        en: "'Inter', 'Outfit', system-ui, -apple-system, sans-serif",
        hi: "'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif",
        te: "'Noto Sans', 'Noto Sans Telugu', system-ui, sans-serif",
        ta: "'Noto Sans', 'Noto Sans Tamil', system-ui, sans-serif",
        kn: "'Noto Sans', 'Noto Sans Kannada', system-ui, sans-serif"
    }
};

// Helper function to get brand name by language
export const getBrandName = (language = 'en') => {
    return BRAND_CONFIG.name[language] || BRAND_CONFIG.name.en;
};

// Helper function to get slogan by language
export const getSlogan = (language = 'en') => {
    return BRAND_CONFIG.slogan[language] || BRAND_CONFIG.slogan.en;
};

// Helper function to get font family by language
export const getFontFamily = (language = 'en') => {
    return BRAND_CONFIG.fonts[language] || BRAND_CONFIG.fonts.en;
};
