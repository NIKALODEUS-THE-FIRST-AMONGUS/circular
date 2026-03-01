/**
 * Performance Monitoring System
 * Similar to Google Analytics, New Relic (used by Netflix, Airbnb)
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.marks = {};
    }

    /**
     * Mark a performance point
     */
    mark(name) {
        this.marks[name] = performance.now();
    }

    /**
     * Measure time between two marks
     */
    measure(name, startMark, endMark = null) {
        const start = this.marks[startMark];
        const end = endMark ? this.marks[endMark] : performance.now();
        
        if (!start) {
            console.warn(`Start mark "${startMark}" not found`);
            return null;
        }

        const duration = end - start;
        this.metrics[name] = duration;

        if (import.meta.env.DEV) {
            console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    /**
     * Get page load metrics
     */
    getPageLoadMetrics() {
        if (!window.performance || !window.performance.timing) {
            return null;
        }

        const timing = performance.timing;
        const navigation = performance.navigation;

        return {
            // DNS lookup time
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            
            // TCP connection time
            tcp: timing.connectEnd - timing.connectStart,
            
            // Time to first byte
            ttfb: timing.responseStart - timing.requestStart,
            
            // Download time
            download: timing.responseEnd - timing.responseStart,
            
            // DOM processing time
            domProcessing: timing.domComplete - timing.domLoading,
            
            // Total page load time
            totalLoad: timing.loadEventEnd - timing.navigationStart,
            
            // DOM ready time
            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
            
            // Navigation type
            navigationType: navigation.type === 0 ? 'navigate' : 
                           navigation.type === 1 ? 'reload' : 
                           navigation.type === 2 ? 'back_forward' : 'unknown'
        };
    }

    /**
     * Get Core Web Vitals (Google's metrics)
     */
    getCoreWebVitals() {
        return new Promise((resolve) => {
            const vitals = {};

            // Largest Contentful Paint (LCP)
            if ('PerformanceObserver' in window) {
                try {
                    const lcpObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
                    });
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch {
                    // LCP not supported
                }

                // First Input Delay (FID)
                try {
                    const fidObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach((entry) => {
                            vitals.fid = entry.processingStart - entry.startTime;
                        });
                    });
                    fidObserver.observe({ entryTypes: ['first-input'] });
                } catch {
                    // FID not supported
                }

                // Cumulative Layout Shift (CLS)
                try {
                    let clsScore = 0;
                    const clsObserver = new PerformanceObserver((list) => {
                        list.getEntries().forEach((entry) => {
                            if (!entry.hadRecentInput) {
                                clsScore += entry.value;
                            }
                        });
                        vitals.cls = clsScore;
                    });
                    clsObserver.observe({ entryTypes: ['layout-shift'] });
                } catch {
                    // CLS not supported
                }
            }

            // Return after 5 seconds
            setTimeout(() => resolve(vitals), 5000);
        });
    }

    /**
     * Track component render time
     */
    trackComponentRender(componentName, renderTime) {
        if (!this.metrics.components) {
            this.metrics.components = {};
        }
        
        if (!this.metrics.components[componentName]) {
            this.metrics.components[componentName] = [];
        }
        
        this.metrics.components[componentName].push(renderTime);
        
        // Keep only last 10 renders
        if (this.metrics.components[componentName].length > 10) {
            this.metrics.components[componentName].shift();
        }
    }

    /**
     * Get average render time for a component
     */
    getAverageRenderTime(componentName) {
        const renders = this.metrics.components?.[componentName];
        if (!renders || renders.length === 0) return 0;
        
        const sum = renders.reduce((a, b) => a + b, 0);
        return sum / renders.length;
    }

    /**
     * Log all metrics
     */
    logMetrics() {
        console.group('📊 Performance Metrics');
        console.table(this.metrics);
        console.groupEnd();
    }

    /**
     * Send metrics to analytics
     */
    async sendMetrics(endpoint) {
        if (!endpoint) return;

        try {
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metrics: this.metrics,
                    pageLoad: this.getPageLoadMetrics(),
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            });
        } catch {
            // Silently fail
        }
    }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for tracking component performance
 */
export const usePerformanceTracking = (componentName) => {
    const startTime = performance.now();
    
    return () => {
        const renderTime = performance.now() - startTime;
        performanceMonitor.trackComponentRender(componentName, renderTime);
    };
};
