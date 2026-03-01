import { useState, useEffect, useCallback } from 'react';

/**
 * Local Storage Hook with sync across tabs
 * Used by Google Docs, Notion for cross-tab synchronization
 */
export const useLocalStorage = (key, initialValue) => {
    // Get initial value from localStorage or use provided initial value
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when value changes
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function like useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            
            setStoredValue(valueToStore);
            
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            
            // Dispatch custom event for cross-tab sync
            window.dispatchEvent(new CustomEvent('local-storage-change', {
                detail: { key, value: valueToStore }
            }));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Remove from localStorage
    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    // Listen for changes in other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.error('Error parsing storage event:', error);
                }
            }
        };

        const handleCustomEvent = (e) => {
            if (e.detail.key === key) {
                setStoredValue(e.detail.value);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('local-storage-change', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage-change', handleCustomEvent);
        };
    }, [key]);

    return [storedValue, setValue, removeValue];
};
