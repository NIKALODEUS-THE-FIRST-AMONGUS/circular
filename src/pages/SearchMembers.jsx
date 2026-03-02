import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotify } from '../components/Toaster';
import { getDocuments, deleteDocument } from '../lib/firebase-db';
import {
    Search, Filter, MoreVertical, CheckCircle2, Clock,
    Trash2, ArrowLeft, Users, Shield, Building2, Download,
    RefreshCw, X, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCachedQuery } from '../hooks/useCachedQuery';
import { withAdaptiveTimeout } from '../lib/networkSpeed';
import ProgressLoader from '../components/ProgressLoader';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';

const ROLES = ['all', 'student', 'teacher', 'admin'];
const DEPARTMENTS = ['all', 'CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const STATUSES = ['all', 'active', 'pending', 'suspended'];

const SearchMembers = () => {
    const notify = useNotify();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [profileList, setProfileList] = useState([]);
    const [preApprovalList, setPreApprovalList] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const filterRef = useRef(null);
    const moreRef = useRef(null);

    const { progress, complete } = useSimulatedProgress(fetching && profileList.length === 0, { slowdownPoint: 88 });

    const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'admin@institution.edu';

    const { isLoading: queryFetching, refetch } = useCachedQuery(
        'search_members_profiles',
        async () => {
            const [profiles, preApprovals] = await Promise.all([
                withAdaptiveTimeout(
                    getDocuments('profiles', {
                        orderBy: ['created_at', 'desc']
                    })
                ),
                withAdaptiveTimeout(
                    getDocuments('profile_pre_approvals', {
                        orderBy: ['created_at', 'desc']
                    })
                )
            ]);

            return { profiles: profiles || [], preApprovals: preApprovals || [] };
        },
        {
            staleTime: 60000,
            onSuccess: (data) => {
                setProfileList(data.profiles);
                setPreApprovalList(data.preApprovals);
                complete();
            }
        }
    );

    useEffect(() => {
        setFetching(queryFetching);
    }, [queryFetching]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilterMenu(false);
            }
            if (moreRef.current && !moreRef.current.contains(e.target)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const mergedList = useMemo(() => {
        const profiles = Array.isArray(profileList) ? profileList : [];
        const preApprovals = Array.isArray(preApprovalList) ? preApprovalList : [];

        const registeredEmails = new Set(
            profiles.map(p => p.email?.toLowerCase()).filter(Boolean)
        );

        const pendingApprovals = preApprovals
            .filter(pa => pa.email && !registeredEmails.has(pa.email.toLowerCase()))
            .map(pa => ({
                ...pa,
                id: `pre-${pa.email}`,
                status: 'pre-authorized',
                is_pre_approval: true
            }));

        let combined = [...profiles, ...pendingApprovals]
            .filter(u => u.email?.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase());

        // Apply filters
        if (roleFilter !== 'all') {
            combined = combined.filter(u => u.role === roleFilter);
        }
        if (deptFilter !== 'all') {
            combined = combined.filter(u => u.department === deptFilter);
        }
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
                combined = combined.filter(u => u.is_pre_approval || u.status === 'pre-authorized');
            } else {
                combined = combined.filter(u => u.status === statusFilter);
            }
        }

        // Apply search
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            combined = combined.filter(u =>
                u.email?.toLowerCase().includes(term) ||
                u.department?.toLowerCase().includes(term) ||
                u.role?.toLowerCase().includes(term) ||
                u.full_name?.toLowerCase().includes(term)
            );
        }

        return combined;
    }, [profileList, preApprovalList, searchTerm, MASTER_ADMIN_EMAIL, roleFilter, deptFilter, statusFilter]);

    const totalMembers = mergedList.length;
    const activeMembers = mergedList.filter(m => m.status === 'active' && m.id).length;
    const pendingInvites = mergedList.filter(m => m.is_pre_approval || m.status === 'pre-authorized').length;

    const handleDelete = async (id, userEmail) => {
        if (userEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
            notify("Cannot remove Master Admin.", "error");
            return;
        }
        if (!window.confirm(`Permanently remove ${userEmail}?`)) return;

        try {
            await deleteDocument('profiles', id);
            notify(`Removed ${userEmail}`, 'info');
            refetch();
        } catch (err) {
            notify(err.message, 'error');
        }
    };

    const handleDeletePreApproval = async (targetEmail) => {
        if (!window.confirm(`Revoke invitation for ${targetEmail}?`)) return;
        try {
            // Find the pre-approval document by email
            const preApprovals = await getDocuments('profile_pre_approvals', {
                where: [['email', '==', targetEmail]]
            });
            
            if (preApprovals.length > 0) {
                await deleteDocument('profile_pre_approvals', preApprovals[0].id);
                notify(`Revoked invitation for ${targetEmail}`, 'info');
                refetch();
            } else {
                notify('Pre-approval not found', 'error');
            }
        } catch (err) {
            notify(err.message, 'error');
        }
    };

    const handleExportCSV = () => {
        const csv = [
            ['Name', 'Email', 'Role', 'Department', 'Status', 'Mobile'],
            ...mergedList.map(m => [
                m.full_name || 'N/A',
                m.email,
                m.role,
                m.department || 'N/A',
                m.id ? 'Active' : 'Pending',
                m.mobile_number || 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `members-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        notify('Members exported successfully', 'success');
        setShowMoreMenu(false);
    };

    const clearFilters = () => {
        setRoleFilter('all');
        setDeptFilter('all');
        setStatusFilter('all');
        setSearchTerm('');
    };

    const activeFilterCount = (roleFilter !== 'all' ? 1 : 0) + (deptFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
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
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
                                <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Users size={16} />
                                    Member Search
                                </span>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-5xl md:text-6xl font-black text-text-main tracking-tighter leading-none">
                                    Find Members<span className="text-primary">.</span>
                                </h1>
                                <p className="text-text-muted font-semibold text-base md:text-lg max-w-2xl leading-relaxed">
                                    Search and manage institutional members by name, email, role, or department.
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
                    className="flex items-center gap-3 bg-surface-light px-6 py-4 rounded-xl border border-border-light focus-within:border-primary/30 focus-within:shadow-md transition-all duration-300 group"
                >
                    <Search size={20} className="text-text-muted group-focus-within:text-primary transition-colors shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, role, or department..."
                        aria-label="Search members"
                        className="bg-transparent border-none text-[14px] font-medium text-text-main focus:ring-0 outline-none w-full placeholder:text-text-muted/50"
                    />
                </motion.div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-bg-light rounded-[40px] border border-border-light shadow-md overflow-hidden"
            >
                <div className="px-10 py-8 border-b border-border-light flex justify-between items-center gap-4">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-text-main">Members</h3>
                        <p className="text-sm text-text-muted font-medium">{mergedList.length} members found</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative" ref={filterRef}>
                            <button 
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                aria-label="Filter members"
                                className={`relative p-3 hover:bg-surface-light rounded-xl transition-all border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                    showFilterMenu || activeFilterCount > 0
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'border-transparent hover:border-border-light text-text-muted'
                                }`}
                            >
                                <Filter size={20} />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white rounded-full text-[10px] font-black flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showFilterMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 z-50 bg-bg-light border border-border-light rounded-2xl shadow-xl p-6 w-80"
                                    >
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-extrabold text-text-main uppercase tracking-wider">Filters</h4>
                                                {activeFilterCount > 0 && (
                                                    <button
                                                        onClick={clearFilters}
                                                        className="text-[10px] font-bold text-danger hover:underline uppercase tracking-wider"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">Role</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {ROLES.map(role => (
                                                        <button
                                                            key={role}
                                                            onClick={() => setRoleFilter(role)}
                                                            className={`px-3 py-2 rounded-xl text-[12px] font-bold transition-all border-2 capitalize ${
                                                                roleFilter === role
                                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                                    : 'bg-surface-light text-text-main border-transparent hover:border-border-light'
                                                            }`}
                                                        >
                                                            {role === 'all' ? 'All Roles' : role}
                                                            {roleFilter === role && <Check size={12} className="inline ml-1" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">Department</label>
                                                <select
                                                    value={deptFilter}
                                                    onChange={(e) => setDeptFilter(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-surface-light border-2 border-border-light focus:border-primary outline-none font-bold text-sm"
                                                >
                                                    {DEPARTMENTS.map(dept => (
                                                        <option key={dept} value={dept}>
                                                            {dept === 'all' ? 'All Departments' : dept}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">Status</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {STATUSES.map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => setStatusFilter(status)}
                                                            className={`px-3 py-2 rounded-xl text-[12px] font-bold transition-all border-2 capitalize ${
                                                                statusFilter === status
                                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                                    : 'bg-surface-light text-text-main border-transparent hover:border-border-light'
                                                            }`}
                                                        >
                                                            {status === 'all' ? 'All' : status}
                                                            {statusFilter === status && <Check size={12} className="inline ml-1" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="relative" ref={moreRef}>
                            <button 
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                aria-label="More options"
                                className={`p-3 hover:bg-surface-light rounded-xl transition-all border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                    showMoreMenu
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'border-transparent hover:border-border-light text-text-muted'
                                }`}
                            >
                                <MoreVertical size={20} />
                            </button>

                            <AnimatePresence>
                                {showMoreMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 z-50 bg-bg-light border border-border-light rounded-2xl shadow-xl py-2 w-56"
                                    >
                                        <button
                                            onClick={() => { refetch(); setShowMoreMenu(false); }}
                                            className="w-full px-4 py-3 text-left hover:bg-surface-light transition-all flex items-center gap-3 text-sm font-bold text-text-main"
                                        >
                                            <RefreshCw size={16} />
                                            Refresh List
                                        </button>
                                        <button
                                            onClick={handleExportCSV}
                                            className="w-full px-4 py-3 text-left hover:bg-surface-light transition-all flex items-center gap-3 text-sm font-bold text-text-main"
                                        >
                                            <Download size={16} />
                                            Export to CSV
                                        </button>
                                        <div className="h-px bg-border-light my-2" />
                                        <button
                                            onClick={() => { navigate('/dashboard/add-member'); setShowMoreMenu(false); }}
                                            className="w-full px-4 py-3 text-left hover:bg-surface-light transition-all flex items-center gap-3 text-sm font-bold text-primary"
                                        >
                                            <Users size={16} />
                                            Add New Member
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-light">
                                <th className="px-10 py-6 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Member</th>
                                <th className="px-10 py-6 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Role & Contact</th>
                                <th className="px-10 py-6 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Department</th>
                                <th className="px-10 py-6 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em]">Status</th>
                                <th className="px-10 py-6 text-[11px] font-extrabold text-text-muted uppercase tracking-[0.15em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light/10">
                            {fetching ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center">
                                        <ProgressLoader progress={progress} label="Loading Members" size="lg" />
                                    </td>
                                </tr>
                            ) : mergedList.length > 0 ? (
                                mergedList.map((member) => (
                                    <tr
                                        key={member.id || member.email}
                                        className="hover:bg-surface-light transition-all group"
                                    >
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                    {member.full_name?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[15px] font-black text-text-main">
                                                        {member.title && <span className="text-text-muted font-medium">{member.title}. </span>}
                                                        {member.full_name || 'Unnamed Member'}
                                                    </p>
                                                    <p className="text-[12px] font-bold text-text-muted">{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="space-y-2">
                                                <span className="px-3 py-1.5 bg-text-main text-bg-light rounded-lg text-[10px] font-extrabold uppercase tracking-wider shadow-sm inline-block">
                                                    {member.role}
                                                </span>
                                                {member.mobile_number && (
                                                    <p className="text-[12px] font-bold text-text-muted">{member.mobile_number}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className="text-text-muted" />
                                                <span className="text-[14px] font-bold text-text-main">{member.department || 'Not set'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                                                member.id ? 'bg-success/10 text-success border-2 border-success/20' : 'bg-warning/10 text-warning border-2 border-warning/20'
                                            }`}>
                                                {member.id ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                {member.id ? 'Active' : 'Pending'}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (member.is_pre_approval) handleDeletePreApproval(member.email);
                                                    else handleDelete(member.id, member.email);
                                                }}
                                                aria-label={`Delete ${member.full_name || member.email}`}
                                                className="p-4 text-text-muted hover:text-danger hover:bg-danger/10 rounded-2xl transition-all border-2 border-transparent hover:border-danger/30 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-10 py-24 text-center">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className="w-20 h-20 bg-surface-light border-2 border-border-light flex items-center justify-center rounded-2xl text-text-muted mx-auto">
                                                <Search size={36} />
                                            </div>
                                            <p className="text-text-muted font-bold text-lg">No members found</p>
                                            <p className="text-text-muted text-sm">Try adjusting your search term</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default SearchMembers;
