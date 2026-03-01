import { useRef, useEffect } from 'react';

/**
 * Optimized animation hook that uses requestAnimationFrame
 * and reduces re-renders for smooth animations
 */
export const useOptimizedAnimation = (callback, dependencies = []) => {
    const frameRef = useRef();
    const callbackRef = useRef(callback);
    
    // Update callback reference
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const animate = () => {
            callbackRef.current();
            frameRef.current = requestAnimationFrame(animate);
        };
        
        frameRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);
};

/**
 * Debounced animation for expensive operations
 */
export const useDebouncedAnimation = (callback, delay = 16) => {
    const timeoutRef = useRef();
    
    useEffect(() => {
        const handleAnimation = () => {
            timeoutRef.current = setTimeout(callback, delay);
        };
        
        handleAnimation();
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [callback, delay]);
};

/**
 * Optimized scroll animations
 */
export const useSmoothScroll = (elementRef, options = {}) => {
    const { behavior = 'smooth', block = 'start' } = options;
    
    const scrollTo = () => {
        if (elementRef.current) {
            elementRef.current.scrollIntoView({
                behavior,
                block,
            });
        }
    };
    
    return scrollTo;
};

/**
 * Animation frame throttling for performance
 */
export const useAnimationThrottle = (callback, fps = 60) => {
    const frameRef = useRef();
    const lastTimeRef = useRef(0);
    const callbackRef = useRef(callback);
    const interval = 1000 / fps;
    
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    
    useEffect(() => {
        const throttledCallback = (time) => {
            if (time - lastTimeRef.current >= interval) {
                callbackRef.current();
                lastTimeRef.current = time;
            }
            frameRef.current = requestAnimationFrame(throttledCallback);
        };
        
        frameRef.current = requestAnimationFrame(throttledCallback);
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [interval]);
};