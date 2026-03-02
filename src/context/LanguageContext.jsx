/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { updateDocument } from '../lib/firebase-db';
import { AuthContext } from './AuthContext';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const profile = auth?.profile;
    
    // Initialize from localStorage (instant, no database dependency)
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('app_language');
        if (saved) return saved;
        return 'en'; // Default to English
    });

    // Apply language to DOM
    useEffect(() => {
        document.documentElement.lang = language;
        localStorage.setItem('app_language', language);
    }, [language]);

    // Sync language with profile when it loads (background, non-blocking)
    useEffect(() => {
        if (profile?.app_language && profile.app_language !== language) {
            setLanguage(profile.app_language);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.app_language]);

    // Update language (instant UI, background database sync)
    const updateLanguage = async (newLanguage) => {
        // 1. Instant UI update
        setLanguage(newLanguage);

        // 2. Background database sync (non-blocking)
        if (user) {
            try {
                await updateDocument('profiles', user.uid, { app_language: newLanguage });
            } catch (err) {
                console.warn("Language sync failed, will retry on next reload", err);
            }
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: updateLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};
