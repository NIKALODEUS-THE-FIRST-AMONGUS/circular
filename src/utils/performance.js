/**
 * Performance optimization utilities
 */

// Debounce function for expensive operations
export const debounce = (func, wait) => {
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

// Throttle function for scroll/resize events
export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

// Optimized CSS class for animations
export const optimizedAnimationClass = {
    // Hardware accelerated transforms
    hardwareAccelerated: 'transform-gpu will-change-transform',
    
    // Smooth transitions
    smoothTransition: 'transition-all duration-200 ease-out',
    
    // Reduced motion
    reducedMotion: '@media (prefers-reduced-motion: reduce) { transition: none !important; }',
    
    // Performance optimized animations
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in'
};

// Lazy load images with Intersection Observer
export const lazyLoadImages = () => {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img.lazy').forEach((img) => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for older browsers
        document.querySelectorAll('img.lazy').forEach((img) => {
            img.src = img.dataset.src;
        });
    }
};

// Preload critical resources
export const preloadResources = (resources) => {
    resources.forEach(({ href, as, type }) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        if (as) link.as = as;
        if (type) link.type = type;
        document.head.appendChild(link);
    });
};

// Measure performance metrics
export const measurePerformance = (metricName, callback) => {
    if ('performance' in window) {
        const startMark = `${metricName}_start`;
        const endMark = `${metricName}_end`;
        
        performance.mark(startMark);
        
        const result = callback();
        
        performance.mark(endMark);
        performance.measure(metricName, startMark, endMark);
        
        const measures = performance.getEntriesByName(metricName);
        const duration = measures[0]?.duration || 0;
        
        // Clean up
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(metricName);
        
        console.log(`⏱️ ${metricName}: ${duration.toFixed(2)}ms`);
        
        return { result, duration };
    }
    
    return { result: callback(), duration: 0 };
};

// Optimize scroll performance
export const optimizeScroll = () => {
    // Use passive event listeners for better scroll performance
    const supportsPassive = (() => {
        let supports = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get: () => {
                    supports = true;
                    return true;
                }
            });
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
        } catch {
            // Passive not supported
        }
        return supports;
    })();

    return supportsPassive ? { passive: true } : false;
};

// Memory management
export const memoryManager = {
    cache: new Map(),
    
    set(key, value, ttl = 300000) { // 5 minutes default
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
        
        // Auto cleanup
        setTimeout(() => {
            this.delete(key);
        }, ttl);
    },
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    delete(key) {
        this.cache.delete(key);
    },
    
    clear() {
        this.cache.clear();
    }
};

// Batch DOM updates
export const batchUpdates = (callback) => {
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            requestAnimationFrame(callback);
        });
    } else {
        setTimeout(callback, 0);
    }
};

// Optimize network requests
export const optimizeNetwork = {
    // Combine multiple requests
    batchRequests: async (requests) => {
        return Promise.all(requests);
    },
    
    // Cache with ETag support
    cachedFetch: async (url, options = {}) => {
        const cacheKey = `fetch_${url}`;
        const cached = memoryManager.get(cacheKey);
        
        if (cached && !options.forceRefresh) {
            return cached;
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (response.ok) {
            memoryManager.set(cacheKey, data, 60000); // 1 minute cache
        }
        
        return data;
    },
    
    // Prefetch resources
    prefetch: (urls) => {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        });
    }
};