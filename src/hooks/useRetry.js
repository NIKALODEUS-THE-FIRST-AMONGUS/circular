import { useState, useCallback } from 'react';

/**
 * Retry Hook with Exponential Backoff
 * Used by AWS, Google Cloud for resilient API calls
 */
export const useRetry = (maxRetries = 3, initialDelay = 1000) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState(null);

    const executeWithRetry = useCallback(async (fn, options = {}) => {
        const {
            maxRetries: customMaxRetries = maxRetries,
            initialDelay: customInitialDelay = initialDelay,
            onRetry = null
        } = options;

        setIsRetrying(false);
        setRetryCount(0);
        setError(null);

        for (let attempt = 0; attempt <= customMaxRetries; attempt++) {
            try {
                const result = await fn();
                setRetryCount(0);
                return result;
            } catch (err) {
                setError(err);
                setRetryCount(attempt + 1);

                if (attempt === customMaxRetries) {
                    throw err;
                }

                // Exponential backoff: 1s, 2s, 4s, 8s...
                const delay = customInitialDelay * Math.pow(2, attempt);
                
                setIsRetrying(true);
                
                if (onRetry) {
                    onRetry(attempt + 1, delay, err);
                }

                console.warn(`Retry ${attempt + 1}/${customMaxRetries} after ${delay}ms...`, err.message);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }, [maxRetries, initialDelay]);

    const reset = useCallback(() => {
        setIsRetrying(false);
        setRetryCount(0);
        setError(null);
    }, []);

    return {
        executeWithRetry,
        isRetrying,
        retryCount,
        error,
        reset
    };
};
