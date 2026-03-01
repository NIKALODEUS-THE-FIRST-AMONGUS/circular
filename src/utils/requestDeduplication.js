/**
 * Request Deduplication Utility
 * Prevents duplicate API calls - Used by React Query, SWR
 */

const pendingRequests = new Map();

/**
 * Deduplicate requests with the same key
 * If a request is already in progress, return the existing promise
 */
export const deduplicateRequest = async (key, requestFn) => {
    // Check if request is already in progress
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    // Create new request
    const promise = requestFn()
        .finally(() => {
            // Clean up after request completes
            pendingRequests.delete(key);
        });

    // Store pending request
    pendingRequests.set(key, promise);

    return promise;
};

/**
 * Clear a specific pending request
 */
export const clearPendingRequest = (key) => {
    pendingRequests.delete(key);
};

/**
 * Clear all pending requests
 */
export const clearAllPendingRequests = () => {
    pendingRequests.clear();
};

/**
 * Get number of pending requests
 */
export const getPendingRequestCount = () => {
    return pendingRequests.size;
};
