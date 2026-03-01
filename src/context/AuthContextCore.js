import { createContext } from 'react';

/**
 * Shared Context for Authentication.
 * Separated into its own file to maintain HMR compatibility in Vite.
 */
export const AuthContext = createContext();
