/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';

/**
 * Accessibility Helper Component
 * Implements WCAG 2.1 AA standards used by Microsoft, Google, Apple
 */
const AccessibilityHelper = () => {
    useEffect(() => {
        // Add skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add main content landmark if not exists
        const main = document.querySelector('main');
        if (main && !main.id) {
            main.id = 'main-content';
        }

        // Announce page changes to screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.id = 'a11y-announcer';
        document.body.appendChild(announcer);

        return () => {
            skipLink.remove();
            announcer.remove();
        };
    }, []);

    return null;
};

/**
 * Announce message to screen readers
 */
export const announce = (message) => {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }
};

export default AccessibilityHelper;
