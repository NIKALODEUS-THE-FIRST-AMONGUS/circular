import { mockSupabase, isMockMode as checkEnvMock } from './mockAuth'
import { createProxiedSupabaseClient } from './supabaseProxy'

let useMock = checkEnvMock();

export const setMockMode = (enabled) => {
    useMock = enabled;
    if (enabled && import.meta.env.DEV) {
        console.warn('🎭 Adaptive Network: Switched to MOCK mode');
    }
};

// Create real Supabase client with proxy support for mobile
const realSupabase = createProxiedSupabaseClient();

// Proxy to dynamically switch between real and mock
export const supabase = new Proxy({}, {
    get: (target, prop) => {
        const client = useMock ? mockSupabase : (realSupabase || mockSupabase);
        return client[prop];
    }
});

export const isMockMode = () => useMock;
