/**
 * Enterprise Error Tracking System
 * Similar to Sentry (used by Microsoft, Uber, Disney)
 */

class ErrorTracker {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.endpoint = import.meta.env.VITE_ERROR_TRACKING_ENDPOINT;
    }

    /**
     * Capture and log errors
     */
    captureError(error, context = {}) {
        const errorData = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            context,
            type: error.name || 'Error'
        };

        // Store locally
        this.errors.push(errorData);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('🔴 Error Tracked:', errorData);
        }

        // Send to backend in production
        if (import.meta.env.PROD && this.endpoint) {
            this.sendToBackend(errorData);
        }

        // Store in localStorage for debugging
        try {
            localStorage.setItem('last_error', JSON.stringify(errorData));
        } catch {
            // Ignore localStorage errors
        }
    }

    /**
     * Send error to backend
     */
    async sendToBackend(errorData) {
        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            });
        } catch {
            // Silently fail - don't want error tracking to break the app
        }
    }

    /**
     * Get recent errors
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Clear error log
     */
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('last_error');
    }
}

export const errorTracker = new ErrorTracker();

/**
 * Global error handler setup
 */
export const setupGlobalErrorHandling = () => {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
        errorTracker.captureError(event.error || new Error(event.message), {
            type: 'unhandled_error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        errorTracker.captureError(
            new Error(event.reason?.message || event.reason || 'Unhandled Promise Rejection'),
            { type: 'unhandled_promise_rejection' }
        );
    });
};
