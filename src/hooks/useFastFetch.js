import { useState, useEffect, useCallback, useRef } from 'react';
import { withAdaptiveTimeout } from '../lib/networkSpeed';

/**
 * Fast fetch hook with intelligent caching and parallel requests
 */
export const useFastFetch = (key, fetchFn, options = {}) => {
    const {
        enabled = true,
        staleTime = 30000, // 30 seconds
        cacheTime = 5 * 60 * 1000, // 5 minutes
        retry = 3,
        retryDelay = 1000,
        onSuccess,
        onError
    } = options;

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRefetching, setIsRefetching] = useState(false);
    
    const cacheRef = useRef({});
    const abortControllerRef = useRef(null);

    const clearCache = useCallback(() => {
        cacheRef.current = {};
    }, []);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!enabled) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        if (!isBackground) {
            setIsLoading(true);
        } else {
            setIsRefetching(true);
        }

        setError(null);

        // Check cache first
        const cached = cacheRef.current[key];
        if (cached && Date.now() - cached.timestamp < staleTime) {
            setData(cached.data);
            if (!isBackground) setIsLoading(false);
            setIsRefetching(false);
            if (onSuccess) onSuccess(cached.data);
            return cached.data;
        }

        let retries = 0;
        let lastError = null;

        while (retries <= retry) {
            try {
                const result = await withAdaptiveTimeout(
                    fetchFn(abortControllerRef.current.signal),
                    { freshMeasure: retries === 0 }
                );

                // Cache the result
                cacheRef.current[key] = {
                    data: result,
                    timestamp: Date.now()
                };

                setData(result);
                setError(null);
                
                if (!isBackground) setIsLoading(false);
                setIsRefetching(false);
                
                if (onSuccess) onSuccess(result);
                return result;

            } catch (err) {
                lastError = err;
                
                if (err.name === 'AbortError') {
                    // Request was cancelled, don't retry
                    break;
                }

                retries++;
                
                if (retries <= retry) {
                    // Exponential backoff
                    await new Promise(resolve => 
                        setTimeout(resolve, retryDelay * Math.pow(2, retries - 1))
                    );
                }
            }
        }

        // All retries failed
        setError(lastError);
        if (!isBackground) setIsLoading(false);
        setIsRefetching(false);
        
        if (onError) onError(lastError);
        
        // Return cached data even if stale
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            setData(cached.data);
            return cached.data;
        }

        return null;
    }, [key, fetchFn, enabled, staleTime, cacheTime, retry, retryDelay, onSuccess, onError]);

    // Auto-fetch on mount
    useEffect(() => {
        if (enabled) {
            fetchData();
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [enabled, fetchData]);

    // Clean up old cache entries
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            Object.keys(cacheRef.current).forEach(cacheKey => {
                if (now - cacheRef.current[cacheKey].timestamp > cacheTime) {
                    delete cacheRef.current[cacheKey];
                }
            });
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [cacheTime]);

    return {
        data,
        isLoading,
        isRefetching,
        error,
        refetch: () => fetchData(true),
        clearCache,
        setData: (newData) => {
            cacheRef.current[key] = {
                data: newData,
                timestamp: Date.now()
            };
            setData(newData);
        }
    };
};

/**
 * Parallel fetch hook for multiple requests
 */
export const useParallelFetch = (queries, options = {}) => {
    const { enabled = true } = options;
    
    const [results, setResults] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const fetchAll = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setErrors({});

        const promises = queries.map(async ({ key, fetchFn }) => {
            try {
                const result = await withAdaptiveTimeout(fetchFn());
                return { key, result, error: null };
            } catch (error) {
                return { key, result: null, error };
            }
        });

        const settled = await Promise.all(promises);
        
        const newResults = {};
        const newErrors = {};
        
        settled.forEach(({ key, result, error }) => {
            if (error) {
                newErrors[key] = error;
            } else {
                newResults[key] = result;
            }
        });

        setResults(newResults);
        setErrors(newErrors);
        setIsLoading(false);

        return { results: newResults, errors: newErrors };
    }, [queries, enabled]);

    useEffect(() => {
        if (enabled) {
            fetchAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return {
        results,
        isLoading,
        errors,
        refetch: fetchAll
    };
};

/**
 * Optimistic update hook for instant UI feedback
 */
export const useOptimisticUpdate = (initialData, updateFn) => {
    const [data, setData] = useState(initialData);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);

    const update = useCallback(async (optimisticData) => {
        // Set optimistic data immediately
        setData(optimisticData);
        setIsUpdating(true);
        setError(null);

        try {
            // Perform actual update
            const result = await updateFn();
            setData(result);
            return result;
        } catch (err) {
            // Revert on error
            setData(initialData);
            setError(err);
            throw err;
        } finally {
            setIsUpdating(false);
        }
    }, [initialData, updateFn]);

    return {
        data,
        isUpdating,
        error,
        update
    };
};