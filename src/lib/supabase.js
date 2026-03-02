/**
 * Supabase compatibility layer
 * This file provides a Supabase-compatible API using Firebase Firestore
 * Allows existing code to work with minimal changes during migration
 */

import { supabase as firestoreSupabase } from './db';

// Export the Firebase-based Supabase-compatible API
export const supabase = firestoreSupabase;

export default supabase;
