import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ChevronRight, GraduationCap, Building2, Check } from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { getBrandName, getSlogan } from '../config/branding';
import TricolorAccent from '../components/TricolorAccent';
import IndianFlag from '../components/IndianFlag';

// Multilingual Logo Component with Exact Design
const MultilingualLogo = () => {
    const { language } = useLanguage();
    const brandName = getBrandName(language);
    const parts = brandName.split('X');
    
    return (
        <div className="flex items-center gap-3">
            {/* Logo SVG - Exact match */}
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

    // Dynamic Progress for Onboarding/Login
    const { progress, complete } = useSimulatedProgress(loading, { slowdownPoint: 92 });

    const [emailData, setEmailData] = useState({ email: '', password: '' });

    useEffect(() => {
        if (user && profile) {
            navigate('/dashboard');
        }
        checkBootstrap();
    }, [user, profile, navigate]);

    const checkBootstrap = async () => {
        try {
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true });
            setIsFirstUser(count === 0);
        } catch {
            // console.error("Bootstrap check failed");
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                    skipBrowserRedirect: false,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) {
                throw error;
            }

        } catch (err) {
            setError(`OAuth Error: ${err.message || 'Unknown error'}.`);
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: emailData.email,
                password: emailData.password
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const [formData, setFormData] = useState({
        fullName: user?.user_metadata?.full_name || '',
        title: '',
        role: user?.user_metadata?.role || 'student',
        dept: user?.user_metadata?.department || 'CSE',
        classBranch: '',
        collegeRole: '',
        mobileNumber: '',
        yearOfStudy: '',
        section: '', // Comma separated for multi-select
        accessKey: '',
        bio: '',
        graduationBatch: ''
    });

    const [step, setStep] = useState(1); // Onboarding step

    useEffect(() => {
        if (user && !formData.fullName) {
            setFormData(prev => ({
                ...prev,
                fullName: user.user_metadata?.full_name || '',
                title: user.user_metadata?.title || '',
                role: user.user_metadata?.role || 'student',
                dept: user.user_metadata?.department || 'CSE'
            }));
        }
    }, [user, formData.fullName]);

    const handleSkip = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email || user.user_metadata?.email || '',
                    full_name: user.user_metadata?.full_name || user.email?.split('@')?.[0] || 'User',
                    role: 'student',
                    department: 'ALL',
                    status: 'skipped',
                    daily_intro_enabled: true,
                    greeting_language: 'Mixed',
                    intro_frequency: 'daily'
                }]);

            if (error) throw error;

            await refreshProfile();
            navigate('/dashboard');
        } catch (_err) {
            setError("Identity Skip Failed: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            let finalRole = formData.role;
            let finalStatus = 'pending';
            let finalDept = formData.dept;

            const { data: preApproved } = await supabase
                .from('profile_pre_approvals')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();

            const masterAdminEmail = import.meta.env.VITE_MASTER_ADMIN_EMAIL;

            if (user.email === masterAdminEmail) {
                finalRole = 'admin';
                finalStatus = 'active';
            } else if (preApproved) {
                finalRole = preApproved.role;
                finalStatus = 'active';
                finalDept = preApproved.department || finalDept;
            } else if (formData.accessKey) {
                if (formData.accessKey === import.meta.env.VITE_ADMIN_SECRET_KEY) {
                    finalRole = 'admin';
                    finalStatus = 'active';
                } else if (formData.accessKey === import.meta.env.VITE_TEACHER_SECRET_KEY) {
                    finalRole = 'teacher';
                    finalStatus = 'active';
                } else if (formData.accessKey === import.meta.env.VITE_STUDENT_SECRET_KEY) {
                    finalRole = 'student';
                    finalStatus = 'active';
                } else {
                    throw new Error("Invalid Access Key.");
                }
            } else if (isFirstUser) {
                finalRole = 'admin';
                finalStatus = 'active';
            }

            const { error } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email || user.user_metadata?.email || '',
                    full_name: formData.fullName || 'User',
                    title: formData.title || null,
                    role: finalRole,
                    department: finalDept,
                    class_branch: formData.classBranch,
                    college_role: formData.collegeRole,
                    mobile_number: formData.mobileNumber,
                    year_of_study: formData.yearOfStudy || null,
                    section: formData.section || null,
                    status: finalStatus,
                    bio: formData.bio,
                    designation: formData.role === 'teacher' ? formData.collegeRole : null,
                    graduation_batch: formData.graduationBatch
                }]);

            if (error) {
                console.error('Profile creation error:', error);
                throw error;
            }

            await refreshProfile();
            navigate('/dashboard');
        } catch (err) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            complete();
            setTimeout(() => setLoading(false), 500);
        }
    };

    // --- Onboarding View ---
    if (user && !profile) {
        const roles = [
            { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Access resources' },
            { id: 'teacher', label: 'Faculty', icon: Building2, desc: 'Manage circulars' }
        ];

        const depts = ['CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];

        const toggleSection = (sec) => {
            const current = formData.section ? formData.section.split(', ').filter(s => s) : [];
            let next;
            if (current.includes(sec)) {
                next = current.filter(s => s !== sec);
            } else {
                next = [...current, sec];
            }
            setFormData({ ...formData, section: next.join(', ') });
        };

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-bg-dark relative overflow-hidden font-sans">
                {/* Background Orbs */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="orb w-[600px] h-[600px] bg-primary/20 -top-48 -left-48" />
                    <div className="orb w-[500px] h-[500px] bg-secondary/10 top-1/2 -right-24" />
                </div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full z-10">
                    <div className="glass-card p-1 rounded-[32px] overflow-hidden relative">
                        {loading && (
                            <div className="absolute inset-0 z-50 bg-white/80 dark:bg-bg-surface/80 backdrop-blur-sm flex items-center justify-center rounded-[31px]">
                                <ProgressLoader progress={progress} label="Activating Identity" size="md" />
                            </div>
                        )}
                        <div className="bg-white/95 dark:bg-bg-surface/90 p-8 lg:p-10 rounded-[31px] space-y-8">
                            {/* Progress Bar */}
                            <div className="flex gap-2">
                                <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-primary shadow-glow' : 'bg-border-light'}`} />
                                <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-primary shadow-glow' : 'bg-border-light'}`} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black">Identity <span className="text-primary">Genesis</span></h3>
                                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">Step {step} of 2 • Authentication Node</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => supabase.auth.signOut()} className="h-8 px-4 rounded-xl border border-border-light text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-danger hover:border-danger transition-colors">Sign Out</button>
                                    <button onClick={handleSkip} className="h-8 px-4 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Skip</button>
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold">
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={e => e.preventDefault()} className="space-y-8">
                                <AnimatePresence mode="wait">
                                    {step === 1 ? (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Title (Optional)</label>
                                                <select
                                                    id="title"
                                                    name="title"
                                                    className="input-modern"
                                                    value={formData.title || ''}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                >
                                                    <option value="">Select Title</option>
                                                    <option value="Mr">Mr</option>
                                                    <option value="Mrs">Mrs</option>
                                                    <option value="Ms">Ms</option>
                                                    <option value="Dr">Dr</option>
                                                    <option value="Prof">Prof</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Identity Name</label>
                                                    <input
                                                        required
                                                        id="fullName"
                                                        name="fullName"
                                                        className="input-modern"
                                                        placeholder="Full Name"
                                                        value={formData.fullName}
                                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Status Bio</label>
                                                    <input
                                                        id="bio"
                                                        name="bio"
                                                        placeholder="e.g. Innovator"
                                                        className="input-modern"
                                                        value={formData.bio}
                                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Functional Role</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {roles.map((r) => (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, role: r.id })}
                                                            className={`p-5 rounded-[24px] border transition-all text-left flex items-start gap-4 ${formData.role === r.id ? 'bg-primary/5 border-primary shadow-glow' : 'bg-white/5 border-border-light'}`}
                                                        >
                                                            <div className={`p-2 rounded-xl ${formData.role === r.id ? 'bg-primary text-white' : 'bg-white/10 text-text-muted'}`}>
                                                                <r.icon size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black">{r.label}</p>
                                                                <p className="text-[11px] text-text-muted font-medium">{r.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => formData.fullName && formData.role && setStep(2)}
                                                className="btn-primary w-full"
                                            >
                                                Next Phase <ArrowRight size={18} />
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                            className="space-y-6"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Institutional Hub</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {depts.map((dept) => (
                                                            <button
                                                                key={dept}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, dept: dept })}
                                                                className={`h-10 rounded-xl text-[10px] font-black border transition-all ${formData.dept === dept ? 'bg-primary border-primary text-white shadow-glow' : 'bg-white/5 border-border-light text-text-muted'}`}
                                                            >
                                                                {dept}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">
                                                        {formData.role === 'teacher' ? 'Official Designation' : 'Registration Batch'}
                                                    </label>
                                                    <input
                                                        placeholder={formData.role === 'teacher' ? "Asst. Professor" : "2022-26"}
                                                        className="input-modern"
                                                        value={formData.role === 'teacher' ? formData.collegeRole : formData.graduationBatch}
                                                        onChange={e => setFormData({ ...formData, [formData.role === 'teacher' ? 'collegeRole' : 'graduationBatch']: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-text-muted ml-2">Assigned Sector</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {['A', 'B'].map(sec => {
                                                            const isSelected = formData.section?.split(', ').includes(sec);
                                                            return (
                                                                <button
                                                                    key={sec}
                                                                    type="button"
                                                                    onClick={() => toggleSection(sec)}
                                                                    className={`h-12 rounded-2xl text-[11px] font-black border transition-all flex items-center justify-center gap-2 ${isSelected ? 'bg-primary text-white border-primary shadow-glow' : 'bg-white/5 border-border-light text-text-muted'}`}
                                                                >
                                                                    Sect. {sec}
                                                                    {isSelected && <Check size={14} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary ml-2">Clearance Key</label>
                                                    <input
                                                        type="password"
                                                        placeholder="Access Key"
                                                        className="w-full h-12 px-5 bg-secondary/5 border border-secondary/20 rounded-2xl focus:border-secondary focus:ring-4 focus:ring-secondary/10 outline-none transition-all font-medium"
                                                        value={formData.accessKey}
                                                        onChange={e => setFormData({ ...formData, accessKey: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setStep(1)}
                                                    className="w-14 h-14 rounded-2xl border border-border-light flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-all"
                                                >
                                                    <ChevronRight className="rotate-180" size={24} />
                                                </button>
                                                <button
                                                    onClick={handleProfileSubmit}
                                                    disabled={loading}
                                                    className="btn-primary flex-1 disabled:opacity-50"
                                                >
                                                    {loading ? "Activating..." : "Initialize Identity"}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
            {/* Left Side: Branding & Info */}
            <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full md:w-3/5 bg-[#0A1F3C] text-white p-6 sm:p-8 md:p-16 flex flex-col justify-center relative overflow-hidden min-h-[40vh] md:min-h-screen"
            >
                {/* Grid Texture Background */}
                <div 
                    className="absolute inset-0 opacity-30" 
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />

                <div className="relative z-10">
                    {/* Tricolor Accent at Top */}
                    <div className="absolute top-0 left-0 right-0 -mt-8 md:-mt-16">
                        <TricolorAccent orientation="horizontal" thickness="thin" />
                    </div>

                    {/* Logo */}
                    <div className="mb-6 md:mb-12">
                        <MultilingualLogo />
                    </div>
                    
                    {/* Headline */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 md:mb-6">
                        Streamlined <br />
                        <span className="text-[#FF9933]">Institutional</span> <br />
                        Communication
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-lg mb-6 md:mb-8">
                        {getSlogan(language)} The secure, authoritative platform for digital circulars
                    </p>

                    {/* Tricolor Bar */}
                    <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808] rounded-full mb-6 md:mb-12" />

                    <div className="text-xs sm:text-sm text-gray-500 font-medium tracking-widest uppercase">
                        Official Governance Portal
                    </div>

                    {/* Indian Flag at Bottom */}
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
                        className="w-full flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-4 sm:mb-6 active:scale-[0.98]"
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

            {/* Footer with Tricolor */}
            <div className="absolute bottom-0 left-0 right-0">
                <TricolorAccent orientation="horizontal" thickness="thin" />
            </div>
        </div>
    );
};

export default LandingPage;
