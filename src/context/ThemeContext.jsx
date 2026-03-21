/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { updateDocument } from '../lib/firebase-db';
import { AuthContext } from './FirebaseAuthContext';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const auth = useContext(AuthContext);
    const user = auth?.user;
    const profile = auth?.profile;
    
    // Initialize from localStorage only (instant, no database dependency)
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme_preference');
        if (saved) return saved;
        return 'system'; // Default to system preference
    });

    // Apply theme to DOM instantly
    useEffect(() => {
        const root = document.documentElement;
        
        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', isDark);
            root.classList.toggle('light', !isDark);
        } else {
            root.classList.toggle('dark', theme === 'dark');
            root.classList.toggle('light', theme === 'light');
        }
        
        localStorage.setItem('theme_preference', theme);
    }, [theme]);

    // Listen to system theme changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const root = document.documentElement;
            root.classList.toggle('dark', e.matches);
            root.classList.toggle('light', !e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Sync theme with profile when it loads (background, non-blocking)
    useEffect(() => {
        if (profile?.theme_preference && profile.theme_preference !== theme) {
            setTheme(profile.theme_preference);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.theme_preference]);

    // Update theme (instant UI, background database sync)
    const updateTheme = async (newTheme) => {
        // 1. Instant UI update
        setTheme(newTheme);

        // 2. Background database sync (non-blocking)
        if (user) {
            try {
                await updateDocument('profiles', user.uid, { theme_preference: newTheme });
            } catch (err) {
                // Silently fail - theme is already applied locally
                if (import.meta.env.DEV) {
                    console.warn("Theme sync failed (non-critical):", err.message);
                }
            }
        }
    };

    // Toggle between light/dark (for backward compatibility)
    const toggleTheme = () => {
        // If system mode, check actual applied theme
        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const newTheme = isDark ? 'light' : 'dark';
            updateTheme(newTheme);
        } else {
            const newTheme = theme === 'light' ? 'dark' : 'light';
            updateTheme(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};


