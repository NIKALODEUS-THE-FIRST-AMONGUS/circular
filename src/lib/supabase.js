import { createClient } from '@supabase/supabase-js'
import { mockSupabase, isMockMode as checkEnvMock } from './mockAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let useMock = checkEnvMock();

export const setMockMode = (enabled) => {
    useMock = enabled;
    if (enabled && import.meta.env.DEV) {
        console.warn('🎭 Adaptive Network: Switched to MOCK mode');
    }
};

const realSupabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Proxy to dynamically switch between real and mock
export const supabase = new Proxy({}, {
    get: (target, prop) => {
        const client = useMock ? mockSupabase : (realSupabase || mockSupabase);
        return client[prop];
    }
});

export const isMockMode = () => useMock;
