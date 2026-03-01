import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to simulate progress for asynchronous tasks.
 * Starts at 0, incrementally reaches ~90%, and jumps to 100% when finished.
 */
export const useSimulatedProgress = (active = false, options = {}) => {
    const {
        startDelay = 0,
        slowdownPoint = 85,
        interval = 200,
        increment = 2
    } = options;

    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const timerRef = useRef(null);

    const reset = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(0);
        setIsComplete(false);
    }, []); // Empty deps - this function doesn't depend on anything

    const complete = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setIsComplete(true);
    }, []); // Empty deps

    useEffect(() => {
        if (!active) {
            // Use setTimeout to avoid synchronous setState in effect
            const timer = setTimeout(() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setProgress(0);
                setIsComplete(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        const startTimer = setTimeout(() => {
            timerRef.current = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timerRef.current);
                        return 100;
                    }

                    // Progressive slowdown
                    let nextIncrement = increment;
                    if (prev > slowdownPoint) {
                        nextIncrement = Math.max(0.2, (100 - prev) / 20);
                    } else if (prev > slowdownPoint / 2) {
                        nextIncrement = increment / 2;
                    }

                    const next = prev + nextIncrement;
                    return next >= 99 ? 99 : next; // Cap at 99 until complete() is called
                });
            }, interval);
        }, startDelay);

        return () => {
            clearTimeout(startTimer);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [active, increment, interval, slowdownPoint, startDelay]);

    return {
        progress,
        isComplete,
        complete,
        reset,
        displayProgress: Math.floor(progress)
    };
};
