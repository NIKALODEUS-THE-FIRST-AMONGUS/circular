import { useState, useEffect, useRef } from 'react';

/**
 * Image optimization hook for lazy loading and progressive loading
 */
export const useImageOptimizer = (src, options = {}) => {
    const { 
        placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGRkZGRkUiLz48L3N2Zz4=',
        quality = 80,
        width,
        height 
    } = options;
    
    const [imageSrc, setImageSrc] = useState(placeholder);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!src) {
            return;
        }

        let mounted = true;
        
        const loadImage = () => {
            if (!mounted) return;
            
            setIsLoading(true);
            setError(null);

            const img = new Image();
            
            // Add query parameters for optimization if supported by CDN
            let optimizedSrc = src;
            if (src.includes('supabase.co')) {
                const params = new URLSearchParams();
                if (width) params.append('width', width);
                if (height) params.append('height', height);
                params.append('quality', quality);
                params.append('format', 'webp');
                optimizedSrc = `${src}?${params.toString()}`;
            }

            img.src = optimizedSrc;

            img.onload = () => {
                if (mounted) {
                    setImageSrc(optimizedSrc);
                    setIsLoading(false);
                }
            };

            img.onerror = () => {
                if (mounted) {
                    setError('Failed to load image');
                    setImageSrc(placeholder);
                    setIsLoading(false);
                }
            };
        };

        loadImage();

        return () => {
            mounted = false;
        };
    }, [src, placeholder, width, height, quality]);

    return { src: imageSrc, isLoading, error };
};

/**
 * Lazy load images with Intersection Observer
 */
export const useLazyImage = (src, options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef();
    
    const { rootMargin = '50px', threshold = 0.01 } = options;

    useEffect(() => {
        const currentImg = imgRef.current;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin, threshold }
        );

        if (currentImg) {
            observer.observe(currentImg);
        }

        return () => {
            if (currentImg) {
                observer.unobserve(currentImg);
            }
        };
    }, [rootMargin, threshold]);

    const { src: optimizedSrc, isLoading } = useImageOptimizer(
        isVisible ? src : null,
        options
    );

    // Derive hasLoaded from state instead of using effect
    const hasLoaded = !isLoading && isVisible;

    return { ref: imgRef, src: optimizedSrc, isLoading, hasLoaded };
};

/**
 * Progressive image loading with blur-up technique
 */
export const useProgressiveImage = (src, options = {}) => {
    const { smallSrc, blur = 20 } = options;
    const [currentSrc, setCurrentSrc] = useState(smallSrc || src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!src) return;

        const img = new Image();
        img.src = src;
        
        img.onload = () => {
            setCurrentSrc(src);
            setIsLoaded(true);
        };
    }, [src]);

    return { 
        src: currentSrc, 
        isLoaded,
        style: {
            filter: isLoaded ? 'none' : `blur(${blur}px)`,
            transition: 'filter 0.3s ease-out'
        }
    };
};