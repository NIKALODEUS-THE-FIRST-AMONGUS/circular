import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotify } from '../components/Toaster';
import {
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Loader2,
    UserCheck,
    Phone,
    Hash,
    Building2,
    Calendar,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';

const Approvals = () => {
    const notify = useNotify();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null);
    const [approvingAll, setApprovingAll] = useState(false);

    // Dynamic Progress
    const { progress, complete } = useSimulatedProgress(loading && requests.length === 0, { slowdownPoint: 85 });
    const { progress: actionProgress, complete: completeAction } = useSimulatedProgress(!!actioning, { slowdownPoint: 90 });

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch pending approval requests
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, role, department, full_name, mobile_number, year_of_study, section, avatar_url, created_at')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch error:', error);
                throw error;
            }
            
            setRequests(data || []);
        } catch (err) {
            console.error('Fetch requests error:', err);
            notify(err.message || "Failed to fetch requests", 'error');
        } finally {
            complete();
            setLoading(false);
        }
    }, [notify, complete]);

    useEffect(() => {
        fetchRequests();

        // Real-time listener for new pending requests
        const channel = supabase
            .channel('pending_approvals')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: 'status=eq.pending'
            }, () => {
                fetchRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRequests]);

    const handleApproval = async (id, email, role) => {
        setActioning(id);
        try {
            // Use the RPC function to approve the user (bypasses RLS)
            const { error: rpcError } = await supabase.rpc('approve_user', {
                user_id: id
            });

            if (rpcError) {
                console.error('RPC error:', rpcError);
                throw new Error(`Approval failed: ${rpcError.message}`);
            }

            // Log the action
            await supabase.from('audit_logs').insert({
                action: 'approve_member',
                details: { target: email, role }
            });

            notify(`✓ Account approved for ${email}. They can now log in immediately.`, 'success', {
                duration: 5000
            });
            
            // Refresh the list
            await fetchRequests();
        } catch (err) {
            console.error('Approval error:', err);
            notify(err.message || 'Failed to approve user', 'error');
        } finally {
            completeAction();
            setTimeout(() => setActioning(null), 500);
        }
    };

    const handleDecline = async (id, email) => {
        if (!window.confirm(`WARNING: Declining this request will suspend the identity for ${email}. Are you sure?`)) return;

        setActioning(id);
        try {
            // Use the RPC function to decline the user (bypasses RLS)
            const { error: rpcError } = await supabase.rpc('decline_user', {
                user_id: id
            });

            if (rpcError) {
                console.error('RPC error:', rpcError);
                throw new Error(`Decline failed: ${rpcError.message}`);
            }

            // Log the action
            await supabase.from('audit_logs').insert({
                action: 'decline_member',
                details: { target: email }
            });

            notify(`Request declined for ${email}`, 'error');
            
            // Refresh the list
            await fetchRequests();
        } catch (err) {
            console.error('Decline error:', err);
            notify(err.message || 'Failed to decline user', 'error');
        } finally {
            completeAction();
            setTimeout(() => setActioning(null), 500);
        }
    };
    const handleApproveAll = async () => {
        if (requests.length === 0) {
            notify('No requests to approve', 'info');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ BULK APPROVAL\n\nYou are about to approve ${requests.length} pending request(s).\n\nThis will:\n• Grant immediate access to all pending users\n• Apply basic sanitization to user data\n• Log all approvals in audit trail\n\nContinue with bulk approval?`
        );

        if (!confirmed) return;

        setApprovingAll(true);
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        try {
            // Process approvals sequentially to avoid overwhelming the database
            for (const req of requests) {
                try {
                    // Basic sanitization
                    const sanitizedData = {
                        full_name: req.full_name?.trim().substring(0, 100) || 'User',
                        email: req.email?.toLowerCase().trim(),
                        mobile_number: req.mobile_number?.replace(/[^\d+\-() ]/g, '').substring(0, 20),
                    };

                    // Approve using RPC function
                    const { error: rpcError } = await supabase.rpc('approve_user', {
                        user_id: req.id
                    });

                    if (rpcError) {
                        throw new Error(rpcError.message);
                    }

                    // Update with sanitized data
                    await supabase
                        .from('profiles')
                        .update(sanitizedData)
                        .eq('id', req.id);

                    successCount++;
                } catch (err) {
                    failCount++;
                    errors.push({ email: req.email, error: err.message });
                    console.error(`Failed to approve ${req.email}:`, err);
                }
            }

            // Log bulk approval
            await supabase.from('audit_logs').insert({
                action: 'bulk_approve_members',
                details: {
                    total: requests.length,
                    success: successCount,
                    failed: failCount,
                    errors: errors.length > 0 ? errors : undefined
                }
            });

            if (successCount > 0) {
                notify(
                    `✓ Bulk approval complete: ${successCount} approved${failCount > 0 ? `, ${failCount} failed` : ''}`,
                    failCount > 0 ? 'warning' : 'success',
                    { duration: 6000 }
                );
            }

            if (failCount > 0) {
                console.error('Bulk approval errors:', errors);
            }

            // Refresh the list
            await fetchRequests();
        } catch (err) {
            console.error('Bulk approval error:', err);
            notify('Bulk approval failed: ' + err.message, 'error');
        } finally {
            setApprovingAll(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            <AnimatePresence>
                {(actioning || approvingAll) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white/80 dark:bg-bg-surface/80 backdrop-blur-sm flex items-center justify-center"
                    >
                        <ProgressLoader 
                            progress={actionProgress} 
                            label={approvingAll ? "Processing Bulk Approvals" : "Synchronizing Global Access Levels"} 
                            size="lg" 
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="space-y-4">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.25em]"
                >
                    <ShieldAlert size={14} className="animate-pulse" />
                    <span>Access Control Node</span>
                </motion.div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-black text-text-main tracking-tight"
                    >
                        Pending Approvals<span className="text-primary italic">.</span>
                    </motion.h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchRequests}
                            disabled={loading}
                            className="p-3 bg-bg-light border border-border-light rounded-2xl text-text-muted hover:text-primary transition-all shadow-sm"
                            title="Refresh List"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {requests.length > 0 && (
                            <button
                                onClick={handleApproveAll}
                                disabled={approvingAll || actioning}
                                className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {approvingAll ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Approving All...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Approve All ({requests.length})</span>
                                    </>
                                )}
                            </button>
                        )}
                        <div className="bg-bg-light px-6 py-3 rounded-2xl border border-border-light shadow-sm flex items-center gap-3">
                            <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                            <span className="text-xs font-black uppercase tracking-widest text-text-muted">
                                {requests.length} Requests Awaiting Vetting
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading && requests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-40 space-y-4"
                        >
                            <ProgressLoader progress={progress} label="Decrypting Pending Requests" size="lg" />
                        </motion.div>
                    ) : requests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-bg-light border-2 border-dashed border-border-light rounded-[48px] p-20 text-center space-y-6"
                        >
                            <div className="h-20 w-20 bg-surface-light text-text-dim rounded-3xl flex items-center justify-center mx-auto">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-text-main">All Clear</h2>
                                <p className="text-text-muted font-medium max-w-xs mx-auto">No pending identity requests in the queue.</p>
                            </div>
                        </motion.div>
                    ) : (
                        requests.map((req, idx) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-bg-light rounded-[32px] border border-border-light p-8 shadow-google hover:shadow-google-hover transition-all overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${req.role === 'teacher' ? 'bg-primary/10 text-primary' : 'bg-violet-100 text-violet-600'
                                        }`}>
                                        {req.role} Request
                                    </span>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
                                    <div className="flex items-center gap-6">
                                        <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center text-3xl font-black border-2 ${req.role === 'teacher' ? 'bg-primary/5 text-primary border-primary/10' : 'bg-violet-50 text-violet-600 border-violet-100'
                                            }`}>
                                            {req.full_name?.[0] || '?'}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-text-main">{req.full_name || 'Anonymous User'}</h3>
                                            <div className="flex items-center gap-2 text-text-muted font-bold text-sm">
                                                <span>{req.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 flex-grow">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest">
                                                <Building2 size={14} />
                                                <span>Department Hub</span>
                                            </div>
                                            <p className="font-bold text-text-main">{req.department}</p>
                                        </div>

                                        {req.role === 'student' ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest">
                                                    <Hash size={14} />
                                                    <span>Progression</span>
                                                </div>
                                                <p className="font-bold text-text-main uppercase">{req.year_of_study ? `${req.year_of_study} Year` : 'Batch'} • {req.graduation_batch || 'N/A'}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest">
                                                    <Phone size={14} />
                                                    <span>Contact</span>
                                                </div>
                                                <p className="font-bold text-text-main">{req.mobile_number || 'No Contact'}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest">
                                                <Calendar size={14} />
                                                <span>Requested At</span>
                                            </div>
                                            <p className="font-bold text-text-main">{new Date(req.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full lg:w-auto">
                                        <button
                                            disabled={actioning === req.id}
                                            onClick={() => handleApproval(req.id, req.email, req.role)}
                                            className="flex-grow lg:flex-grow-0 flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-google hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {actioning === req.id ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={18} />}
                                            <span>Approve Identity</span>
                                        </button>
                                        <button
                                            disabled={actioning === req.id}
                                            onClick={() => handleDecline(req.id, req.email)}
                                            className="flex items-center justify-center p-4 text-text-dim hover:text-danger hover:bg-danger/5 rounded-2xl transition-all border border-transparent hover:border-danger/10"
                                            title="Decline and Suspend"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Approvals;
