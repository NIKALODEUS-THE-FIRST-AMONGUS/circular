/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSimulatedProgress } from '../hooks/useSimulatedProgress'
import ProgressLoader from '../components/ProgressLoader'

export const AuthContext = createContext()

const withTimeout = (promise, ms) =>
    Promise.race([
        promise, 
        new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout after ${ms}ms`)), ms))
    ]);

// Retry helper for database queries
const retryWithBackoff = async (fn, maxRetries = 2, initialDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = initialDelay * Math.pow(2, i);
            // Silent retry - no logging
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(() => {
        // Init from cache for instant feel
        const cached = localStorage.getItem('user_profile')
        return cached ? JSON.parse(cached) : null
    })
    const [loading, setLoading] = useState(true)
    const [error] = useState(null)

    // Dynamic Progress
    const { progress, complete } = useSimulatedProgress(loading && !profile, { slowdownPoint: 92 });

    useEffect(() => {
        let mounted = true;
        let isFetching = false; // Prevent duplicate fetches
        
        const initAuth = async () => {
            if (isFetching) return; // Already fetching
            isFetching = true;

            try {
                const { data: { session } } = await withTimeout(supabase.auth.getSession(), 60000)
                
                if (!mounted) return;
                
                const currentUser = session?.user ?? null
                setUser(currentUser)

                if (currentUser) {
                    // Check if we have cached profile first
                    const cached = localStorage.getItem('user_profile');
                    if (cached) {
                        try {
                            const cachedProfile = JSON.parse(cached);
                            setProfile(cachedProfile);
                            // Fetch fresh data in background
                            fetchProfile(currentUser.id);
                        } catch {
                            // Invalid cache, fetch fresh
                            await fetchProfile(currentUser.id);
                        }
                    } else {
                        await fetchProfile(currentUser.id);
                    }
                } else {
                    localStorage.removeItem('user_profile')
                    setProfile(null)
                }
            } catch (err) {
                console.error('Auth Init Error:', {
                    message: err?.message || 'Unknown error',
                    code: err?.code,
                    details: err?.details,
                    hint: err?.hint,
                    error: err
                });
            } finally {
                if (mounted) {
                    complete();
                    const hasAuthHash = window.location.hash.includes('access_token');

                    if (hasAuthHash) {
                        setTimeout(() => mounted && setLoading(false), 1000);
                    } else {
                        setTimeout(() => mounted && setLoading(false), 500);
                    }
                }
                isFetching = false;
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await fetchProfile(currentUser.id)
            } else {
                localStorage.removeItem('user_profile')
                setProfile(null)
                setLoading(false)
            }

            if (event === 'SIGNED_OUT') {
                localStorage.clear()
                window.location.href = '/'
            }
        })

        // Real-time subscription for profile changes
        let profileChannel = null;
        if (user?.id) {
            profileChannel = supabase
                .channel(`profile_${user.id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                }, (payload) => {
                    if (!mounted) return;
                    const updatedProfile = payload.new;
                    
                    // If status changed to active, refresh profile
                    if (updatedProfile.status === 'active' && profile?.status === 'pending') {
                        fetchProfile(user.id, true);
                        // Reload page to show dashboard
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else if (updatedProfile.status === 'suspended') {
                        // Sign out if suspended
                        supabase.auth.signOut();
                        localStorage.clear();
                        window.location.href = '/';
                    } else {
                        // Update profile for other changes
                        setProfile(updatedProfile);
                        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
                    }
                })
                .subscribe();
        }

        return () => {
            mounted = false;
            subscription.unsubscribe();
            if (profileChannel) {
                supabase.removeChannel(profileChannel);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complete, user?.id])

    const fetchProfile = async (uid, forceRefresh = false) => {
        // Check if we're already fetching to prevent duplicates (unless force refresh)
        if (!forceRefresh && fetchProfile.isLoading) {
            return fetchProfile.promise;
        }

        fetchProfile.isLoading = true;
        fetchProfile.promise = (async () => {
            try {
                const result = await retryWithBackoff(async () => {
                    return await withTimeout(
                        supabase
                            .from('profiles')
                            .select('id, email, role, department, status, full_name, class_branch, college_role, mobile_number, year_of_study, section, avatar_url, theme_preference, greeting_language, daily_intro_enabled, intro_frequency')
                            .eq('id', uid)
                            .maybeSingle(),
                        15000 // Reduced to 15 seconds per attempt
                    );
                }, 2, 2000); // 2 retries with 2s initial delay

                const { data, error } = result;

                if (error) throw error;

                if (data) {
                    if (data.status === 'suspended') {
                        supabase.auth.signOut()
                        localStorage.clear()
                        throw new Error('Account suspended.')
                    }
                    setProfile(data)
                    localStorage.setItem('user_profile', JSON.stringify(data))
                    return data
                } else {
                    setProfile(null)
                    return null
                }
            } catch (err) {
                // Silent error handling - only log in development
                if (import.meta.env.DEV) {
                    console.error('Profile fetch exception:', {
                        message: err?.message || 'Unknown error',
                        code: err?.code,
                        details: err?.details,
                        hint: err?.hint
                    });
                }
                
                // If database is unreachable and not force refresh, try to use cached profile
                if (!forceRefresh) {
                    const cached = localStorage.getItem('user_profile');
                    if (cached) {
                        if (import.meta.env.DEV) {
                            console.warn('Using cached profile due to database timeout');
                        }
                        const cachedProfile = JSON.parse(cached);
                        setProfile(cachedProfile);
                        return cachedProfile;
                    }
                }
                
                return null
            } finally {
                fetchProfile.isLoading = false;
                fetchProfile.promise = null;
            }
        })();

        return fetchProfile.promise;
    }

    const value = {
        user,
        profile,
        refreshProfile: () => user && fetchProfile(user.id, true), // Force refresh when called manually
        loading,
        setLoading,
        error,
        isAdmin: profile?.role === 'admin',
        isTeacher: profile?.role === 'teacher',
        isStudent: profile?.role === 'student',
        isPending: profile?.status === 'pending',
        isActive: profile?.status === 'active',
        isSkipped: profile?.status === 'skipped',
        signOut: async () => {
            // Optimistic navigation for instant feedback
            const redirect = () => window.location.href = '/';

            try {
                // Clear local state first
                localStorage.clear()
                sessionStorage.clear()
                setUser(null)
                setProfile(null)

                // Trigger supabase sign out in background
                supabase.auth.signOut()
            } catch {
                // Ignore errors
            } finally {
                redirect()
            }
        }
    }

    return (
        <AuthContext.Provider value={value}>
            {error && (
                <div className="fixed inset-0 bg-red-50 flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-red-100">
                        <h2 className="text-xl font-black text-red-600 mb-4">Identity Error</h2>
                        <p className="text-slate-600 font-medium mb-6 text-sm">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}
            {loading && !profile ? (
                <div className="min-h-screen flex flex-col items-center justify-center bg-bg-light gap-8">
                    <ProgressLoader
                        progress={progress}
                        label="Syncing Secure Identity"
                        size="lg"
                    />

                    {/* Emergency recovery if stuck */}
                    <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Connection taking too long?</p>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.href = '/';
                            }}
                            className="bg-surface-light px-6 py-3 border border-border-light rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-border-light transition-all"
                        >
                            Reset System Cache
                        </button>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    )
}
