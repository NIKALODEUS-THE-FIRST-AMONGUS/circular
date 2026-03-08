import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user is on a mobile device
 * Returns true if screen width is less than 768px (Tailwind's md breakpoint)
 */
export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if window is defined (for SSR compatibility)
        if (typeof window === 'undefined') return;

        // Function to check screen size
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check on mount
        checkMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

export default useIsMobile;
