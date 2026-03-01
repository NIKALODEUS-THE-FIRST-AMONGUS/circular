import { useEffect, useRef, useState } from 'react';

/**
 * Intersection Observer Hook
 * Used by Instagram, Facebook for lazy loading and infinite scroll
 */
export const useIntersectionObserver = (options = {}) => {
    const {
        threshold = 0.1,
        root = null,
        rootMargin = '0px',
        freezeOnceVisible = false
    } = options;

    const [entry, setEntry] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef(null);
    const frozen = useRef(false);

    useEffect(() => {
        const element = elementRef.current;
        const hasIOSupport = !!window.IntersectionObserver;

        if (!hasIOSupport || !element) return;

        if (frozen.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setEntry(entry);
                setIsVisible(entry.isIntersecting);

                if (entry.isIntersecting && freezeOnceVisible) {
                    frozen.current = true;
                }
            },
            { threshold, root, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, root, rootMargin, freezeOnceVisible]);

    return { ref: elementRef, entry, isVisible };
};
