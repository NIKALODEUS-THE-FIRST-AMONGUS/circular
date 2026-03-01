import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Virtual scrolling hook for large lists
 * Only renders visible items for better performance
 */
export const useVirtualScroll = (items, options = {}) => {
    const {
        itemHeight = 200,
        overscan = 3,
        containerHeight = 600
    } = options;

    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef(null);

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    const totalHeight = items.length * itemHeight;

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    return {
        containerRef,
        visibleItems,
        offsetY,
        totalHeight,
        handleScroll,
        startIndex,
        endIndex
    };
};

/**
 * Infinite scroll hook for pagination
 */
export const useInfiniteScroll = (callback, options = {}) => {
    const {
        threshold = 0.8,
        enabled = true
    } = options;

    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting) {
                    callback();
                }
            },
            { threshold }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [callback, threshold, enabled]);

    return loadMoreRef;
};

/**
 * Optimized list rendering with batching
 */
export const useBatchedRender = (items, batchSize = 10) => {
    const [renderedCount, setRenderedCount] = useState(batchSize);
    const [isRendering, setIsRendering] = useState(false);

    useEffect(() => {
        if (renderedCount >= items.length) return;
        
        const timer = setTimeout(() => {
            setIsRendering(true);
            setRenderedCount(prev => Math.min(prev + batchSize, items.length));
            setIsRendering(false);
        }, 50);

        return () => clearTimeout(timer);
    }, [renderedCount, items.length, batchSize]);

    const visibleItems = items.slice(0, renderedCount);
    const hasMore = renderedCount < items.length;

    return {
        visibleItems,
        hasMore,
        isRendering,
        loadMore: () => setRenderedCount(prev => Math.min(prev + batchSize, items.length))
    };
};