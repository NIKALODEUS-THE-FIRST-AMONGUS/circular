import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotify } from '../components/Toaster';
import { createDocument, createProfile, createAuditLog } from '../lib/firebase-db';
import { auth } from '../lib/firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
    Mail, Zap, Shuffle, Lock, CheckCircle2, AlertCircle,
    Loader2, Eye, EyeOff, QrCode, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddMember = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('student');
    const [dept, setDept] = useState('');
    const [year, setYear] = useState('');
    const [section, setSection] = useState('');
    const [loading, setLoading] = useState(false);
    const [provisionMode, setProvisionMode] = useState('invite');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);

    const nextStep = () => setActiveStep(p => Math.min(p + 1, 2));
    const prevStep = () => setActiveStep(p => Math.max(p - 1, 0));
    
    const resetForm = () => {
        setEmail('');
        setPassword('');
        setDept('');
        setYear('');
        setSection('');
        setActiveStep(0);
        setIsSuccess(false);
        setGeneratedCredentials(null);
    };

    useEffect(() => {
        let active = true;
        const validate = async () => {
            if (!email) {
                setEmailError('');
                setIsValidating(false);
                return;
            }
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regex.test(email)) {
                setEmailError('Invalid email format');
                setIsValidating(false);
                return;
            }

            setEmailError('');
            setIsValidating(true);
            await new Promise(r => setTimeout(r, 300));

            if (active) {
                setEmailError('');
                setIsValidating(false);
            }
        };
        validate();
        return () => { active = false; };
    }, [email]);

    const handleGenerateTestId = () => {
        const random = Math.floor(1000 + Math.random() * 9000);
        setEmail(`test.user.${random}@internal.test`);
        setProvisionMode('instant');
        setPassword('TestPass123!');
        notify("Generated Internal Test ID", "info");
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (emailError && !email.includes('.test')) return;
        setLoading(true);
        try {
            if (provisionMode === 'instant') {
                // Create user with Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email.toLowerCase(),
                    password
                );

                if (!userCredential?.user?.uid) {
                    throw new Error('Failed to create user account');
                }

                // Create profile in Firestore
                await createProfile(userCredential.user.uid, {
                    email: email.toLowerCase(),
                    full_name: email.split('@')[0],
                    role: role,
                    department: dept,
                    year_of_study: year,
                    section: section,
                    status: 'active'
                });

                setGeneratedCredentials({ email, password });
                setShowQr(true);
                notify(`Identity Created: ${email} is now Active`, 'success');
            } else {
                // Create pre-approval invitation
                await createDocument('profile_pre_approvals', {
                    email: email.toLowerCase(),
                    role,
                    department: dept,
                    year_of_study: year,
                    section: section
                });

                notify(`Successfully provisioned access for ${email}`, 'success');
            }

            await createAuditLog({
                action: provisionMode === 'instant' ? 'instant_create' : 'provision_member',
                details: { target: email, role, dept, mode: provisionMode }
            });

            setIsSuccess(true);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                notify('This email is already registered. Use Invite Mode instead.', 'error');
            } else {
                notify(err.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
            <header className="space-y-6">
                <button
                    onClick={() => navigate('/dashboard/manage-users')}
                    className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors group"
                    aria-label="Back to member directory"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Back to Directory</span>
                </button>

                <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-bg-light to-surface-light border border-border-light shadow-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
                            <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.25em]">
                                Member Provisioning
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-text-main tracking-tighter leading-none">
                            Add New Member<span className="text-primary">.</span>
                        </h1>
                        <p className="text-text-muted font-semibold text-base max-w-2xl">
                            Create instant accounts or send invitation links to new members.
                        </p>
                    </motion.div>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <section className="bg-bg-light rounded-[40px] border border-border-light p-10 shadow-md">
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-16 text-center space-y-6"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12 }}
                                    className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center"
                                >
                                    <CheckCircle2 size={48} />
                                </motion.div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-text-main">Member Created Successfully</h2>
                                    <p className="text-text-muted font-medium">The member has been added to your workspace.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={resetForm}
                                        className="px-8 py-4 bg-primary text-white rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] hover:bg-primary/90 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    >
                                        Add Another Member
                                    </button>
                                    <button
                                        onClick={() => navigate('/dashboard/manage-users')}
                                        className="px-8 py-4 bg-surface-light text-text-main rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] hover:bg-border-light transition-all focus:outline-none focus:ring-2 focus:ring-text-main focus:ring-offset-2"
                                    >
                                        View Directory
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={`step-${activeStep}`} 
                                initial={{ opacity: 0, x: 20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: -20 }} 
                                className="space-y-8"
                            >
                                {/* Progress Indicator */}
                                <div className="flex gap-2 mb-8">
                                    {[0, 1, 2].map(s => (
                                        <div 
                                            key={s} 
                                            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                                                s <= activeStep ? 'bg-primary' : 'bg-border-light'
                                            }`} 
                                        />
                                    ))}
                                </div>

                                {activeStep === 0 && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                                                <Mail size={22} className="text-primary" />
                                                Step 1: Member Email
                                            </h3>
                                            <p className="text-text-muted text-sm font-medium">Choose provisioning method and enter institutional email.</p>
                                        </div>

                                        <div className="bg-surface-light p-3 rounded-3xl flex gap-2 border border-border-light">
                                            <button
                                                onClick={() => setProvisionMode('invite')}
                                                className={`flex-1 flex flex-col items-center gap-3 py-8 rounded-2xl transition-all ${
                                                    provisionMode === 'invite' 
                                                        ? 'bg-bg-light text-primary shadow-md border-2 border-primary/20' 
                                                        : 'text-text-muted hover:bg-bg-light/50'
                                                }`}
                                            >
                                                <Mail size={28} />
                                                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em]">Invite Link</span>
                                                <span className="text-[10px] text-text-muted px-4 text-center">Send email invitation</span>
                                            </button>
                                            <button
                                                onClick={() => setProvisionMode('instant')}
                                                className={`flex-1 flex flex-col items-center gap-3 py-8 rounded-2xl transition-all ${
                                                    provisionMode === 'instant' 
                                                        ? 'bg-bg-light text-primary shadow-md border-2 border-primary/20' 
                                                        : 'text-text-muted hover:bg-bg-light/50'
                                                }`}
                                            >
                                                <Zap size={28} />
                                                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em]">Instant Account</span>
                                                <span className="text-[10px] text-text-muted px-4 text-center">Create immediately</span>
                                            </button>
                                        </div>

                                        <div className="space-y-4 relative">
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="member@institution.edu"
                                                    className="w-full px-8 py-6 rounded-3xl bg-surface-light border-2 border-border-light focus:border-primary focus:bg-bg-light transition-all outline-none text-lg font-bold"
                                                />
                                                {isValidating && <Loader2 size={24} className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
                                                {email && !isValidating && (
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                        {emailError ? <AlertCircle size={24} className="text-danger" /> : <CheckCircle2 size={24} className="text-success" />}
                                                    </div>
                                                )}
                                            </div>
                                            {emailError && (
                                                <div className="flex flex-col gap-2 px-4">
                                                    <p className="text-xs font-bold text-danger">{emailError}</p>
                                                    <button 
                                                        onClick={handleGenerateTestId} 
                                                        className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                                                    >
                                                        <Zap size={12} /> Use Test ID
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            disabled={!email || !!emailError || isValidating}
                                            onClick={nextStep}
                                            className="w-full py-6 bg-primary text-white rounded-3xl font-extrabold text-[13px] uppercase tracking-[0.15em] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        >
                                            Next: Member Details
                                        </button>
                                    </div>
                                )}

                                {activeStep === 1 && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                                                <Shuffle size={22} className="text-primary" />
                                                Step 2: Member Details
                                            </h3>
                                            <p className="text-text-muted text-sm font-medium">Assign role, department, year, and section.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="px-2 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Role</label>
                                                <select 
                                                    value={role} 
                                                    onChange={(e) => setRole(e.target.value)} 
                                                    className="w-full px-6 py-5 rounded-2xl bg-surface-light border-2 border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold text-[15px] transition-all"
                                                >
                                                    <option value="student">Student User</option>
                                                    <option value="teacher">Faculty Member</option>
                                                    <option value="admin">Department Admin</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="px-2 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Department</label>
                                                <select 
                                                    value={dept} 
                                                    onChange={(e) => setDept(e.target.value)} 
                                                    className="w-full px-6 py-5 rounded-2xl bg-surface-light border-2 border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold text-[15px] transition-all"
                                                >
                                                    <option value="CSE">CSE</option>
                                                    <option value="AIDS">AIDS</option>
                                                    <option value="AIML">AIML</option>
                                                    <option value="ECE">ECE</option>
                                                    <option value="EEE">EEE</option>
                                                    <option value="MECH">MECH</option>
                                                    <option value="CIVIL">CIVIL</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="px-2 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Year</label>
                                                <select 
                                                    value={year} 
                                                    onChange={(e) => setYear(e.target.value)} 
                                                    className="w-full px-6 py-5 rounded-2xl bg-surface-light border-2 border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold text-[15px] transition-all"
                                                >
                                                    <option value="1">1st Year</option>
                                                    <option value="2">2nd Year</option>
                                                    <option value="3">3rd Year</option>
                                                    <option value="4">4th Year</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="px-2 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Section</label>
                                                <select 
                                                    value={section} 
                                                    onChange={(e) => setSection(e.target.value)} 
                                                    className="w-full px-6 py-5 rounded-2xl bg-surface-light border-2 border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold text-[15px] transition-all"
                                                >
                                                    <option value="A">Section A</option>
                                                    <option value="B">Section B</option>
                                                    <option value="C">Section C</option>
                                                    <option value="D">Section D</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <button 
                                                onClick={prevStep} 
                                                className="flex-1 py-6 bg-surface-light text-text-main border-2 border-border-light rounded-3xl font-extrabold text-[13px] uppercase tracking-[0.15em] transition-all hover:bg-bg-light hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                Back
                                            </button>
                                            <button 
                                                onClick={nextStep} 
                                                className="flex-[2] py-6 bg-primary text-white rounded-3xl font-extrabold text-[13px] uppercase tracking-[0.15em] transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                Next: Review
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeStep === 2 && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                                                <Lock size={22} className="text-primary" />
                                                Step 3: Review & Create
                                            </h3>
                                            <p className="text-text-muted text-sm font-medium">Review details and finalize member access.</p>
                                        </div>

                                        <div className="p-8 bg-surface-light rounded-3xl border-2 border-border-light space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-text-muted font-bold text-sm">Email</span>
                                                <span className="text-text-main font-black text-sm break-all ml-4">{email}</span>
                                            </div>
                                            <div className="h-px bg-border-light" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-text-muted font-bold text-sm">Role</span>
                                                <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[11px] font-extrabold uppercase tracking-wider">{role}</span>
                                            </div>
                                            <div className="h-px bg-border-light" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-text-muted font-bold text-sm">Department</span>
                                                <span className="text-text-main font-black text-sm">{dept || 'Not set'}</span>
                                            </div>
                                            {provisionMode === 'instant' && (
                                                <>
                                                    <div className="h-px bg-border-light" />
                                                    <div className="space-y-3 pt-2">
                                                        <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Initial Password</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                placeholder="Enter secure password"
                                                                className="w-full px-6 py-5 rounded-2xl bg-bg-light border-2 border-border-light focus:border-primary outline-none font-bold text-[15px]"
                                                                required
                                                            />
                                                            <button 
                                                                onClick={() => setShowPassword(!showPassword)} 
                                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                                                            >
                                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex gap-4">
                                            <button 
                                                onClick={prevStep} 
                                                className="flex-1 py-6 bg-surface-light text-text-main border-2 border-border-light rounded-3xl font-extrabold text-[13px] uppercase tracking-[0.15em] transition-all hover:bg-bg-light hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleAssign}
                                                disabled={loading || (provisionMode === 'instant' && !password)}
                                                className="flex-[2] py-6 bg-primary text-white rounded-3xl font-extrabold text-[13px] uppercase tracking-[0.15em] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                            >
                                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                                                Create Member
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </motion.div>

            {/* QR Code Modal */}
            <AnimatePresence>
                {showQr && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowQr(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-bg-light rounded-[40px] p-10 max-w-md w-full shadow-2xl space-y-6 text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="mx-auto w-20 h-20 bg-success/10 text-success rounded-2xl flex items-center justify-center">
                                <QrCode size={36} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-text-main">Account Created</h3>
                                <p className="text-sm text-text-muted font-medium">Share these credentials with the member.</p>
                            </div>
                            <div className="p-8 bg-surface-light rounded-3xl border-2 border-border-light space-y-4 text-left">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-text-muted">Email</label>
                                    <p className="text-[14px] font-bold text-text-main break-all">{generatedCredentials?.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-text-muted">Password</label>
                                    <p className="text-[14px] font-bold text-text-main">{generatedCredentials?.password}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQr(false)}
                                className="w-full py-5 bg-primary text-white rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AddMember;
