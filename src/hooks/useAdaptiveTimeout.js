import { useNetwork } from '../context/NetworkContext';

/**
 * Returns optimal timeout durations based on current network strength.
 * Scales from aggressive (fast network) to patient (slow network).
 */
export const useAdaptiveTimeout = () => {
    const { effectiveType } = useNetwork();

    const getTimeout = (baseMs = 5000) => {
        switch (effectiveType) {
            case '4g':
                return baseMs; // 5s base
            case '3g':
                return baseMs * 3; // 15s base
            case '2g':
            case 'slow-2g':
                return baseMs * 10; // 50s base
            case 'offline':
                return 1000; // Fail quickly if already offline
            default:
                return baseMs;
        }
    };

    return {
        getTimeout,
        // Common durations pre-calculated
        queryTimeout: getTimeout(8000),      // 8s -> 24s -> 80s
        uploadTimeout: getTimeout(15000),    // 15s -> 45s -> 150s
        authTimeout: getTimeout(10000),      // 10s -> 30s -> 100s
    };
};
