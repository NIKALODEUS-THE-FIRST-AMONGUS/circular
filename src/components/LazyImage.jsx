import { useState } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useImageOptimizer } from '../hooks/useImageOptimizer';

/**
 * Lazy Loading Image Component
 * Used by Instagram, Pinterest, Medium for performance
 */
const LazyImage = ({ 
    src, 
    alt, 
    className = '', 
    placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
    onLoad = null,
    ...props 
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { ref, isVisible } = useIntersectionObserver({
        threshold: 0.1,
        freezeOnceVisible: true
    });

    // Optimize image if needed
    const { optimizedSrc } = useImageOptimizer(src);
    const imageSrc = isVisible ? optimizedSrc : placeholder;

    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    const handleError = () => {
        setHasError(true);
        console.error(`Failed to load image: ${src}`);
    };

    return (
        <div ref={ref} className={`relative overflow-hidden ${className}`}>
            <img
                src={imageSrc}
                alt={alt}
                onLoad={handleLoad}
                onError={handleError}
                className={`transition-opacity duration-300 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                } ${hasError ? 'hidden' : ''}`}
                loading="lazy"
                {...props}
            />
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-surface-light animate-pulse" />
            )}
            {hasError && (
                <div className="absolute inset-0 bg-surface-light flex items-center justify-center text-text-muted text-sm">
                    Failed to load image
                </div>
            )}
        </div>
    );
};

export default LazyImage;
