import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle } from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { getBrandName, getSlogan } from '../config/branding';
import TricolorAccent from '../components/TricolorAccent';
import IndianFlag from '../components/IndianFlag';
import { signInWithGoogle, signInWithEmail } from '../context/FirebaseAuthContext';
import { doc, setDoc, getDoc, query, collection, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase-config';

// Multilingual Logo Component
const MultilingualLogo = () => {
    const { language } = useLanguage();
    const brandName = getBrandName(language);
    const parts = brandName.split('X');
    
    return (
        <div className="flex items-center gap-3">
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 25L75 75" stroke="#FF9933" strokeWidth="12" strokeLinecap="round"/>
                <path d="M25 75L75 25" stroke="#138808" strokeWidth="12" strokeLinecap="round"/>
                <rect x="45" y="40" width="10" height="20" transform="rotate(45 45 40)" fill="white"/>
            </svg>
            <span className="text-2xl font-bold tracking-tight text-white flex items-center">
                <span>{parts[0]}</span>
                <span className="text-[#FF9933]">X</span>
                <span className="ml-[0.15em]">{parts[1]}</span>
            </span>
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFirstUser, setIsFirstUser] = useState(false);

    const { progress } = useSimulatedProgress(loading, { slowdownPoint: 92 });

    const [emailData, setEmailData] = useState({ email: '', password: '' });
    const [deletionMessage, setDeletionMessage] = useState(() => {
        const message = sessionStorage.getItem('deletion_message');
        if (message) {
            sessionStorage.removeItem('deletion_message');
            return message;
        }
        return null;
    });

    useEffect(() => {
        const checkBootstrap = async () => {
            try {
                const q = query(collection(db, 'profiles'), limit(1));
                const snapshot = await getDocs(q);
                setIsFirstUser(snapshot.empty);
            } catch (err) {
                console.error("Bootstrap check failed:", err);
            }
        };
        checkBootstrap();
    }, []);

    useEffect(() => {
        if (user && profile && profile.status !== 'pending') {
            navigate('/dashboard');
        }
    }, [user, profile, navigate]);

    const handleGoogleLogin = async () => {
        // Prevent multiple clicks
        if (loading) return;
        
        setLoading(true);
        setError(null);

        try {
            const result = await signInWithGoogle();
            const firebaseUser = result.user;

            // Check if profile exists
            const profileRef = doc(db, 'profiles', firebaseUser.uid);
            const profileSnap = await getDoc(profileRef);

            if (!profileSnap.exists()) {
                // New user - will show onboarding
                console.log('New user, showing onboarding');
            } else {
                // Existing user
                await refreshProfile();
            }
        } catch (err) {
            // Ignore cancelled popup errors (user closed popup or clicked multiple times)
            if (err.code === 'auth/cancelled-popup-request' || 
                err.code === 'auth/popup-closed-by-user') {
                setLoading(false);
                return;
            }
            setError(`Login Error: ${err.message || 'Unknown error'}`);
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            await signInWithEmail(emailData.email, emailData.password);
            await refreshProfile();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Show onboarding if user exists but no profile
    if (user && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-bg-dark">
                <div className="max-w-2xl w-full">
                    <div className="glass-card p-8 rounded-3xl">
                        <h2 className="text-2xl font-black mb-4">Complete Your Profile</h2>
                        <p className="text-text-muted mb-6">Please complete your profile to continue</p>
                        <button
                            onClick={async () => {
                                // Create basic profile
                                const profileData = {
                                    email: user.email,
                                    full_name: user.displayName || user.email?.split('@')[0] || 'User',
                                    role: isFirstUser ? 'admin' : 'student',
                                    department: 'ALL',
                                    status: isFirstUser ? 'active' : 'pending',
                                    created_at: new Date().toISOString(),
                                    daily_intro_enabled: true,
                                    greeting_language: 'Mixed',
                                    intro_frequency: 'daily'
                                };

                                await setDoc(doc(db, 'profiles', user.uid), profileData);
                                await refreshProfile();
                                navigate('/dashboard');
                            }}
                            className="btn-primary w-full"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
            {/* Left Side: Branding */}
            <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full md:w-3/5 bg-[#0A1F3C] text-white p-6 sm:p-8 md:p-16 flex flex-col justify-center relative overflow-hidden min-h-[40vh] md:min-h-screen"
            >
                <div 
                    className="absolute inset-0 opacity-30" 
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />

                <div className="relative z-10">
                    <div className="absolute top-0 left-0 right-0 -mt-8 md:-mt-16">
                        <TricolorAccent orientation="horizontal" thickness="thin" />
                    </div>

                    <div className="mb-6 md:mb-12">
                        <MultilingualLogo />
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 md:mb-6">
                        Streamlined <br />
                        <span className="text-[#FF9933]">Institutional</span> <br />
                        Communication
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-lg mb-6 md:mb-8">
                        {getSlogan(language)} The secure, authoritative platform for digital circulars
                    </p>

                    <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-full mb-6 md:mb-12" />

                    <div className="text-xs sm:text-sm text-gray-500 font-medium tracking-widest uppercase">
                        Official Governance Portal
                    </div>

                    <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 hidden sm:block">
                        <IndianFlag size="sm" />
                    </div>
                </div>
            </motion.div>

            {/* Right Side: Login Form */}
            <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-full md:w-2/5 p-4 sm:p-6 md:p-12 flex flex-col items-center justify-center bg-[#F8FAFC]"
            >
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-100 relative">
                    {deletionMessage && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3"
                        >
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">Account Removed</p>
                                <p className="text-xs">{deletionMessage}</p>
                            </div>
                            <button 
                                onClick={() => setDeletionMessage(null)}
                                className="ml-auto text-red-400 hover:text-red-600"
                            >
                                ×
                            </button>
                        </motion.div>
                    )}
                    
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Institutional Access</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Please enter your credentials to access the dashboard.</p>
                    </div>

                    {loading && !user && (
                        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                            <ProgressLoader progress={progress} label="Securing Access" size="md" />
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-4 sm:mb-6 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <img 
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                            alt="Google" 
                            className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span>Login with Google</span>
                    </button>

                    <div className="relative flex items-center mb-4 sm:mb-6">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-2 sm:mx-4 text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">Or Direct Access</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-5">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Work Email Address
                            </label>
                            <input
                                type="email"
                                autoComplete="email"
                                value={emailData.email}
                                onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                                placeholder="name@university.edu"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#FF9933] focus:border-transparent outline-none transition-all text-gray-800"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Password
                                </label>
                                <a href="#" className="text-[10px] sm:text-xs font-bold text-[#FF9933] hover:underline">
                                    Forgot Password?
                                </a>
                            </div>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={emailData.password}
                                onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#FF9933] focus:border-transparent outline-none transition-all text-gray-800"
                                required
                            />
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF9933] text-white py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
                        >
                            <span>{loading ? "Verifying..." : "Sign In"}</span>
                            {!loading && (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                                </svg>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
                        <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                            End-to-end encrypted secure access
                        </span>
                    </div>
                </div>
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0">
                <TricolorAccent orientation="horizontal" thickness="thin" />
            </div>
        </div>
    );
};

export default LandingPage;
