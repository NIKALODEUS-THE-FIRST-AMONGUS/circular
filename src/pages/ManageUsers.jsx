import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocuments, deleteDocument, createDocument, createProfile, createAuditLog } from '../lib/firebase-db';
import { auth } from '../lib/firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNotify } from '../components/Toaster';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
    UserPlus,
    Search,
    Shield,
    AtSign,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Users,
    Trash2,
    Lock,
    Unlock,
    Filter,
    UserMinus,
    Eye,
    EyeOff,
    QrCode,
    Zap,
    Mail,
    Shuffle,
    Clock,
    Phone,
    Calendar,
    Edit3,
    Save,
    X,
    MessageSquare,
    MoreVertical
} from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { useCachedQuery } from '../hooks/useCachedQuery';
import { withAdaptiveTimeout } from '../lib/networkSpeed';

const ManageUsers = () => {
    const notify = useNotify();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('student');
    const [dept, setDept] = useState('');
    const [year, setYear] = useState('');
    const [section, setSection] = useState('');
    const [managedDepartment, setManagedDepartment] = useState(''); // For dept_admin role
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('add'); // 'add' or 'view'
    const [profileList, setProfileList] = useState([]);
    const [preApprovalList, setPreApprovalList] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended', 'pending'
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'student', 'teacher', 'admin'
    const [showFilters, setShowFilters] = useState(false);

    // Dynamic Progress
    const { progress, complete } = useSimulatedProgress(fetching && profileList.length === 0, { slowdownPoint: 88 });

    // New States for Instant Provisioning
    const [provisionMode, setProvisionMode] = useState('invite'); // 'invite' or 'instant'
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);

    // Wizard Flow States
    const [activeStep, setActiveStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);

    // Member Details Overlay States
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    // Derived: true when the admin is viewing their own profile
    const isSelf = selectedMember && user && selectedMember.id === user.id;

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

    const { isLoading: queryFetching, refetch } = useCachedQuery(
        'manage_users_profiles',
        async () => {
            const [profiles, preApprovals] = await Promise.all([
                withAdaptiveTimeout(
                    getDocuments('profiles', {
                        orderBy: ['created_at', 'desc']
                    }),
                    { freshMeasure: false, multiplier: 0.5 } // Shorter timeout
                ),
                withAdaptiveTimeout(
                    getDocuments('profile_pre_approvals', {
                        orderBy: ['created_at', 'desc']
                    }),
                    { freshMeasure: false, multiplier: 0.5 } // Shorter timeout
                )
            ]);

            return { profiles: profiles || [], preApprovals: preApprovals || [] };
        },
        {
            staleTime: 30000, // 30 seconds - shorter stale time
            onSuccess: (data) => {
                setProfileList(data.profiles);
                setPreApprovalList(data.preApprovals);
                complete();
                setFetching(false); // Ensure fetching is false on success
            }
        }
    );

    useEffect(() => {
        setFetching(queryFetching);
        // If query finishes (success or error), ensure fetching is false
        if (!queryFetching) {
            setFetching(false);
        }
    }, [queryFetching]);

    const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'admin@institution.edu';

    const mergedList = useMemo(() => {
        const profiles = Array.isArray(profileList) ? profileList : [];
        const preApprovals = Array.isArray(preApprovalList) ? preApprovalList : [];

        // 1. Create a set of emails that are already fully registered
        const registeredEmails = new Set(
            profiles.map(p => p.email?.toLowerCase()).filter(Boolean)
        );

        // 2. Filter pre-approvals to only those NOT yet registered
        const pendingApprovals = preApprovals
            .filter(pa => pa.email && !registeredEmails.has(pa.email.toLowerCase()))
            .map(pa => ({
                ...pa,
                id: `pre-${pa.email}`,
                status: 'pre-authorized',
                is_pre_approval: true
            }));

        // 3. Combine and filter out Master Admin
        const combined = [...profiles, ...pendingApprovals]
            .filter(u => u.email?.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase());

        // Apply filters
        let filtered = combined;

        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
                filtered = filtered.filter(u => u.is_pre_approval || u.status === 'pre-authorized');
            } else {
                filtered = filtered.filter(u => u.status === statusFilter && !u.is_pre_approval);
            }
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }

        // Search filter
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter(u =>
                u.email?.toLowerCase().includes(term) ||
                u.department?.toLowerCase().includes(term) ||
                u.role?.toLowerCase().includes(term) ||
                u.full_name?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [profileList, preApprovalList, searchTerm, statusFilter, roleFilter, MASTER_ADMIN_EMAIL]);

    const filteredProfiles = mergedList; // Simplified

    const totalMembers = filteredProfiles.length;
    const activeMembers = filteredProfiles.filter(m => m.status === 'active' && m.id).length;
    const pendingInvites = filteredProfiles.filter(m => m.is_pre_approval || m.status === 'pre-authorized').length;

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
            // Simulate a slightly "premium" validation delay
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
        
        // Show loading toast
        const loadingToast = provisionMode === 'instant' 
            ? 'Creating account...' 
            : 'Sending invitation...';
        notify(loadingToast, 'info');
        
        try {
            // Check if user already exists in profiles or pre-approvals
            const emailLower = email.toLowerCase();
            const [existingProfiles, existingPreApprovals] = await Promise.all([
                getDocuments('profiles', {
                    where: [['email', '==', emailLower]],
                    limit: 1
                }),
                getDocuments('profile_pre_approvals', {
                    where: [['email', '==', emailLower]],
                    limit: 1
                })
            ]);

            if (existingProfiles.length > 0) {
                notify(`⚠️ User already exists: ${email}`, 'error');
                setLoading(false);
                return;
            }

            if (existingPreApprovals.length > 0 && provisionMode === 'invite') {
                notify(`⚠️ Invitation already sent to ${email}`, 'error');
                setLoading(false);
                return;
            }

            if (provisionMode === 'instant') {
                // Instant Create account via Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    emailLower,
                    password
                );

                if (!userCredential?.user?.uid) {
                    throw new Error('Failed to create user account');
                }

                // Create profile in Firestore
                await createProfile(userCredential.user.uid, {
                    email: emailLower,
                    full_name: email.split('@')[0],
                    role: role,
                    department: role === 'dept_admin' ? managedDepartment : dept,
                    managed_department: role === 'dept_admin' ? managedDepartment : null,
                    year_of_study: role === 'student' ? year : null,
                    section: role === 'student' ? section : null,
                    status: 'active'
                });

                setGeneratedCredentials({ email, password });
                setShowQr(true);
                notify(`✅ Account created successfully for ${email}`, 'success');
            } else {
                // Provision Invite Mode
                await createDocument('profile_pre_approvals', {
                    email: emailLower,
                    role,
                    department: role === 'dept_admin' ? managedDepartment : dept,
                    managed_department: role === 'dept_admin' ? managedDepartment : null,
                    year_of_study: role === 'student' ? year : null,
                    section: role === 'student' ? section : null
                });

                notify(`✉️ Invitation sent to ${email}`, 'success');
            }

            await createAuditLog({
                action: provisionMode === 'instant' ? 'instant_create' : 'provision_member',
                details: { target: email, role, dept, mode: provisionMode }
            });

            setIsSuccess(true);
            refetch(); // Global refetch via hook
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                notify(`⚠️ User already exists: ${email}. Use Invite Mode instead.`, 'error');
            } else {
                notify(`❌ Error: ${err.message}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, userEmail) => {
        if (userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
            notify("🔒 Cannot remove Master Admin", "error");
            return;
        }
        if (!window.confirm(`Permanently remove ${userEmail} from the registry?`)) return;

        notify('Deleting member...', 'info');
        try {
            await deleteDocument('profiles', id);
            notify(`✅ ${userEmail} removed successfully`, 'success');
            refetch();
        } catch (err) {
            notify(`❌ Failed to delete: ${err.message}`, 'error');
        }
    };

    const handleDeletePreApproval = async (targetEmail) => {
        if (!window.confirm(`Revoke invitation for ${targetEmail}?`)) return;
        
        notify('Revoking invitation...', 'info');
        try {
            // Find the pre-approval document by email
            const preApprovals = await getDocuments('profile_pre_approvals', {
                where: [['email', '==', targetEmail]]
            });
            
            if (preApprovals.length > 0) {
                await deleteDocument('profile_pre_approvals', preApprovals[0].id);
                notify(`✅ Invitation revoked for ${targetEmail}`, 'success');
                refetch();
            } else {
                notify('Pre-approval not found', 'error');
            }
        } catch (err) {
            notify(`❌ Failed to revoke: ${err.message}`, 'error');
        }
    };

    const toggleStatus = async (id, currentStatus, userEmail) => {
        if (userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
            notify("🔒 Cannot change Master Admin status", "error");
            return;
        }
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        
        notify(`Updating status to ${newStatus}...`, 'info');
        try {
            const { updateDocument } = await import('../lib/firebase-db');
            await updateDocument('profiles', id, { status: newStatus });

            const statusEmoji = newStatus === 'active' ? '✅' : '⛔';
            notify(`${statusEmoji} ${userEmail} is now ${newStatus}`, newStatus === 'active' ? 'success' : 'error');
            refetch();
        } catch (err) {
            notify(`❌ Failed to update status: ${err.message}`, 'error');
        }
    };

    const handleOpenDetails = (member) => {
        setSelectedMember(member);
        setEditData({
            full_name: member.full_name || '',
            role: member.role || 'student',
            department: member.department || '',
            year_of_study: member.year_of_study || '',
            section: member.section || '',
            mobile_number: member.mobile_number || ''
        });
        setIsEditing(false);
    };

    const handleUpdateProfile = async () => {
        if (!selectedMember.id) return; // Can't update pre-approvals this way yet
        setLoading(true);
        notify('Updating profile...', 'info');
        try {
            const { updateDocument } = await import('../lib/firebase-db');
            await updateDocument('profiles', selectedMember.id, editData);

            notify("☁️ Profile updated", "success");
            setIsEditing(false);
            refetch();
            // Update selected member local state
            setSelectedMember({ ...selectedMember, ...editData });
        } catch (err) {
            notify(`❌ Update failed: ${err.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setFetching(true);
        notify('🔄 Refreshing members list...', 'info');
        try {
            await refetch();
            notify("✅ Members list refreshed", "success");
        } catch {
            notify("❌ Failed to refresh", "error");
        } finally {
            setFetching(false);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setRoleFilter('all');
        notify("🧹 Filters cleared", "info");
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            <header className="space-y-6">
                <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-br from-bg-light to-surface-light border border-border-light shadow-lg">
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
                                <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Shield size={16} />
                                    Members Registry
                                </span>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-5xl md:text-6xl font-black text-text-main tracking-tighter leading-none">
                                    Member Directory<span className="text-primary">.</span>
                                </h1>
                                <p className="text-text-muted font-semibold text-base md:text-lg max-w-2xl leading-relaxed">
                                    Manage institutional access, roles, and member profiles.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-3 gap-4 w-full lg:w-auto"
                        >
                            <div 
                                className="group relative p-6 rounded-2xl bg-gradient-to-br from-surface-light to-bg-light border-2 border-border-light hover:border-primary/40 hover:shadow-xl transition-all duration-300 min-w-[120px]"
                                aria-label={`${totalMembers} total members`}
                            >
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-text-muted group-hover:text-text-main transition-colors">Total</p>
                                <p className="text-4xl font-black tracking-tighter mt-2 text-text-main">{totalMembers}</p>
                            </div>
                            <div 
                                className="group relative p-6 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 hover:border-success hover:shadow-xl hover:shadow-success/20 transition-all duration-300 min-w-[120px]"
                                aria-label={`${activeMembers} active members`}
                            >
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-success/70 group-hover:text-success transition-colors">Active</p>
                                <p className="text-4xl font-black tracking-tighter mt-2 text-success">{activeMembers}</p>
                            </div>
                            <div 
                                className="group relative p-6 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/20 hover:border-warning hover:shadow-xl hover:shadow-warning/20 transition-all duration-300 min-w-[120px]"
                                aria-label={`${pendingInvites} pending invites`}
                            >
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-warning/70 group-hover:text-warning transition-colors">Pending</p>
                                <p className="text-4xl font-black tracking-tighter mt-2 text-warning">{pendingInvites}</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center gap-6"
                >
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`px-8 py-4 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] transition-all flex items-center gap-3 ${
                            activeTab === 'add'
                                ? 'bg-primary text-white shadow-lg'
                                : 'bg-surface-light text-text-main border-2 border-border-light hover:border-primary/30'
                        }`}
                    >
                        <UserPlus size={20} />
                        Add Members
                    </button>
                    <button
                        onClick={() => setActiveTab('view')}
                        className={`px-8 py-4 rounded-xl font-extrabold text-[13px] uppercase tracking-[0.12em] transition-all flex items-center gap-3 ${
                            activeTab === 'view'
                                ? 'bg-primary text-white shadow-lg'
                                : 'bg-surface-light text-text-main border-2 border-border-light hover:border-primary/30'
                        }`}
                    >
                        <Users size={20} />
                        Total Members ({totalMembers})
                    </button>
                </motion.div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
                <AnimatePresence mode="wait">
                    {activeTab === 'add' ? (
                        <motion.div
                            key="add-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-2xl mx-auto"
                        >
                            <section className="bg-bg-light rounded-[40px] border border-border-light p-8 md:p-10 shadow-md relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {isSuccess ? (
                                        <motion.div
                                            key="success-state"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-12 text-center space-y-6"
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", damping: 12 }}
                                                className="w-24 h-24 bg-primary/5 text-primary rounded-full flex items-center justify-center"
                                            >
                                                <CheckCircle2 size={48} />
                                            </motion.div>
                                            <div className="space-y-2">
                                                <h2 className="text-2xl font-black text-text-main">Member created</h2>
                                                <p className="text-text-muted font-medium">The member has been successfully added to your workspace.</p>
                                            </div>
                                            <button
                                                onClick={resetForm}
                                                aria-label="Add another member"
                                                className="px-8 py-4 bg-primary text-white rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                            >
                                                Add Another Member
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div key={`step-${activeStep}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                            {/* Progress Indicator */}
                                            <div className="flex gap-2 mb-8">
                                                {[0, 1, 2].map(s => (
                                                    <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= activeStep ? 'bg-primary' : 'bg-clip-padding bg-text-main/10 dark:bg-text-main/20'}`} />
                                                ))}
                                            </div>

                                            {activeStep === 0 && (
                                                <div className="space-y-8">
                                                    <div className="space-y-2">
                                                        <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                                                            <Mail size={20} className="text-primary" />
                                                            1. Member email
                                                        </h3>
                                                        <p className="text-text-muted text-sm">Choose how to onboard this member and enter their institutional email address.</p>
                                                    </div>

                                                    <div className="bg-surface-light p-2 rounded-3xl flex gap-1 border border-border-light">
                                                        <button
                                                            onClick={() => setProvisionMode('invite')}
                                                            className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl transition-all ${provisionMode === 'invite' ? 'bg-bg-light text-primary shadow-md' : 'text-text-muted hover:bg-bg-light/50'}`}
                                                        >
                                                            <Mail size={24} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Invite Link</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setProvisionMode('instant')}
                                                            className={`flex-1 flex flex-col items-center gap-2 py-6 rounded-2xl transition-all ${provisionMode === 'instant' ? 'bg-bg-light text-primary shadow-md' : 'text-text-muted hover:bg-bg-light/50'}`}
                                                        >
                                                            <Zap size={24} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Instant Account</span>
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3 relative">
                                                        <div className="relative">
                                                            <input
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="name@college.edu"
                                                                className="w-full px-8 py-6 rounded-[32px] bg-surface-light border-2 border-transparent focus:border-primary/20 focus:bg-bg-light transition-all outline-none text-lg font-bold"
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
                                                                <button onClick={handleGenerateTestId} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline">
                                                                    <Zap size={12} /> Use Institutional Test ID
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        disabled={!email || !!emailError || isValidating}
                                                        onClick={nextStep}
                                                        aria-label="Continue to member details"
                                                        className="w-full py-6 bg-text-main text-bg-light rounded-[32px] font-black text-[13px] uppercase tracking-[0.2em] shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                                    >
                                                        Next: Member Details
                                                    </button>
                                                </div>
                                            )}

                                            {activeStep === 1 && (
                                                <div className="space-y-8">
                                                    <div className="space-y-2">
                                                        <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                                                            <Shuffle size={20} className="text-primary" />
                                                            2. Member details
                                                        </h3>
                                                        <p className="text-text-muted text-sm">Assign role, department, year, and section.</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <label className="px-1 text-[10px] font-black text-text-muted uppercase tracking-widest">Role</label>
                                                            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-surface-light border border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold">
                                                                <option value="student">Student User</option>
                                                                <option value="teacher">Faculty Member</option>
                                                                <option value="dept_admin">Departmental Admin</option>
                                                                <option value="admin">Super Admin</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="px-1 text-[10px] font-black text-text-muted uppercase tracking-widest">
                                                                {role === 'dept_admin' ? 'Managed Department' : 'Department'}
                                                            </label>
                                                            <select 
                                                                value={role === 'dept_admin' ? managedDepartment : dept} 
                                                                onChange={(e) => role === 'dept_admin' ? setManagedDepartment(e.target.value) : setDept(e.target.value)} 
                                                                className="w-full px-6 py-4 rounded-2xl bg-surface-light border border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold"
                                                            >
                                                                <option value="">Select Hub</option>
                                                                <option value="CSE">CSE HUB</option>
                                                                <option value="AIDS">AIDS HUB</option>
                                                                <option value="AIML">AIML HUB</option>
                                                                <option value="ECE">ECE HUB</option>
                                                                <option value="EEE">EEE HUB</option>
                                                                <option value="MECH">MECH HUB</option>
                                                                <option value="CIVIL">CIVIL HUB</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {role === 'student' && (
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-3">
                                                                <label className="px-1 text-[10px] font-black text-text-muted uppercase tracking-widest">Year</label>
                                                                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-surface-light border border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold">
                                                                    <option value="">Year</option>
                                                                    <option value="1">1st Year</option>
                                                                    <option value="2">2nd Year</option>
                                                                    <option value="3">3rd Year</option>
                                                                    <option value="4">4th Year</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="px-1 text-[10px] font-black text-text-muted uppercase tracking-widest">Section</label>
                                                                <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-surface-light border border-border-light focus:border-primary focus:bg-bg-light outline-none font-bold">
                                                                    <option value="">Sec</option>
                                                                    <option value="A">Sec A</option>
                                                                    <option value="B">Sec B</option>
                                                                    <option value="C">Sec C</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-4">
                                                        <button 
                                                            onClick={prevStep} 
                                                            aria-label="Go back to previous step"
                                                            className="flex-1 py-6 bg-surface-light text-text-main border-2 border-border-light rounded-[32px] font-black text-[13px] uppercase tracking-widest transition-all hover:bg-bg-light hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                                        >
                                                            Back
                                                        </button>
                                                        <button 
                                                            onClick={nextStep} 
                                                            aria-label="Continue to review step"
                                                            className="flex-[2] py-6 bg-text-main text-bg-light rounded-[32px] font-black text-[13px] uppercase tracking-widest transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                                        >
                                                            Next Step
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeStep === 2 && (
                                                <div className="space-y-8">
                                                    <div className="space-y-2">
                                                        <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                                                            <Lock size={20} className="text-primary" />
                                                            3. Review & access
                                                        </h3>
                                                        <p className="text-text-muted text-sm">Review details and finalize access for this member.</p>
                                                    </div>

                                                    <div className="p-8 bg-surface-light rounded-[32px] border-2 border-border-light border-dashed space-y-4">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-text-muted font-bold">Email</span>
                                                            <span className="text-text-main font-black break-all ml-4">{email}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-text-muted font-bold">Role</span>
                                                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase">{role}</span>
                                                        </div>
                                                        {provisionMode === 'instant' && (
                                                            <div className="space-y-3 pt-4 border-t border-border-light">
                                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Initial Password</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type={showPassword ? "text" : "password"}
                                                                        value={password}
                                                                        onChange={(e) => setPassword(e.target.value)}
                                                                        placeholder="••••••••"
                                                                        className="w-full px-6 py-4 rounded-2xl bg-bg-light border border-border-light focus:border-primary outline-none font-bold"
                                                                        required
                                                                    />
                                                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <button 
                                                            onClick={prevStep} 
                                                            aria-label="Go back to previous step"
                                                            className="flex-1 py-6 bg-surface-light text-text-main border-2 border-border-light rounded-[32px] font-black text-[13px] uppercase tracking-widest transition-all hover:bg-bg-light hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                                        >
                                                            Back
                                                        </button>
                                                        <button
                                                            onClick={handleAssign}
                                                            disabled={loading || (provisionMode === 'instant' && !password)}
                                                            aria-label="Create new member"
                                                            className="flex-[2] py-6 bg-text-main text-bg-light rounded-[32px] font-black text-[13px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                                        >
                                                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                                            Create member
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="view-members"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full"
                        >
                            <div className="bg-bg-light rounded-[40px] border border-border-light shadow-md overflow-hidden">
                                {/* Search Bar */}
                                <div className="px-6 md:px-10 py-6 md:py-8 border-b border-border-light space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 flex items-center gap-3 bg-surface-light px-6 py-4 rounded-xl border border-border-light focus-within:border-primary/30 focus-within:shadow-md transition-all duration-300 group">
                                            <Search size={20} className="text-text-muted group-focus-within:text-primary transition-colors shrink-0" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search by name, email, role, or department..."
                                                aria-label="Search members"
                                                className="bg-transparent border-none text-[14px] font-medium text-text-main focus:ring-0 outline-none w-full placeholder:text-text-muted/50"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="p-1 hover:bg-bg-light rounded-lg transition-all"
                                                    aria-label="Clear search"
                                                >
                                                    <X size={16} className="text-text-muted" />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleRefresh}
                                            disabled={fetching}
                                            className="p-4 bg-surface-light hover:bg-primary/10 text-text-muted hover:text-primary rounded-xl transition-all border border-border-light hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                                            aria-label="Refresh members list"
                                        >
                                            <Shuffle size={20} className={fetching ? 'animate-spin' : ''} />
                                        </button>
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className={`p-4 rounded-xl transition-all border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light ${
                                                showFilters || statusFilter !== 'all' || roleFilter !== 'all'
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-surface-light text-text-muted hover:text-primary border-border-light hover:border-primary/30'
                                            }`}
                                            aria-label="Toggle filters"
                                        >
                                            <Filter size={20} />
                                        </button>
                                    </div>

                                    {/* Filter Panel */}
                                    <AnimatePresence>
                                        {showFilters && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-6 bg-surface-light rounded-2xl border border-border-light space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-black text-text-main uppercase tracking-wider">Filters</h4>
                                                        <button
                                                            onClick={handleClearFilters}
                                                            className="text-xs font-bold text-primary hover:underline"
                                                        >
                                                            Clear All
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Status</label>
                                                            <select
                                                                value={statusFilter}
                                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                                className="w-full px-4 py-3 bg-bg-light border border-border-light rounded-xl text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                            >
                                                                <option value="all">All Status</option>
                                                                <option value="active">Active</option>
                                                                <option value="suspended">Suspended</option>
                                                                <option value="pending">Pending Invite</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Role</label>
                                                            <select
                                                                value={roleFilter}
                                                                onChange={(e) => setRoleFilter(e.target.value)}
                                                                className="w-full px-4 py-3 bg-bg-light border border-border-light rounded-xl text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                            >
                                                                <option value="all">All Roles</option>
                                                                <option value="student">Student</option>
                                                                <option value="teacher">Teacher</option>
                                                                <option value="dept_admin">Departmental Admin</option>
                                                                <option value="admin">Super Admin</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-text-muted font-medium">
                                            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                                                ? `${filteredProfiles.length} members found` 
                                                : `Showing all ${filteredProfiles.length} members`}
                                        </p>
                                        {(statusFilter !== 'all' || roleFilter !== 'all') && (
                                            <div className="flex items-center gap-2">
                                                {statusFilter !== 'all' && (
                                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                                                        Status: {statusFilter}
                                                    </span>
                                                )}
                                                {roleFilter !== 'all' && (
                                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                                                        Role: {roleFilter}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-border-light flex justify-between items-center gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-text-main">Members Directory</h3>
                                    <p className="text-sm text-text-muted font-medium">
                                        {filteredProfiles.length} {filteredProfiles.length === 1 ? 'member' : 'members'}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-light">
                                            <th className="px-6 md:px-10 py-4 md:py-6 text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">Member</th>
                                            <th className="px-6 md:px-10 py-4 md:py-6 text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">Role & Contact</th>
                                            <th className="px-6 md:px-10 py-4 md:py-6 text-[11px] font-black text-text-muted uppercase tracking-[0.15em]">Status</th>
                                            <th className="px-6 md:px-10 py-4 md:py-6 text-[11px] font-black text-text-muted uppercase tracking-[0.15em] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light/10">
                                        {fetching ? (
                                            <tr>
                                                <td colSpan="4" className="py-20 text-center">
                                                    <ProgressLoader progress={progress} label="Decrypting Institutional Registry" size="lg" />
                                                </td>
                                            </tr>
                                        ) : filteredProfiles.length > 0 ? (
                                            filteredProfiles.map((user) => (
                                                <tr
                                                    key={user.id || user.email}
                                                    onClick={() => handleOpenDetails(user)}
                                                    className="hover:bg-surface-light transition-all group cursor-pointer"
                                                >
                                                    <td className="px-6 md:px-10 py-6 md:py-8">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                                {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-[15px] font-black text-text-main">
                                                                    {user.title && <span className="text-text-muted font-medium">{user.title}. </span>}
                                                                    {user.full_name || 'Unnamed Member'}
                                                                </p>
                                                                <p className="text-[12px] font-bold text-text-muted">{user.department || 'No department set'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-10 py-6 md:py-8">
                                                        <div className="space-y-2">
                                                            <span className="px-3 py-1 bg-text-main text-bg-light rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                                                                {user.role}
                                                            </span>
                                                            <p className="text-[12px] font-bold text-text-muted">{user.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-10 py-6 md:py-8">
                                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.id ? 'bg-success/5 text-success border border-success/10' : 'bg-warning/5 text-warning border border-warning/10'}`}>
                                                            {user.id ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                            {user.id ? 'Active Member' : 'Pending Invite'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (user.is_pre_approval) handleDeletePreApproval(user.email);
                                                                else handleDelete(user.id, user.email);
                                                            }}
                                                            aria-label={`Delete ${user.full_name || user.email}`}
                                                            className="p-4 text-text-muted hover:text-danger hover:bg-danger/10 rounded-2xl transition-all border-2 border-transparent hover:border-danger/30 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-light"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 md:px-10 py-20 md:py-24 text-center">
                                                    <div className="max-w-xs mx-auto space-y-4">
                                                        <div className="w-20 h-20 bg-surface-light border border-border-light flex items-center justify-center rounded-2xl text-text-muted">
                                                            <Search size={32} />
                                                        </div>
                                                        <p className="text-text-muted font-bold">No members found. Try adjusting your filters or search term.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

            {/* QR Code / Success Modal Overlay */}
            <AnimatePresence>
                {showQr && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowQr(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-bg-light rounded-[40px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="mx-auto w-16 h-16 bg-success/10 text-success rounded-xl flex items-center justify-center">
                                <QrCode size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-text-main">Instant Node Active</h3>
                                <p className="text-sm text-text-muted">Scan to log in instantly or share these credentials with the user.</p>
                            </div>
                            <div className="p-6 bg-surface-light rounded-3xl border border-border-light space-y-3 text-left">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Internal ID</label>
                                    <p className="text-[13px] font-bold text-text-main break-all">{generatedCredentials?.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Private Access Key</label>
                                    <p className="text-[13px] font-bold text-text-main">{generatedCredentials?.password}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQr(false)}
                                aria-label="Close credentials modal"
                                className="w-full py-4 bg-text-main text-white rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-text-main/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light"
                            >
                                Dismiss Control
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Member Details Overlay */}
            <AnimatePresence>
                {selectedMember && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-end p-0 md:p-6 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedMember(null)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-bg-light w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-border-light flex items-center justify-between bg-surface-light/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                                        {selectedMember.full_name?.charAt(0) || selectedMember.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-text-main tracking-tight">
                                            {selectedMember.title && <span className="text-text-muted font-medium">{selectedMember.title}. </span>}
                                            {selectedMember.full_name || 'System Identifier'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-text-main text-white rounded-md text-[8px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                                            <span className="text-xs font-bold text-text-muted">{selectedMember.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    aria-label="Close member details"
                                    className="p-3 hover:bg-bg-light rounded-2xl border-2 border-transparent hover:border-border-light transition-all text-text-muted hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                {/* Academic Node Partition */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        <Building2 size={14} />
                                        <span>Institutional Mapping</span>
                                    </div>

                                    {/* Role */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Privilege Level</label>
                                        {isEditing && !isSelf ? (
                                            <select
                                                value={editData.role}
                                                onChange={e => setEditData({ ...editData, role: e.target.value })}
                                                className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                            >
                                                <option value="student">Student User</option>
                                                <option value="teacher">Faculty Member</option>
                                                <option value="admin">Dept Admin</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2 px-5 py-4 bg-surface-light rounded-2xl border border-transparent">
                                                <span className="px-2 py-0.5 bg-text-main text-white rounded-md text-[8px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                                                {isSelf && <span className="text-[9px] text-[#9aa0a6] font-bold">cannot change own role</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Department */}
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Department Hub</label>
                                            {isEditing && !isSelf ? (
                                                <select
                                                    value={editData.department}
                                                    onChange={e => setEditData({ ...editData, department: e.target.value })}
                                                    className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                >
                                                    <option value="">Select Hub</option>
                                                    <option value="CSE">CSE HUB</option>
                                                    <option value="AIDS">AIDS HUB</option>
                                                    <option value="AIML">AIML HUB</option>
                                                    <option value="ECE">ECE HUB</option>
                                                    <option value="EEE">EEE HUB</option>
                                                    <option value="MECH">MECH HUB</option>
                                                    <option value="CIVIL">CIVIL HUB</option>
                                                </select>
                                            ) : (
                                                <div className="px-5 py-4 bg-surface-light rounded-2xl border border-transparent text-[13px] font-bold text-text-main">
                                                    {selectedMember.department || 'Not Assigned'}
                                                </div>
                                            )}
                                        </div>
                                        {/* Year + Section */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Year</label>
                                                {isEditing && !isSelf ? (
                                                    <select
                                                        value={editData.year_of_study}
                                                        onChange={e => setEditData({ ...editData, year_of_study: e.target.value })}
                                                        className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                    >
                                                        <option value="">Year</option>
                                                        <option value="1">1st Year</option>
                                                        <option value="2">2nd Year</option>
                                                        <option value="3">3rd Year</option>
                                                        <option value="4">4th Year</option>
                                                    </select>
                                                ) : (
                                                    <div className="px-5 py-4 bg-surface-light rounded-2xl border border-transparent text-[13px] font-bold text-text-main">
                                                        {selectedMember.year_of_study ? `${selectedMember.year_of_study} Year` : 'N/A'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Section</label>
                                                {isEditing && !isSelf ? (
                                                    <select
                                                        value={editData.section}
                                                        onChange={e => setEditData({ ...editData, section: e.target.value })}
                                                        className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                    >
                                                        <option value="">Sec</option>
                                                        <option value="A">Sec A</option>
                                                        <option value="B">Sec B</option>
                                                        <option value="C">Sec C</option>
                                                        <option value="D">Sec D</option>
                                                    </select>
                                                ) : (
                                                    <div className="px-5 py-4 bg-surface-light rounded-2xl border border-transparent text-[13px] font-bold text-text-main">
                                                        {selectedMember.section || 'N/A'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Identity Data Partition */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        <AtSign size={14} />
                                        <span>Personal Registry Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Full Identity Name</label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editData.full_name}
                                                    onChange={e => setEditData({ ...editData, full_name: e.target.value })}
                                                    className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                                />
                                            ) : (
                                                <div className="px-5 py-4 bg-surface-light rounded-2xl border border-transparent text-[13px] font-bold text-text-main">
                                                    {selectedMember.full_name || 'Anonymous Identifier'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9aa0a6] ml-1">Mobile Access</label>
                                            {isEditing && !isSelf ? (
                                                <input
                                                    type="text"
                                                    value={editData.mobile_number}
                                                    onChange={e => setEditData({ ...editData, mobile_number: e.target.value })}
                                                    className="w-full px-5 py-4 bg-surface-light border border-border-light rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-3 px-5 py-4 bg-surface-light rounded-2xl border border-transparent text-[13px] font-bold text-text-main">
                                                    <Phone size={14} className="text-text-muted" />
                                                    {selectedMember.mobile_number || 'No Mobile Provisioned'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* System Metadata Partition */}
                                <div className="p-6 bg-surface-light rounded-[32px] border border-border-light flex flex-wrap gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#9aa0a6]">Joining Node</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                                            <Calendar size={14} />
                                            {new Date(selectedMember.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#9aa0a6]">Node Strength</p>
                                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block ${selectedMember.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {selectedMember.status}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#9aa0a6]">Access Type</p>
                                        <p className="text-xs font-bold text-text-main">{selectedMember.is_pre_approval ? 'External Invitation' : 'On-Chain Profile'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 border-t border-border-light bg-surface-light/50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {!isSelf && !selectedMember.is_pre_approval && (
                                        <button
                                            onClick={() => toggleStatus(selectedMember.id, selectedMember.status, selectedMember.email)}
                                            aria-label={selectedMember.status === 'active' ? 'Suspend member access' : 'Restore member access'}
                                            className={`px-6 py-4 rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-light ${selectedMember.status === 'active' ? 'bg-danger/10 text-danger border-danger/30 hover:bg-danger hover:text-white focus:ring-danger' : 'bg-success/10 text-success border-success/30 hover:bg-success hover:text-white focus:ring-success'}`}
                                        >
                                            {selectedMember.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                                            {selectedMember.status === 'active' ? 'Suspend Access' : 'Restore Access'}
                                        </button>
                                    )}
                                    {!isSelf && (
                                        <button
                                            onClick={() => {
                                                const targetEmail = selectedMember.email;
                                                const targetId = selectedMember.id;
                                                const isPre = selectedMember.is_pre_approval;
                                                setSelectedMember(null);
                                                if (isPre) handleDeletePreApproval(targetEmail);
                                                else handleDelete(targetId, targetEmail);
                                            }}
                                            aria-label="Delete member"
                                            className="p-4 bg-bg-light border-2 border-border-light text-danger rounded-2xl hover:bg-danger/10 hover:border-danger/30 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-surface-light"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                aria-label="Discard changes"
                                                className="px-6 py-4 text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-main hover:text-danger transition-colors focus:outline-none focus:ring-2 focus:ring-text-main focus:ring-offset-2 focus:ring-offset-surface-light rounded-xl"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={loading}
                                                aria-label="Save profile changes"
                                                className="px-8 py-4 bg-text-main text-white rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] flex items-center gap-2.5 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                Save Identity
                                            </button>
                                        </>
                                    ) : (
                                        !selectedMember.is_pre_approval && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                aria-label="Edit member profile"
                                                className="px-8 py-4 bg-primary text-white rounded-2xl text-[12px] font-extrabold uppercase tracking-[0.12em] flex items-center gap-2.5 shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light"
                                            >
                                                <Edit3 size={18} />
                                                Edit Profile
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageUsers;
