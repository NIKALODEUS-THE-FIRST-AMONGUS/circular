/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase-config';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(() => {
        const cached = localStorage.getItem('user_profile');
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);
    const [error] = useState(null);

    const { progress, complete } = useSimulatedProgress(loading && !profile, { slowdownPoint: 92 });

    useEffect(() => {
        let mounted = true;
        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!mounted) return;

            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch profile from Firestore
                const profileRef = doc(db, 'profiles', firebaseUser.uid);
                
                // Set up real-time listener
                unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                    if (!mounted) return;

                    if (docSnap.exists()) {
                        const profileData = docSnap.data();
                        
                        // Handle status changes
                        if (profileData.status === 'suspended') {
                            firebaseSignOut(auth);
                            localStorage.clear();
                            window.location.href = '/';
                            return;
                        }

                        setProfile(profileData);
                        localStorage.setItem('user_profile', JSON.stringify(profileData));
                    } else {
                        // Profile doesn't exist yet (new user)
                        setProfile(null);
                    }
                    
                    complete();
                    setLoading(false);
                });
            } else {
                localStorage.removeItem('user_profile');
                setProfile(null);
                complete();
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, [complete]);

    const refreshProfile = async () => {
        if (!user) return;
        
        const profileRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(profileRef);
        
        if (docSnap.exists()) {
            const profileData = docSnap.data();
            setProfile(profileData);
            localStorage.setItem('user_profile', JSON.stringify(profileData));
        }
    };

    const [stats, setStats] = useState({ 
        myPosts: 0, 
        membersManaged: 0, 
        totalViews: 0,
        totalUsers: 0,
        pendingApprovals: 0,
        todayCount: 0
    });

    useEffect(() => {
        // Only start listeners when the user is fully active — pending users will hit
        // permission-denied errors because Firestore rules require status === 'active'.
        if (!user || profile?.status !== 'active') return;

        const unsubscribes = [];

        // 1. Listen for user's own circulars to count posts and views (Teachers/Admins)
        if (profile?.role === 'teacher' || profile?.role === 'admin') {
            const circularsQuery = query(collection(db, 'circulars'), where('author_id', '==', user.uid));
            const unsubscribeStats = onSnapshot(circularsQuery, (snapshot) => {
                let posts = 0;
                let views = 0;
                snapshot.forEach(doc => {
                    posts++;
                    views += (doc.data().view_count || 0);
                });
                setStats(prev => ({ ...prev, myPosts: posts, totalViews: views }));
            });
            unsubscribes.push(unsubscribeStats);

            // Listen for circulars created today (Teachers/Admins)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayQuery = query(collection(db, 'circulars'), where('created_at', '>=', Timestamp.fromDate(today)));
            const unsubscribeToday = onSnapshot(todayQuery, (snapshot) => {
                setStats(prev => ({ ...prev, todayCount: snapshot.size }));
            });
            unsubscribes.push(unsubscribeToday);
        }

        // 2. Listen for total users & pending users (Admins Only)
        // This is where the permission-denied error was coming from for students!
        if (profile?.role === 'admin') {
            const profilesQuery = query(collection(db, 'profiles'));
            const unsubscribeUsers = onSnapshot(profilesQuery, (snapshot) => {
                setStats(prev => ({ ...prev, totalUsers: snapshot.size, membersManaged: snapshot.size }));
            });
            unsubscribes.push(unsubscribeUsers);

            const pendingQuery = query(collection(db, 'profiles'), where('status', '==', 'pending'));
            const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
                setStats(prev => ({ ...prev, pendingApprovals: snapshot.size }));
            });
            unsubscribes.push(unsubscribePending);
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, profile?.status, profile?.role]);

    const value = {
        user,
        profile,
        stats,
        refreshProfile,
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
            try {
                localStorage.clear();
                sessionStorage.clear();
                await firebaseSignOut(auth);
                window.location.href = '/';
            } catch (err) {
                console.error('Sign out error:', err);
                window.location.href = '/';
            }
        }
    };

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
    );
};

// Export helper functions for login
export const signInWithGoogle = async () => {
    return await signInWithPopup(auth, googleProvider);
};

export const signInWithEmail = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};
