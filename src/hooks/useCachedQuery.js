import { useState, useEffect, useCallback } from 'react';
import { deduplicateRequest } from '../utils/requestDeduplication';

// Global memory cache
const globalCache = {
    data: {},
    timestamp: {}
};

/**
 * Custom hook for Stale-While-Revalidate caching.
 * @param {string} key - Unique key for the query
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Object} options - { staleTime: ms, onSuccess: fn }
 */
export const useCachedQuery = (key, fetchFn, options = {}) => {
    const { staleTime = 5 * 60 * 1000, onSuccess } = options;

    const [data, setData] = useState(globalCache.data[key] || null);
    const [isLoading, setIsLoading] = useState(!globalCache.data[key]);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        else setIsRefetching(true);

        try {
            // Deduplicate requests with the same key
            const result = await deduplicateRequest(key, fetchFn);

            // Update global cache
            globalCache.data[key] = result;
            globalCache.timestamp[key] = Date.now();

            setData(result);
            setError(null);
            if (onSuccess) onSuccess(result);
        } catch (err) {
            // Only set error if we don't have cached data to fall back on
            if (!globalCache.data[key]) {
                setError(err);
            }
            // Log error but don't throw - allow graceful degradation
            console.warn(`Cache query error for key "${key}":`, err.message);
            
            // If we have stale data, keep using it
            if (globalCache.data[key]) {
                setData(globalCache.data[key]);
            }
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, [key, fetchFn, onSuccess]);

    useEffect(() => {
        const cachedData = globalCache.data[key];
        const lastFetch = globalCache.timestamp[key] || 0;
        const isStale = Date.now() - lastFetch > staleTime;

        if (!cachedData || isStale) {
            // Fetch in background if we have cached data (even if stale)
            fetchData(!!cachedData);
        } else {
            // Already have fresh data, just ensure local state is synced
            setData(cachedData);
            setIsLoading(false);
            // Still call onSuccess to update parent component
            if (onSuccess && cachedData) onSuccess(cachedData);
        }
    }, [key, staleTime, fetchData, onSuccess]);

    return {
        data,
        isLoading,
        isRefetching,
        error,
        refetch: () => fetchData(true),
        setData: (newData) => {
            globalCache.data[key] = newData;
            setData(newData);
        }
    };
};
