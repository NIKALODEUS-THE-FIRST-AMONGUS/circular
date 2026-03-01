import { useEffect } from 'react';

/**
 * Keyboard Shortcuts Hook
 * Used by Gmail, Slack, VS Code for power users
 */
export const useKeyboardShortcuts = (shortcuts = {}) => {
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Build key combination string
            const keys = [];
            if (event.ctrlKey || event.metaKey) keys.push('ctrl');
            if (event.shiftKey) keys.push('shift');
            if (event.altKey) keys.push('alt');
            keys.push(event.key.toLowerCase());
            
            const combination = keys.join('+');
            
            // Check if this combination has a handler
            const handler = shortcuts[combination];
            if (handler) {
                event.preventDefault();
                handler(event);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [shortcuts]);
};

/**
 * Common keyboard shortcuts
 */
export const SHORTCUTS = {
    REFRESH: 'ctrl+r',
    SEARCH: 'ctrl+k',
    NEW: 'ctrl+n',
    SAVE: 'ctrl+s',
    CLOSE: 'escape',
    HELP: 'ctrl+/',
};
