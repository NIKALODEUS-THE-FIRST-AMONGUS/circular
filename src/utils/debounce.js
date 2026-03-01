/**
 * Debounce utility - Used by Google, Amazon for search optimization
 * Delays function execution until after wait time has elapsed since last call
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle utility - Used for scroll/resize events
 * Ensures function is called at most once per specified time period
 */
export const throttle = (func, limit = 100) => {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
