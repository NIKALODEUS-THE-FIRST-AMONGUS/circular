/**
 * Input Sanitization Utilities
 * Security best practices from OWASP (used by all major tech companies)
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Similar to DOMPurify (used by Google, Facebook)
 */
export const sanitizeHTML = (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
};

/**
 * Escape HTML special characters
 */
export const escapeHTML = (str) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitize user input for database queries
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove potential SQL injection patterns
    return input
        .replace(/[;'"\\]/g, '') // Remove dangerous characters
        .trim()
        .slice(0, 1000); // Limit length
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
        .replace(/_{2,}/g, '_') // Remove multiple underscores
        .slice(0, 255); // Limit length
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    isAllowed(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        
        // Remove old requests outside the window
        const recentRequests = userRequests.filter(
            time => now - time < this.windowMs
        );
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }

    reset(key) {
        this.requests.delete(key);
    }
}
