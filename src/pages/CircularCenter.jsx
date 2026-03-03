import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocuments, deleteDocument } from '../lib/firebase-db';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../components/Toaster';
import SelectableCircularCard from '../components/SelectableCircularCard';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import AdvancedFilters from '../components/AdvancedFilters';
import {
    Search, RefreshCw, X, SlidersHorizontal, ChevronDown,
    Loader2, ShieldAlert, Layers, Check, Trash2, AlertTriangle
} from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { useCachedQuery } from '../hooks/useCachedQuery';
import { useDebounce } from '../hooks/useDebounce';
import { performanceMonitor } from '../utils/performanceMonitor';
import { useCircularFeatures } from '../hooks/useCircularFeatures';

const DEPARTMENTS = [
    { id: 'ALL', label: 'All Hubs', emoji: '🌐' },
    { id: 'CSE', label: 'CSE', emoji: '💻' },
    { id: 'AIDS', label: 'AIDS', emoji: '🤖' },
    { id: 'AIML', label: 'AIML', emoji: '🧠' },
    { id: 'ECE', label: 'ECE', emoji: '⚡' },
    { id: 'EEE', label: 'EEE', emoji: '🔌' },
    { id: 'MECH', label: 'MECH', emoji: '⚙️' },
    { id: 'CIVIL', label: 'CIVIL', emoji: '🏛️' },
];

