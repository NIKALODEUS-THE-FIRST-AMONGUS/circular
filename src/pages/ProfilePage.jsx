import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../components/Toaster';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressLoader from '../components/ProgressLoader';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import {
    UserCircle, GraduationCap, Building2, Check, ChevronRight, ChevronLeft,
    ShieldCheck, Loader2, Save, Star, Layers, Phone, ArrowRight, MapPin,
    Trophy, Camera, Trash2, KeyRound, LogOut, Mail, Calendar, User,
    ChevronDown, AlertTriangle, ShieldAlert, X
} from 'lucide-react';
import CountrySelect from '../components/CountrySelect';

const DEPTS = ['ALL', 'CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];

const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const ProfilePage = () => {
    const { user, profile, refreshProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const notify = useNotify();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1);

    const [formData, setFormData] = useState({
        fullName: '',
        title: '',
        genderTitle: '',
        academicTitle: '',
        subjectTaught: '',
        role: 'student',
        dept: 'CSE',
        classBranch: '',
        yearOfStudy: '1',
        section: 'A',
        collegeRole: '',
        mobileNumber: '',
        whatsappNumber: '',
        bio: '',
        countryCode: '+91',
        avatarUrl: '',
        dailyIntroEnabled: true,
        greetingLanguage: 'Mixed',
        introFrequency: 'daily'
    });

    const [isEditMode, setIsEditMode] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        if (profile) {
            setFormData({
                fullName: profile.full_name || '',
                title: profile.title || '',
                genderTitle: profile.gender_title || '',
                academicTitle: profile.academic_title || '',
                subjectTaught: profile.subject_taught || '',
                role: profile.role || 'student',
                dept: profile.department || 'CSE',
                classBranch: profile.class_branch || '',
                yearOfStudy: profile.year_of_study || '1',
                section: profile.section || 'A',
                collegeRole: profile.college_role || '',
                mobileNumber: profile.mobile_number || '',
                whatsappNumber: profile.whatsapp_number || '',
                bio: profile.bio || '',
                countryCode: profile.country_code || '+91',
                avatarUrl: profile.avatar_url || '',
                dailyIntroEnabled: profile.daily_intro_enabled !== false,
                greetingLanguage: profile.greeting_language || 'Mixed',
                introFrequency: profile.intro_frequency || 'daily',
                whatsappNotificationsEnabled: profile.whatsapp_notifications_enabled !== false
            });
            if (profile.status === 'active') setIsEditMode(true);
        }
    }, [profile]);

    const handleAvatarUpload = async (event) => {
        try {
            setUploading(true);
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            if (!allowedExtensions.includes(fileExt)) throw new Error("Invalid format.");
            if (file.size > 2 * 1024 * 1024) throw new Error("Max 2MB.");

            // Use Cloudinary for avatar uploads (free 25GB, automatic optimization)
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
            
            console.log('Cloudinary config:', { cloudName, uploadPreset });
            
            if (!cloudName || !uploadPreset) {
                throw new Error("Cloudinary not configured. Please check .env file.");
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', 'avatars');

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Cloudinary upload error:', errorData);
                
                // Show helpful error message
                let errorMessage = 'Upload failed. ';
                if (errorData.error?.message) {
                    errorMessage += errorData.error.message;
                    
                    // Add helpful hints based on error
                    if (errorData.error.message.includes('preset')) {
                        errorMessage += '\n\nFix: Go to Cloudinary Console → Settings → Upload → Find "circular_attachments" preset → Set Signing Mode to "Unsigned" → Save';
                    }
                } else {
                    errorMessage += 'Check if upload preset is configured as "unsigned" in Cloudinary settings.';
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            const avatarUrl = data.secure_url;
            
            // Update Firestore database
            const profileRef = doc(db, 'profiles', user.uid);
            await setDoc(profileRef, { 
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            }, { merge: true });

            // Update local state immediately for instant feedback
            setFormData(prev => ({ ...prev, avatarUrl }));
            
            // Force refresh profile from database to update everywhere
            await refreshProfile();
            
            setShowAvatarModal(false);
            notify("☁️ Avatar updated", "success");
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleAvatarDelete = async () => {
        try {
            setUploading(true);
            
            // Update database to remove avatar
            const { error: updateError } = await supabase.from('profiles').update({ 
                avatar_url: null,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);
            if (updateError) throw updateError;

            // Update local state
            setFormData(prev => ({ ...prev, avatarUrl: '' }));
            
            // Small delay to ensure database has committed the change
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Force refresh profile
            await refreshProfile();
            
            setShowAvatarModal(false);
            notify("☁️ Avatar removed", "success");
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    const _handleResetBio = async () => {
        try {
            // Call the SQL function to reset bio
            const { error: _error } = await supabase.rpc('reset_user_bio', {
                user_id: user.id
            });
            
            if (_error) throw _error;
            
            // Update local state
            setFormData(prev => ({ ...prev, bio: '' }));
            
            // Refresh profile
            await refreshProfile();
            
            notify("Bio reset to default", "success");
        } catch {
            // Fallback to direct update if function doesn't exist
            try {
                const { error: updateError } = await supabase.from('profiles').update({
                    bio: null,
                    updated_at: new Date().toISOString()
                }).eq('id', user.id);
                
                if (updateError) throw updateError;
                
                setFormData(prev => ({ ...prev, bio: '' }));
                await refreshProfile();
                notify("Bio reset to default", "success");
            } catch (fallbackError) {
                notify(fallbackError.message, "error");
            }
        }
    };


    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) return notify("Passwords mismatch", "error");
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordData.new });
            if (error) throw error;
            notify("☁️ Security updated", "success");
            setShowPasswordModal(false);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            if (error) throw error;
            await supabase.auth.signOut();
            notify("Account deleted", "success");
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    const handleSubmit = async () => {
        const sanitizedName = stripHtml(formData.fullName).trim();
        if (!sanitizedName) return notify("Name is required", "error");

        const validatePhone = (num) => {
            const clean = num.replace(/\D/g, '');
            return clean.length >= 7 && clean.length <= 15;
        };

        if (formData.mobileNumber && !validatePhone(formData.mobileNumber)) {
            return notify("Please enter a valid mobile number.", "error");
        }

        setLoading(true);
        try {
            const sanitizedBio = stripHtml(formData.bio).trim();
            
            const { error } = await supabase.from('profiles').update({
                full_name: sanitizedName,
                title: formData.title || null,
                gender_title: formData.genderTitle || null,
                academic_title: formData.academicTitle || null,
                subject_taught: formData.role === 'teacher' ? (stripHtml(formData.subjectTaught).trim() || null) : null,
                role: formData.role,
                department: formData.dept,
                year_of_study: formData.role === 'student' ? formData.yearOfStudy : null,
                section: formData.role === 'student' ? formData.section : null,
                class_branch: formData.role === 'student' ? `${formData.yearOfStudy} ${formData.dept} ${formData.section}` : null,
                college_role: formData.role === 'teacher' ? stripHtml(formData.collegeRole).trim() : null,
                mobile_number: stripHtml(formData.mobileNumber).trim(),
                whatsapp_number: stripHtml(formData.whatsappNumber).trim(),
                bio: sanitizedBio || null, // Set to null if empty
                country_code: formData.countryCode,
                daily_intro_enabled: formData.dailyIntroEnabled,
                greeting_language: formData.greetingLanguage,
                intro_frequency: formData.introFrequency,
                status: 'active',
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            if (error) throw error;
            notify("☁️ Changes saved to cloud", "success");
            await refreshProfile();
            setIsEditMode(true);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 1) {
            if (!formData.fullName.trim()) return notify("Enter your name", "error");
        }
        setDirection(1);
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setDirection(-1);
        setCurrentStep(prev => prev - 1);
    };

    const renderStep1 = () => (
        <motion.div key="step1" custom={direction} initial="enter" animate="center" exit="exit" variants={{ enter: _d => ({ x: _d > 0 ? 50 : -50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: _d => ({ x: _d > 0 ? -50 : 50, opacity: 0 }) }} className="space-y-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2" htmlFor="fullName"><UserCircle size={14} />Legal Name</label>
                <input id="fullName" name="fullName" className="w-full h-16 px-6 rounded-3xl bg-bg-light border border-border-light focus:border-primary outline-none font-bold text-lg" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Institutional Position</label>
                <div className="grid grid-cols-2 gap-4">
                    {[{ id: 'student', icon: GraduationCap, label: 'Student' }, { id: 'teacher', icon: Building2, label: 'Professor' }].map(r => (
                        <button key={r.id} onClick={() => setFormData({ ...formData, role: r.id })} className={`p-6 rounded-[32px] border text-left flex flex-col gap-2 ${formData.role === r.id ? 'bg-primary/10 border-primary' : 'bg-bg-light border-border-light'}`}>
                            <r.icon size={24} className={formData.role === r.id ? 'text-primary' : 'text-text-muted'} />
                            <p className="font-black text-sm">{r.label}</p>
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div key="step2" custom={direction} initial="enter" animate="center" exit="exit" variants={{ enter: _d => ({ x: _d > 0 ? 50 : -50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: _d => ({ x: _d > 0 ? -50 : 50, opacity: 0 }) }} className="space-y-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Department Hub</label>
                <div className="grid grid-cols-4 gap-2">
                    {DEPTS.map(dept => (
                        <button key={dept} onClick={() => setFormData({ ...formData, dept: dept })} className={`h-11 rounded-xl font-bold text-[10px] border ${formData.dept === dept ? 'bg-primary text-white' : 'bg-bg-light border-border-light'}`}>{dept}</button>
                    ))}
                </div>
            </div>
            {formData.role === 'student' ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted" htmlFor="yearOfStudy">Year</label>
                        <select id="yearOfStudy" name="yearOfStudy" className="w-full h-12 px-4 rounded-xl border border-border-light bg-bg-light font-bold" value={formData.yearOfStudy} onChange={e => setFormData({ ...formData, yearOfStudy: e.target.value })}>
                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted" htmlFor="section">Section</label>
                        <select id="section" name="section" className="w-full h-12 px-4 rounded-xl border border-border-light bg-bg-light font-bold" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                            {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>
                    </div>
                </div>
            ) : (
                <input placeholder="College Role" className="w-full h-14 px-4 rounded-xl border border-border-light font-bold" value={formData.collegeRole} onChange={e => setFormData({ ...formData, collegeRole: e.target.value })} />
            )}
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div key="step3" custom={direction} initial="enter" animate="center" exit="exit" variants={{ enter: _d => ({ x: _d > 0 ? 50 : -50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: _d => ({ x: _d > 0 ? -50 : 50, opacity: 0 }) }} className="space-y-6">
            <div className="p-8 rounded-[32px] bg-primary/10 border border-primary/20 space-y-4">
                <div className="flex items-center gap-2 text-primary"><ShieldCheck size={20} /><p className="font-black text-xs uppercase">Summary</p></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[9px] font-bold text-text-muted uppercase">Name</p><p className="font-black text-sm">{formData.fullName}</p></div>
                    <div><p className="text-[9px] font-bold text-text-muted uppercase">Dept</p><p className="font-black text-sm">{formData.dept}</p></div>
                </div>
            </div>
            <div className="flex gap-3">
                <CountrySelect value={formData.countryCode} onChange={c => setFormData({ ...formData, countryCode: c })} />
                <input placeholder="Mobile Number" className="flex-1 h-12 px-4 rounded-xl border border-border-light font-bold" type="tel" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} />
            </div>
        </motion.div>
    );

    const renderEditMode = () => (
        <div className="space-y-8">
            <header className="flex items-center justify-between bg-bg-light p-8 rounded-[32px] border border-border-light shadow-sm">
                <div className="flex items-center gap-6">
                    <div 
                        className="relative h-20 w-20 rounded-full border-2 border-primary overflow-hidden bg-surface-light/50 flex items-center justify-center cursor-pointer group"
                        onClick={() => setShowAvatarModal(true)}
                    >
                        {formData.avatarUrl ? (
                            <img 
                                src={formData.avatarUrl} 
                                className="h-full w-full object-cover" 
                                alt="Profile avatar"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<svg class="text-primary" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                                }}
                            />
                        ) : (
                            <UserCircle size={40} className="text-primary" />
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 size={20} className="animate-spin text-white" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">
                            {profile?.academic_title && <span className="font-medium mr-1">{profile.academic_title}.</span>}
                            {profile?.gender_title && <span className="font-medium mr-1">{profile.gender_title}.</span>}
                            {!profile?.academic_title && !profile?.gender_title && profile?.title && <span className="font-medium mr-1">{profile.title}.</span>}
                            {profile?.full_name}
                        </h2>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{profile?.role} • {profile?.department}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPasswordModal(true)} className="h-11 px-6 rounded-xl border border-border-light font-black text-[10px] uppercase hover:bg-surface-light/50 transition-all">Security</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary h-11 px-8 rounded-xl font-bold flex items-center gap-2">
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex gap-1 bg-surface-light/50 p-1 rounded-2xl w-fit border border-border-light shadow-sm">
                {['profile', 'preferences'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-bg-light text-primary shadow-sm' : 'text-text-muted'}`}>
                        {t === 'profile' ? 'Profile' : 'Settings'}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    {activeTab === 'profile' ? (
                        <>
                            {/* Profile Card - Google Style */}
                            <div className="bg-bg-light rounded-3xl border border-border-light overflow-hidden">
                                <div className="p-8 space-y-6">
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Profile Information</h3>
                                    
                                    {/* Title and Name */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-text-muted">Gender Title</label>
                                            <select 
                                                className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all bg-white dark:bg-bg-surface" 
                                                value={formData.genderTitle || ''} 
                                                onChange={e => setFormData({ ...formData, genderTitle: e.target.value })}
                                            >
                                                <option value="">None</option>
                                                <option value="Mr">Mr</option>
                                                <option value="Mrs">Mrs</option>
                                                <option value="Ms">Ms</option>
                                                <option value="Dr">Dr</option>
                                            </select>
                                        </div>
                                        {formData.role === 'teacher' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-muted">Academic Title</label>
                                                <select 
                                                    className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all bg-white dark:bg-bg-surface" 
                                                    value={formData.academicTitle || ''} 
                                                    onChange={e => setFormData({ ...formData, academicTitle: e.target.value })}
                                                >
                                                    <option value="">None</option>
                                                    <option value="Prof">Prof</option>
                                                    <option value="Asst Prof">Asst Prof</option>
                                                    <option value="Assoc Prof">Assoc Prof</option>
                                                    <option value="HOD">HOD</option>
                                                    <option value="Principal">Principal</option>
                                                    <option value="Dean">Dean</option>
                                                </select>
                                            </div>
                                        )}
                                        <div className={`space-y-2 ${formData.role === 'teacher' ? 'md:col-span-3' : 'md:col-span-4'}`}>
                                            <label className="text-xs font-medium text-text-muted">Full Name</label>
                                            <input 
                                                className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                value={formData.fullName} 
                                                onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    {/* Subject Taught - Only for Teachers */}
                                    {formData.role === 'teacher' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-text-muted">Subject Taught</label>
                                            <input 
                                                className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                value={formData.subjectTaught} 
                                                onChange={e => setFormData({ ...formData, subjectTaught: e.target.value })} 
                                                placeholder="e.g., Computer Science, Mathematics, Physics"
                                            />
                                        </div>
                                    )}

                                    {/* Bio */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-text-muted">Bio (Optional)</label>
                                            {formData.bio && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, bio: '' })}
                                                    className="text-xs font-semibold text-danger hover:text-danger/80 transition-colors flex items-center gap-1"
                                                >
                                                    <X size={12} />
                                                    Clear Bio
                                                </button>
                                            )}
                                        </div>
                                        <textarea 
                                            className="w-full h-24 px-4 py-3 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none" 
                                            value={formData.bio} 
                                            onChange={e => setFormData({ ...formData, bio: e.target.value })} 
                                            placeholder="Tell us about yourself..."
                                            maxLength={200}
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-text-muted">Share a brief description about yourself</p>
                                            <p className="text-xs text-text-muted font-semibold">{formData.bio?.length || 0}/200</p>
                                        </div>
                                    </div>

                                    {/* Department */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-muted">Department</label>
                                        <select 
                                            className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                            value={formData.dept} 
                                            onChange={e => setFormData({ ...formData, dept: e.target.value })}
                                        >
                                            {DEPTS.filter(dept => dept !== 'ALL').map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                        </select>
                                    </div>

                                    {/* Year and Section - Only for Students */}
                                    {formData.role === 'student' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-muted">Year</label>
                                                <select 
                                                    className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                    value={formData.yearOfStudy} 
                                                    onChange={e => setFormData({ ...formData, yearOfStudy: e.target.value })}
                                                >
                                                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-muted">Section</label>
                                                <select 
                                                    className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                    value={formData.section} 
                                                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                                                >
                                                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Settings - WhatsApp & Preferences */}
                            <div className="bg-bg-light rounded-3xl border border-border-light overflow-hidden">
                                <div className="p-8 space-y-6">
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Contact Settings</h3>
                                    
                                    {/* WhatsApp Number */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-muted">WhatsApp Number</label>
                                        <div className="flex gap-3">
                                            <CountrySelect value={formData.countryCode} onChange={c => setFormData({ ...formData, countryCode: c })} />
                                            <input 
                                                placeholder="WhatsApp Number" 
                                                className="flex-1 h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                type="tel" 
                                                value={formData.whatsappNumber} 
                                                onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} 
                                            />
                                        </div>
                                        <p className="text-xs text-text-muted">Used for circular notifications and updates</p>
                                    </div>
                                </div>
                            </div>

                            {/* Theme Preference */}
                            <div className="bg-bg-light rounded-3xl border border-border-light overflow-hidden">
                                <div className="p-8 space-y-6">
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Appearance</h3>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { value: 'light', label: 'Light', icon: '☀️' },
                                            { value: 'dark', label: 'Dark', icon: '🌙' },
                                            { value: 'system', label: 'System', icon: '💻' }
                                        ].map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setTheme(t.value)}
                                                className={`h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                                                    theme === t.value 
                                                        ? 'bg-primary/5 border-primary text-primary' 
                                                        : 'bg-bg-light border-border-light text-text-muted hover:border-primary/40'
                                                }`}
                                            >
                                                <span className="text-2xl">{t.icon}</span>
                                                <span className="text-xs font-semibold">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Language Preference */}
                            <div className="bg-bg-light rounded-3xl border border-border-light overflow-hidden">
                                <div className="p-8 space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Language / भाषा</h3>
                                        <p className="text-xs text-text-muted mt-2">Changes app name and slogan display</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-muted">Select Language</label>
                                        <select 
                                            className="w-full h-14 px-4 rounded-xl border border-border-light font-medium text-base focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                            value={language} 
                                            onChange={e => setLanguage(e.target.value)}
                                        >
                                            <option value="en">English - SuchnaX Link</option>
                                            <option value="hi">हिन्दी - सूचनाX लिंक</option>
                                            <option value="te">తెలుగు - సూచనాX లింక్</option>
                                            <option value="ta">தமிழ் - சூச்சனாX லிங்க்</option>
                                            <option value="kn">ಕನ್ನಡ - ಸೂಚನಾX ಲಿಂಕ್</option>
                                        </select>
                                        <p className="text-xs text-text-muted mt-2">
                                            The brand name and slogan will automatically update throughout the app
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Apple Intro Preferences */}
                            <div className="bg-bg-light rounded-3xl border border-border-light overflow-hidden">
                                <div className="p-8 space-y-6">
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Welcome Animation</h3>
                                    
                                    {/* Enable/Disable Toggle */}
                                    <div 
                                        onClick={() => setFormData(f => ({ ...f, dailyIntroEnabled: !f.dailyIntroEnabled }))} 
                                        className="flex items-center justify-between p-5 rounded-2xl border border-border-light cursor-pointer hover:border-primary/40 transition-all"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-text-main">Show Welcome Screen</p>
                                            <p className="text-xs text-text-muted mt-1">Apple-style greeting animation on login</p>
                                        </div>
                                        <div className={`h-8 w-14 rounded-full p-1 transition-all ${formData.dailyIntroEnabled ? 'bg-primary' : 'bg-border-light'}`}>
                                            <div className={`h-6 w-6 bg-white rounded-full transition-all shadow-sm ${formData.dailyIntroEnabled ? 'translate-x-6' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Frequency and Language */}
                                    {formData.dailyIntroEnabled && (
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-muted">Frequency</label>
                                                <select 
                                                    className="w-full h-12 px-4 rounded-xl border border-border-light font-medium text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                    value={formData.introFrequency} 
                                                    onChange={e => setFormData({ ...formData, introFrequency: e.target.value })}
                                                >
                                                    <option value="daily">Once Daily</option>
                                                    <option value="always">Every Login</option>
                                                    <option value="never">Never Show</option>
                                                </select>
                                                <p className="text-[10px] text-text-muted">
                                                    {formData.introFrequency === 'daily' && 'Shows once per day'}
                                                    {formData.introFrequency === 'always' && 'Shows on every login'}
                                                    {formData.introFrequency === 'never' && 'Animation disabled'}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-text-muted">Language</label>
                                                <select 
                                                    className="w-full h-12 px-4 rounded-xl border border-border-light font-medium text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all" 
                                                    value={formData.greetingLanguage} 
                                                    onChange={e => setFormData({ ...formData, greetingLanguage: e.target.value })}
                                                >
                                                    <optgroup label="Popular">
                                                        <option value="Mixed">Mixed (Multiple)</option>
                                                    </optgroup>
                                                    <optgroup label="International">
                                                        <option value="English">English</option>
                                                        <option value="Spanish">Spanish</option>
                                                        <option value="French">French</option>
                                                        <option value="German">German</option>
                                                        <option value="Chinese">Chinese</option>
                                                        <option value="Japanese">Japanese</option>
                                                        <option value="Arabic">Arabic</option>
                                                        <option value="Russian">Russian</option>
                                                        <option value="Portuguese">Portuguese</option>
                                                        <option value="Italian">Italian</option>
                                                        <option value="Korean">Korean</option>
                                                    </optgroup>
                                                    <optgroup label="Indian Languages">
                                                        <option value="Hindi">Hindi</option>
                                                        <option value="Telugu">Telugu</option>
                                                        <option value="Tamil">Tamil</option>
                                                        <option value="Bengali">Bengali</option>
                                                        <option value="Marathi">Marathi</option>
                                                        <option value="Gujarati">Gujarati</option>
                                                        <option value="Kannada">Kannada</option>
                                                        <option value="Malayalam">Malayalam</option>
                                                        <option value="Punjabi">Punjabi</option>
                                                    </optgroup>
                                                    <optgroup label="With English">
                                                        <option value="English+Hindi">English + Hindi</option>
                                                        <option value="English+Telugu">English + Telugu</option>
                                                        <option value="English+Tamil">English + Tamil</option>
                                                        <option value="English+Spanish">English + Spanish</option>
                                                        <option value="English+French">English + French</option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-danger/5 rounded-3xl border-2 border-danger/20 overflow-hidden">
                                <div className="p-8 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-danger" />
                                        <h3 className="text-sm font-bold text-danger uppercase tracking-wider">Danger Zone</h3>
                                    </div>
                                    <p className="text-sm text-text-muted">Once you delete your account, there is no going back. All your data will be permanently removed.</p>
                                    <button 
                                        onClick={() => setShowDeleteModal(true)} 
                                        className="w-full h-12 border-2 border-danger text-danger font-semibold rounded-xl text-sm hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete My Account
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );

    return (
        <main className="min-h-[80vh] flex flex-col justify-center max-w-6xl mx-auto px-4 py-12">
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)} className="fixed inset-0 modal-backdrop bg-black/70 dark:bg-black/80" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-bg-light p-8 rounded-[40px] w-full max-w-md border-2 shadow-2xl modal-glow" style={{ borderColor: 'var(--royal-blue)', boxShadow: '0 0 40px rgba(26, 115, 232, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                            <h3 className="text-2xl font-black mb-6">Update Security</h3>
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <input type="password" required placeholder="New Password" className="w-full h-14 px-4 rounded-xl border border-border-light font-bold" value={passwordData.new} onChange={e => setPasswordData({ ...passwordData, new: e.target.value })} />
                                <input type="password" required placeholder="Confirm Password" className="w-full h-14 px-4 rounded-xl border border-border-light font-bold" value={passwordData.confirm} onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })} />
                                <button type="submit" disabled={loading} className="w-full h-14 bg-text-primary text-white rounded-2xl font-black uppercase text-[11px] shadow-lg">Update Credentials</button>
                            </form>
                        </motion.div>
                    </div>
                )}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="fixed inset-0 modal-backdrop bg-black/70 dark:bg-black/80" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-bg-light p-10 rounded-[40px] w-full max-w-sm text-center border-2 border-danger shadow-2xl" style={{ boxShadow: '0 0 40px rgba(234, 67, 53, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                            <AlertTriangle size={48} className="text-danger mx-auto mb-4" />
                            <h3 className="text-2xl font-black">Final Confirmation</h3>
                            <p className="text-xs font-medium text-text-muted mt-2 mb-8">This action is irreversible. All data will be wiped.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleDeleteAccount} className="h-14 bg-danger text-white rounded-2xl font-black uppercase text-[11px]">Confirm Deletion</button>
                                <button onClick={() => setShowDeleteModal(false)} className="h-14 bg-surface-light/50 text-text-main rounded-2xl font-black uppercase text-[11px]">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {showAvatarModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => !uploading && setShowAvatarModal(false)} 
                            className="fixed inset-0 modal-backdrop bg-black/70 dark:bg-black/80" 
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="relative bg-bg-light p-8 rounded-[32px] w-full max-w-md border-2 shadow-2xl modal-glow"
                            style={{
                                borderColor: 'var(--royal-blue)',
                                boxShadow: '0 0 40px rgba(26, 115, 232, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black">Profile Picture</h3>
                                <button 
                                    onClick={() => !uploading && setShowAvatarModal(false)}
                                    disabled={uploading}
                                    className="p-2 hover:bg-surface-light rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Avatar Preview */}
                                <div className="flex justify-center">
                                    <div className="relative h-32 w-32 rounded-full border-4 border-primary overflow-hidden bg-surface-light flex items-center justify-center">
                                        {formData.avatarUrl ? (
                                            <img 
                                                src={formData.avatarUrl} 
                                                className="h-full w-full object-cover" 
                                                alt="Profile avatar"
                                            />
                                        ) : (
                                            <UserCircle size={64} className="text-primary" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 size={32} className="animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3">
                                    <label className="block">
                                        <input 
                                            type="file" 
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleAvatarUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                        <div className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Camera size={18} />
                                            {formData.avatarUrl ? 'Change Picture' : 'Upload Picture'}
                                        </div>
                                    </label>

                                    {formData.avatarUrl && (
                                        <button 
                                            onClick={handleAvatarDelete}
                                            disabled={uploading}
                                            className="w-full h-14 bg-danger/10 text-danger border-2 border-danger/20 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-danger hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 size={18} />
                                            Remove Picture
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => setShowAvatarModal(false)}
                                        disabled={uploading}
                                        className="w-full h-12 bg-surface-light text-text-main rounded-xl font-bold text-sm hover:bg-border-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {/* File Requirements */}
                                <div className="bg-surface-light p-4 rounded-xl border border-border-light">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Requirements</p>
                                    <ul className="text-xs text-text-dim space-y-1">
                                        <li>• Max file size: 2MB</li>
                                        <li>• Formats: JPG, PNG, WEBP</li>
                                        <li>• Recommended: Square image</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isEditMode ? renderEditMode() : (
                <div className="grid lg:grid-cols-5 gap-16 items-center">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-14 w-14 bg-primary/10 text-primary rounded-[20px] flex items-center justify-center border border-primary/20"><ShieldCheck size={28} /></div>
                        <h1 className="text-5xl font-black tracking-tighter leading-[0.9]">Identity Setup<span className="text-primary">.</span></h1>
                        <p className="text-text-muted font-medium max-w-xs">Mandatory profile completion for institutional access.</p>
                        <div className="pt-8 space-y-4">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary"><span>Progress</span><span>{currentStep}/3</span></div>
                            <div className="h-1 bg-border-light/20 rounded-full overflow-hidden"><motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(currentStep / 3) * 100}%` }} /></div>
                        </div>
                    </div>
                    <div className="lg:col-span-3 bg-bg-light p-10 rounded-[40px] border border-border-light shadow-md min-h-[480px] flex flex-col relative overflow-hidden">
                        <div className="flex-1 relative z-10">
                            <AnimatePresence mode="wait">{currentStep === 1 ? renderStep1() : currentStep === 2 ? renderStep2() : renderStep3()}</AnimatePresence>
                        </div>
                        <div className="mt-8 flex gap-4">
                            {currentStep > 1 && <button onClick={prevStep} className="h-14 px-8 rounded-2xl border border-border-light font-black text-[10px] uppercase flex items-center gap-2"><ChevronLeft size={16} />Back</button>}
                            <button onClick={currentStep === 3 ? handleSubmit : nextStep} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">{currentStep === 3 ? <><Save size={16} />Finish</> : <><ArrowRight size={16} />Next</>}</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ProfilePage;
