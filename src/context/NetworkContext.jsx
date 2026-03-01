/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

import { checkSupabaseConnectivity } from '../lib/connectivity';
import { setMockMode } from '../lib/supabase';

const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
    const [isOffline, setIsOffline] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkConnectivity = async () => {
            // Check if user explicitly wants mock mode
            const explicitMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

            if (explicitMock) {
                console.warn('🎭 Explicit Mock Mode enabled via .env');
                setMockMode(true);
                setIsOffline(true);
                setIsChecking(false);
                return;
            }

            const isAvailable = await checkSupabaseConnectivity();

            if (!isAvailable) {
                console.warn('⚠️ Supabase unreachable or timed out. Enabling Adaptive Mock Mode for stability.');
                setMockMode(true);
                setIsOffline(true);
            } else {
                setMockMode(false);
                setIsOffline(false);
            }
            setIsChecking(false);
        };

        checkConnectivity();
    }, []);

    const value = {
        isOffline,
        isChecking,
        isMockMode: isOffline // Alias for clarity
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};