const CircularCenter = ({ externalSearchTerm = '' }) => {
    const { profile, user } = useAuth();
    const notify = useNotify();
    const location = useLocation();
    const circularFeatures = useCircularFeatures(user?.id);
    
    const [circulars, setCirculars] = useState([]);
    // ... rest of the states
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Bulk operations state
    const [selectedCirculars, setSelectedCirculars] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    
    // Advanced filters state
    const [advancedFilters, setAdvancedFilters] = useState(null);
    
    // Debounced search - like Google, Amazon
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Track component performance
    useEffect(() => {
        performanceMonitor.mark('circular_center_mount');
        return () => {
            performanceMonitor.measure('CircularCenter Lifetime', 'circular_center_mount');
        };
    }, []);

    // Dynamic Progress
    const { progress, complete } = useSimulatedProgress(loading && !loadingMore && circulars.length === 0, { slowdownPoint: 88 });

    useEffect(() => {
        setSearchTerm(externalSearchTerm);
    }, [externalSearchTerm]);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const PAGE_SIZE = 10;
    const [stats, setStats] = useState({
        pendingApprovals: 0,
        totalUsers: 0,
        myPosts: 0,
        todayCount: 0
    });

    const fetchStats = useCallback(async () => {
        if (!profile) return;
        
        // Prevent multiple simultaneous calls
        if (fetchStats.isRunning) return;
        fetchStats.isRunning = true;

        try {
            // Consolidate all stats queries into a single parallel fetch
            const queries = [];
            
            // Always fetch today's count
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            queries.push(
                getDocuments('circulars', {
                    where: [['created_at', '>=', today.toISOString()]]
                }).then(docs => docs.length)
            );

            if (profile.role === 'admin') {
                // Add admin-specific queries
                queries.push(
                    getDocuments('profiles', {
                        where: [['status', '==', 'pending']]
                    }).then(docs => docs.length),
                    getDocuments('profiles').then(docs => docs.length)
                );
            } else if (profile.role === 'teacher') {
                // Add teacher-specific query
                queries.push(
                    getDocuments('circulars', {
                        where: [['author_id', '==', user.uid]]
                    }).then(docs => docs.length)
                );
            }

            // Execute all queries in parallel
            const results = await Promise.all(queries);

            // Parse results based on role
            const newStats = { todayCount: results[0] || 0 };
            
            if (profile.role === 'admin') {
                newStats.pendingApprovals = results[1] || 0;
                newStats.totalUsers = results[2] || 0;
            } else if (profile.role === 'teacher') {
                newStats.myPosts = results[1] || 0;
            }

            setStats(prev => ({ ...prev, ...newStats }));
        } catch {
            // console.error("Stats Fetch Error");
        } finally {
            fetchStats.isRunning = false;
        }
    }, [profile, user]);

    useEffect(() => { 
        if (profile) {
            fetchStats(); 
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id, profile?.role]); // Only re-run when profile ID or role changes

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // --- Firebase Data Fetching with Client-Side Filtering ---
    const fetchPage = useCallback(async (pageNum = 0, retryCount = 0) => {
        try {
            // Fetch all circulars (Firebase doesn't support complex pagination like Supabase)
            const filters = {
                orderBy: ['created_at', 'desc']
            };

            // Apply date range filter if present
            if (advancedFilters?.dateRange && advancedFilters.dateRange !== 'all') {
                const now = new Date();
                let startDate;
                
                if (advancedFilters.dateRange === 'today') {
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                } else if (advancedFilters.dateRange === 'week') {
                    startDate = new Date(now.setDate(now.getDate() - 7));
                } else if (advancedFilters.dateRange === 'month') {
                    startDate = new Date(now.setDate(now.getDate() - 30));
                } else if (advancedFilters.dateRange === 'custom' && advancedFilters.customStartDate) {
                    startDate = new Date(advancedFilters.customStartDate);
                }
                
                if (startDate) {
                    filters.where = [['created_at', '>=', startDate.toISOString()]];
                }
            }

            let allCirculars = await getDocuments('circulars', filters);

            // Client-side filtering (Firebase doesn't support all Supabase query operations)
            allCirculars = allCirculars.filter(circular => {
                // Department filter
                if (selectedDept !== 'ALL') {
                    if (circular.department_target !== 'ALL' && circular.department_target !== selectedDept) {
                        return false;
                    }
                }

                // Role-based filters
                if (profile && profile.role !== 'admin') {
                    const deptMatch = circular.department_target === 'ALL' || circular.department_target === profile.department;
                    const yearMatch = circular.target_year === 'ALL' || circular.target_year === profile.year_of_study;
                    const sectionMatch = circular.target_section === 'ALL' || circular.target_section === profile.section;
                    
                    if (!deptMatch || !yearMatch || !sectionMatch) {
                        return false;
                    }
                }

                // Priority filter
                if (priorityFilter === 'important' && circular.priority !== 'important') {
                    return false;
                }

                // Author filter
                if (advancedFilters?.author) {
                    const authorLower = advancedFilters.author.toLowerCase();
                    if (!circular.author_name?.toLowerCase().includes(authorLower)) {
                        return false;
                    }
                }

                // Custom end date filter
                if (advancedFilters?.dateRange === 'custom' && advancedFilters.customEndDate) {
                    const endDate = new Date(advancedFilters.customEndDate);
                    endDate.setHours(23, 59, 59, 999);
                    if (new Date(circular.created_at) > endDate) {
                        return false;
                    }
                }

                return true;
            });

            // Sort based on advanced filters
            if (advancedFilters?.sortBy === 'oldest') {
                allCirculars.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } else if (advancedFilters?.sortBy === 'most_viewed') {
                allCirculars.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            } else {
                allCirculars.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            // Implement pagination client-side
            const from = pageNum * PAGE_SIZE;
            const to = from + PAGE_SIZE;
            const paginatedData = allCirculars.slice(from, to);

            return paginatedData;
        } catch (error) {
            // Retry up to 2 times with exponential backoff
            if (retryCount < 2) {
                const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchPage(pageNum, retryCount + 1);
            }
            throw error;
        }
    }, [selectedDept, priorityFilter, profile, advancedFilters]);

    const { isLoading: queryLoading, refetch } = useCachedQuery(
        `circulars_${selectedDept}_${priorityFilter}_${JSON.stringify(advancedFilters)}`,
        () => fetchPage(0),
        {
            staleTime: 300000, // 5 minutes - increased from 1 minute
            onSuccess: (data) => {
                // Only update if we have data to prevent flickering
                if (data) {
                    setCirculars(data);
                    setPage(0);
                    setHasMore(data.length === PAGE_SIZE);
                    complete();
                }
            }
        }
    );

    // Sync loading states - but don't clear circulars during filter changes
    useEffect(() => {
        if (!loadingMore) {
            // Only show loading if we have no circulars yet
            if (circulars.length === 0) {
                setLoading(queryLoading);
            } else {
                // We have data, so just show a subtle loading state
                setLoading(false);
            }
        }
    }, [queryLoading, loadingMore, circulars.length]);

    // Handle refresh from navigation state (after posting)
    useEffect(() => {
        if (location.state?.refresh) {
            refetch();
            // Clear the state to prevent repeated refreshes
            window.history.replaceState({}, document.title);
        }
    }, [location.state, refetch]);

    // Realtime subscription for new circulars - DISABLED to prevent console freeze
    // TODO: Re-enable after optimizing
    /*
    useEffect(() => {
        if (!profile) return;

        const channel = supabase
            .channel('circulars_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'circulars'
                },
                (payload) => {
                    const newCircular = payload.new;
                    let shouldAdd = true;

                    // Department filter
                    if (selectedDept !== 'ALL') {
                        shouldAdd = newCircular.department_target === 'ALL' || newCircular.department_target === selectedDept;
                    }

                    // Priority filter
                    if (priorityFilter === 'important') {
                        shouldAdd = shouldAdd && newCircular.priority === 'important';
                    }

                    // User role filters
                    if (profile.role !== 'admin') {
                        const deptMatch = newCircular.department_target === 'ALL' || newCircular.department_target === profile.department;
                        const yearMatch = newCircular.target_year === 'ALL' || newCircular.target_year === profile.year_of_study;
                        const sectionMatch = newCircular.target_section === 'ALL' || newCircular.target_section === profile.section;
                        shouldAdd = shouldAdd && deptMatch && yearMatch && sectionMatch;
                    }

                    if (shouldAdd) {
                        setCirculars(prev => [newCircular, ...prev]);
                        notify('New circular posted!', 'info', {
                            description: newCircular.title
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile, selectedDept, priorityFilter, notify]);
    */

    const fetchMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await fetchPage(nextPage);
            setCirculars(prev => [...prev, ...data]);
            setPage(nextPage);
            setHasMore(data.length === PAGE_SIZE);
        } catch {
            notify("Failed to load more circulars", "error");
        } finally {
            setLoadingMore(false);
        }
    };

    // Removal of old fetchCirculars logic since it's replaced by fetchPage and useCachedQuery hooks

    const filteredCirculars = useMemo(() => {
        if (!debouncedSearchTerm) return circulars;
        const lower = debouncedSearchTerm.toLowerCase();
        return circulars.filter(c =>
            c.title?.toLowerCase().includes(lower) ||
            c.content?.toLowerCase().includes(lower) ||
            c.author_name?.toLowerCase().includes(lower)
        );
    }, [circulars, debouncedSearchTerm]);

    const handleDelete = (id) => setCirculars(prev => prev.filter(c => c.id !== id));
    const handleUpdate = (updated) => setCirculars(prev => prev.map(c => c.id === updated.id ? updated : c));

    // Bulk operations handlers
    const handleSelectCircular = useCallback((id) => {
        setSelectedCirculars(prev => 
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    }, []);

    const handleClearSelection = useCallback(() => {
        setSelectedCirculars([]);
        setSelectionMode(false);
    }, []);

    const handleBulkMarkRead = useCallback(async () => {
        await circularFeatures.markAllAsRead(selectedCirculars);
        handleClearSelection();
    }, [selectedCirculars, circularFeatures, handleClearSelection]);

    const handleBulkDelete = useCallback(async () => {
        const success = await circularFeatures.bulkDelete(selectedCirculars);
        if (success) {
            setCirculars(prev => prev.filter(c => !selectedCirculars.includes(c.id)));
            handleClearSelection();
        }
    }, [selectedCirculars, circularFeatures, handleClearSelection]);

    const handleBulkArchive = useCallback(async () => {
        const success = await circularFeatures.bulkArchive(selectedCirculars, true);
        if (success) {
            setCirculars(prev => prev.filter(c => !selectedCirculars.includes(c.id)));
            handleClearSelection();
        }
    }, [selectedCirculars, circularFeatures, handleClearSelection]);

    const handleBulkUnarchive = useCallback(async () => {
        const success = await circularFeatures.bulkArchive(selectedCirculars, false);
        if (success) {
            handleClearSelection();
        }
    }, [selectedCirculars, circularFeatures, handleClearSelection]);

    // Advanced filters handlers
    const handleApplyFilters = useCallback((filters) => {
        setAdvancedFilters(filters);
    }, []);

    const handleClearFilters = useCallback(() => {
        setAdvancedFilters(null);
    }, []);

    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteAll = async () => {
        if (profile?.role !== 'admin') return;
        setIsDeletingAll(true);
        try {
            // Get all circulars and delete them
            const allCirculars = await getDocuments('circulars');
            await Promise.all(allCirculars.map(c => deleteDocument('circulars', c.id)));

            setCirculars([]);
            notify("Institutional Reset Complete", "success", {
                description: "All circular broadcasts have been deleted from the system."
            });
            setShowDeleteConfirm(false);
            
            // Trigger refresh to update the UI
            refetch();
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setIsDeletingAll(false);
        }
    };

    // Real-time updates - DISABLED to prevent console freeze
    // TODO: Re-enable after optimizing
    /*
    useEffect(() => {
        if (!profile) return;

        const channel = supabase
            .channel('circulars_feed')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'circulars' 
            }, (payload) => {
                const np = payload.new;
                const deptMatch = np.department_target === 'ALL' || np.department_target === profile?.department;
                const yearMatch = np.target_year === 'ALL' || np.target_year === profile?.year_of_study;
                const sectionMatch = np.target_section === 'ALL' || np.target_section === profile?.section;

                if (deptMatch && yearMatch && sectionMatch) {
                    setCirculars(prev => {
                        // Prevent duplicates
                        if (prev.find(c => c.id === np.id)) return prev;
                        notify(`New Circular: ${np.title}`, 'info');
                        return [{ ...np, isNew: true }, ...prev];
                    });
                }
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'circulars' 
            }, (payload) => {
                setCirculars(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
            })
            .on('postgres_changes', { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'circulars' 
            }, (payload) => {
                setCirculars(prev => prev.filter(c => c.id !== payload.old.id));
            })
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id, profile?.department, profile?.year_of_study, profile?.section, notify]);
    */

    const activeFilterCount = (selectedDept !== 'ALL' ? 1 : 0) + (priorityFilter === 'important' ? 1 : 0);
    const selectedDeptObj = DEPARTMENTS.find(dept => dept.id === selectedDept);

    return (
        <div className="max-w-5xl mx-auto space-y-6 py-8 px-4 lg:px-0">
            {/* Bulk Actions Toolbar - Moved to Top */}
            <BulkActionsToolbar
                selectedCount={selectedCirculars.length}
                onMarkAllRead={handleBulkMarkRead}
                onDelete={handleBulkDelete}
                onArchive={handleBulkArchive}
                onUnarchive={handleBulkUnarchive}
                onClear={handleClearSelection}
                showArchive={true}
            />

            <header className="space-y-6">
                <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-br from-bg-light to-surface-light border border-border-light shadow-lg">
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
                                <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.25em]">
                                    {profile?.role === 'admin' ? 'Administrative Node' : profile?.role === 'teacher' ? 'Faculty Portal' : 'Student Hub'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-5xl md:text-6xl font-black text-text-main tracking-tighter leading-none flex flex-wrap items-baseline gap-x-3">
                                    <span className="opacity-90">Circular</span>
                                    <span className="text-primary uppercase">Center</span>
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-primary"
                                    >
                                        .
                                    </motion.span>
                                    {/* Small Indian Flag */}
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="inline-flex h-8 w-12 rounded-md overflow-hidden shadow-md border-2 border-border-light/50 ml-2 relative"
                                    >
                                        <div className="h-full w-full flex flex-col">
                                            <div className="h-[33.33%] bg-[#FF9933]"></div>
                                            <div className="h-[33.33%] bg-white relative flex items-center justify-center">
                                                <div className="absolute w-4 h-4 rounded-full border-2 border-[#000080] flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#000080]"></div>
                                                </div>
                                            </div>
                                            <div className="h-[33.33%] bg-[#138808]"></div>
                                        </div>
                                    </motion.div>
                                </h1>
                                <p className="text-text-muted font-semibold text-base md:text-lg max-w-2xl leading-relaxed">
                                    {profile?.role === 'admin'
                                        ? "System metrics and approvals consolidated."
                                        : `Accessing broadcasts for ${profile?.department || 'all'} departments.`
                                    }
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="grid grid-cols-2 gap-4 w-full lg:w-auto"
                        >
                            {profile?.role === 'admin' ? (
                                <>
                                    <RouterLink 
                                        to="/dashboard/approvals" 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 min-w-[140px]"
                                        aria-label={`View ${stats.pendingApprovals} pending approvals`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary/70 group-hover:text-primary transition-colors">Waitlist</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-primary">{stats.pendingApprovals}</p>
                                    </RouterLink>
                                    <div 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 hover:border-success hover:shadow-xl hover:shadow-success/20 transition-all duration-300 min-w-[140px]"
                                        aria-label={`Total users: ${stats.totalUsers}`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-success/70 group-hover:text-success transition-colors">Total Users</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-success">{stats.totalUsers}</p>
                                    </div>
                                </>
                            ) : profile?.role === 'teacher' ? (
                                <>
                                    <RouterLink 
                                        to="/dashboard/my-posts" 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 min-w-[140px]"
                                        aria-label={`View your ${stats.myPosts} posts`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary/70 group-hover:text-primary transition-colors">Posts</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-primary">{stats.myPosts}</p>
                                    </RouterLink>
                                    <div 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/20 hover:border-warning hover:shadow-xl hover:shadow-warning/20 transition-all duration-300 min-w-[140px]"
                                        aria-label={`${stats.todayCount} broadcasts today`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-warning/70 group-hover:text-warning transition-colors">Today</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-warning">{stats.todayCount}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-surface-light to-bg-light border-2 border-border-light hover:border-primary/40 hover:shadow-xl transition-all duration-300 min-w-[140px]"
                                        aria-label={`${circulars.length} total broadcasts`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-text-muted group-hover:text-text-main transition-colors">Broadcasts</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-text-main">{circulars.length}</p>
                                    </div>
                                    <div 
                                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-danger/10 to-danger/5 border-2 border-danger/20 hover:border-danger hover:shadow-xl hover:shadow-danger/20 transition-all duration-300 min-w-[140px]"
                                        aria-label={`${circulars.filter(c => c.priority === 'important').length} high priority alerts`}
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-danger/70 group-hover:text-danger transition-colors">Alerts</p>
                                        <p className="text-5xl font-black tracking-tighter mt-2 text-danger">
                                            {circulars.filter(c => c.priority === 'important').length}
                                        </p>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* ── Search + Filter Row ──────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex gap-4 items-center"
                >
                    {/* Search bar */}
                    <div className="flex-1 flex items-center gap-3 bg-surface-light px-6 py-3.5 rounded-xl border border-border-light focus-within:border-primary/30 focus-within:shadow-md transition-all duration-300 group">
                        <Search size={18} className="text-text-muted group-focus-within:text-primary transition-colors shrink-0" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search broadcasts, topics, or faculty..."
                            className="bg-transparent border-none text-[14px] font-medium text-text-main focus:ring-0 outline-none w-full placeholder:text-text-muted/50"
                        />
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    onClick={() => setSearchTerm('')}
                                    className="p-1 text-text-muted hover:text-danger rounded-full transition-all shrink-0"
                                >
                                    <X size={16} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={refetch}
                        title="Refresh circulars"
                        aria-label="Refresh circulars"
                        className="h-12 min-w-[48px] px-4 bg-bg-light border-2 border-border-light rounded-xl text-text-main hover:text-primary hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-main"
                    >
                        <RefreshCw size={20} className={loading && !loadingMore ? 'animate-spin' : ''} />
                    </button>

                    {/* Advanced Filters */}
                    <AdvancedFilters 
                        onApply={handleApplyFilters}
                        onClear={handleClearFilters}
                    />

                    {profile?.role === 'admin' && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            title="Delete All Circulars"
                            aria-label="Delete all circulars from system"
                            className="h-12 px-5 bg-danger/10 border-2 border-danger/30 rounded-xl text-danger hover:bg-danger hover:text-white hover:border-danger hover:shadow-lg hover:shadow-danger/30 transition-all duration-200 flex items-center gap-2.5 group font-bold focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-main"
                        >
                            <Trash2 size={20} />
                            <span className="hidden md:inline text-[12px] font-extrabold uppercase tracking-[0.12em]">Delete All</span>
                        </button>
                    )}

                    {/* Filter dropdown trigger */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setFilterOpen(v => !v)}
                            aria-label={`Filter circulars${activeFilterCount > 0 ? `, ${activeFilterCount} active filters` : ''}`}
                            aria-expanded={filterOpen}
                            className={`relative flex items-center gap-2.5 px-6 h-12 rounded-xl border-2 font-extrabold text-[13px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-main ${filterOpen || activeFilterCount > 0
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 focus:ring-primary'
                                : 'bg-bg-light text-text-main border-border-light hover:border-primary hover:text-primary hover:bg-primary/5 hover:shadow-md focus:ring-primary'
                                }`}
                        >
                            <SlidersHorizontal size={18} />
                            <span className="tracking-wide">Filter</span>
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-white/25 text-[11px] font-black" aria-label={`${activeFilterCount} filters active`}>
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* ── Dropdown Panel ───────────────────────────── */}
                        <AnimatePresence>
                            {filterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    className="absolute right-0 top-[calc(100%+12px)] z-50 bg-bg-light border border-border-light rounded-2xl shadow-xl p-6 w-80"
                                >
                                    {/* Arrow */}
                                    <div className="absolute -top-2 right-6 w-4 h-4 bg-bg-light border-l border-t border-border-light rotate-45 rounded-sm" />

                                    {/* Dept Section */}
                                    <div className="space-y-3 mb-5">
                                        <div className="flex items-center gap-2">
                                            <Layers size={13} className="text-text-muted" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Department Hub</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {DEPARTMENTS.map(dept => (
                                                <button
                                                    key={dept.id}
                                                    onClick={() => { setSelectedDept(dept.id); }}
                                                    aria-label={`Filter by ${dept.label} department`}
                                                    aria-pressed={selectedDept === dept.id}
                                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold transition-all border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-light ${selectedDept === dept.id
                                                        ? 'bg-primary/15 text-primary border-primary/40 shadow-md'
                                                        : 'bg-surface-light text-text-main border-transparent hover:border-border-light hover:bg-bg-light'
                                                        }`}
                                                >
                                                    <span className="text-base">{dept.emoji}</span>
                                                    <span className="flex-1 text-left">{dept.label}</span>
                                                    {selectedDept === dept.id && <Check size={14} className="text-primary shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-outline/50 mb-5" />

                                    {/* Priority Section */}
                                    <div className="space-y-3 mb-5">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert size={13} className="text-text-muted" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Priority</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'all', label: 'All' },
                                                { id: 'important', label: '🔴 High Priority' },
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setPriorityFilter(p.id)}
                                                    aria-label={`Filter by ${p.label} priority`}
                                                    aria-pressed={priorityFilter === p.id}
                                                    className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-light ${priorityFilter === p.id
                                                        ? p.id === 'important'
                                                            ? 'bg-danger/15 text-danger border-danger/40 shadow-md focus:ring-danger'
                                                            : 'bg-primary/15 text-primary border-primary/40 shadow-md focus:ring-primary'
                                                        : 'bg-surface-light text-text-main border-transparent hover:border-border-light hover:bg-bg-light focus:ring-primary'
                                                        }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reset */}
                                    {activeFilterCount > 0 && (
                                        <button
                                            onClick={() => { setSelectedDept('ALL'); setPriorityFilter('all'); setFilterOpen(false); }}
                                            aria-label="Clear all filters"
                                            className="w-full py-3 rounded-xl text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-main hover:text-danger hover:bg-danger/10 border-2 border-border-light hover:border-danger/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-light"
                                        >
                                            Clear all filters
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Active filter pills */}
                <AnimatePresence>
                    {activeFilterCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-wrap gap-2"
                        >
                            {selectedDept !== 'ALL' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary rounded-full text-[12px] font-bold border-2 border-primary/30 shadow-sm"
                                >
                                    <span className="text-base">{selectedDeptObj?.emoji}</span>
                                    <span>{selectedDeptObj?.label}</span>
                                    <button 
                                        onClick={() => setSelectedDept('ALL')} 
                                        aria-label={`Remove ${selectedDeptObj?.label} filter`}
                                        className="hover:text-danger ml-1 transition-colors p-0.5 rounded-full hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.span>
                            )}
                            {priorityFilter === 'important' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-danger/15 text-danger rounded-full text-[12px] font-bold border-2 border-danger/30 shadow-sm"
                                >
                                    🔴 High Priority
                                    <button 
                                        onClick={() => setPriorityFilter('all')} 
                                        aria-label="Remove high priority filter"
                                        className="hover:text-danger/70 ml-1 transition-colors p-0.5 rounded-full hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.span>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ── Feed ────────────────────────────────────────────────── */}
            {loading && !loadingMore && circulars.length === 0 ? (
                <div className="py-20 flex items-center justify-center">
                    <ProgressLoader
                        progress={progress}
                        label="Decrypting Institutional Archives"
                        size="lg"
                    />
                </div>
            ) : filteredCirculars.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-bg-light rounded-[40px] border border-border-light shadow-google py-16 px-10 flex flex-col items-center justify-center text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center text-text-muted border border-border-light/60 text-3xl">
                        📭
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                        <h3 className="text-xl font-black text-text-main">No broadcasts match your view</h3>
                        <p className="text-text-muted font-medium text-sm">
                            Try clearing filters or adjusting your department and priority to see more activity.
                        </p>
                    </div>
                    <button
                        onClick={() => { setSelectedDept('ALL'); setPriorityFilter('all'); setSearchTerm(''); }}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary/90 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-main"
                        aria-label="Reset all filters"
                    >
                        Reset filters
                    </button>
                </motion.div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-text-muted">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-[0.22em]">
                                Live Broadcast Feed
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-text-dim">
                            {filteredCirculars.length} update{filteredCirculars.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="bg-bg-light rounded-[40px] border border-border-light shadow-google">
                        <div className="px-6 py-4 border-b border-[#f1f3f4] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-text-main" />
                                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-text-main">
                                    Activity Stream
                                </p>
                            </div>
                            <p className="text-[11px] text-text-dim font-medium">
                                {advancedFilters ? (
                                    <>
                                        {/* Sort Order */}
                                        {advancedFilters.sortBy === 'oldest' && 'Oldest first'}
                                        {advancedFilters.sortBy === 'most_viewed' && 'Most viewed'}
                                        {(!advancedFilters.sortBy || advancedFilters.sortBy === 'newest') && 'Newest first'}
                                        
                                        {/* Date Range */}
                                        {advancedFilters.dateRange && advancedFilters.dateRange !== 'all' && (
                                            <>
                                                {' • '}
                                                {advancedFilters.dateRange === 'today' && 'Today'}
                                                {advancedFilters.dateRange === 'week' && 'Last 7 days'}
                                                {advancedFilters.dateRange === 'month' && 'Last 30 days'}
                                                {advancedFilters.dateRange === 'custom' && advancedFilters.customStartDate && advancedFilters.customEndDate && (
                                                    `${new Date(advancedFilters.customStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(advancedFilters.customEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                                )}
                                                {advancedFilters.dateRange === 'custom' && advancedFilters.customStartDate && !advancedFilters.customEndDate && (
                                                    `From ${new Date(advancedFilters.customStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    'Newest first'
                                )}
                            </p>
                        </div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
                            }}
                            className="divide-y divide-border-light/60"
                        >
                            {filteredCirculars.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6 }}
                                    className="flex flex-col items-center justify-center py-20 px-6 text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2, duration: 0.5 }}
                                        className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6"
                                    >
                                        <Layers size={40} className="text-primary" />
                                    </motion.div>
                                    <h3 className="text-2xl font-black text-text-main mb-3">
                                        {searchTerm ? 'No Results Found' : 'No Circulars Yet'}
                                    </h3>
                                    <p className="text-text-muted font-medium text-base max-w-md mb-8">
                                        {searchTerm 
                                            ? `We couldn't find any circulars matching "${searchTerm}". Try adjusting your search.`
                                            : selectedDept !== 'ALL' || priorityFilter !== 'all'
                                            ? 'No circulars match your current filters. Try adjusting them.'
                                            : profile?.role === 'teacher' || profile?.role === 'admin'
                                            ? 'Be the first to broadcast important information to your community.'
                                            : 'Your circular feed is empty. Check back soon for updates!'
                                        }
                                    </p>
                                    {(profile?.role === 'teacher' || profile?.role === 'admin') && !searchTerm && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => window.location.href = '/dashboard/create'}
                                            className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:shadow-lg transition-all"
                                        >
                                            <Layers size={18} />
                                            Create Your First Circular
                                        </motion.button>
                                    )}
                                </motion.div>
                            ) : (
                                filteredCirculars.map(circular => (
                                    <motion.div
                                        key={circular.id}
                                        variants={{
                                            hidden: { y: 16, opacity: 0 },
                                            visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 18 } }
                                        }}
                                        layout
                                        className="px-6 py-5 bg-bg-light/30 backdrop-blur-md hover:bg-surface-light/40 transition-all"
                                    >
                                        <SelectableCircularCard
                                            circular={circular}
                                            profile={profile}
                                            onDelete={handleDelete}
                                            onUpdate={handleUpdate}
                                            selectionMode={selectionMode}
                                            isSelected={selectedCirculars.includes(circular.id)}
                                            onSelect={handleSelectCircular}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </motion.div>

                        {hasMore && !searchTerm && (
                            <div className="flex justify-center px-6 py-4 border-t border-[#f1f3f4] bg-surface-light/60">
                                <button
                                    onClick={fetchMore}
                                    disabled={loadingMore}
                                    aria-label="Load more circulars"
                                    className="px-10 py-3 bg-primary/10 text-primary rounded-xl font-extrabold text-[12px] uppercase tracking-[0.12em] flex items-center gap-2.5 hover:bg-primary hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-primary/30 hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light"
                                >
                                    {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
                                    {loadingMore ? 'Loading...' : 'Load older updates'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeletingAll && setShowDeleteConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-bg-light w-full max-w-md rounded-[32px] p-8 border border-border-light shadow-2xl space-y-8"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-16 w-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-text-main tracking-tight">Delete All Circulars?</h3>
                                    <p className="text-text-muted font-medium text-sm">
                                        This action will permanently delete <span className="text-danger font-bold">ALL</span> circular broadcasts from the system. This cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    disabled={isDeletingAll}
                                    onClick={() => setShowDeleteConfirm(false)}
                                    aria-label="Cancel delete operation"
                                    className="flex-1 h-14 bg-surface-light text-text-main rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-border-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-border-light focus:outline-none focus:ring-2 focus:ring-text-main focus:ring-offset-2 focus:ring-offset-bg-light"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isDeletingAll}
                                    onClick={handleDeleteAll}
                                    aria-label="Confirm delete all circulars"
                                    className="flex-1 h-14 bg-danger text-white rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-danger/90 transition-all duration-200 shadow-lg shadow-danger/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 border-2 border-danger hover:border-danger/80 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-light"
                                >
                                    {isDeletingAll ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    {isDeletingAll ? 'Deleting...' : 'Delete All'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CircularCenter;
