import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocuments, deleteDocument } from '../lib/firebase-db';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../components/Toaster';
import SelectableCircularCard from '../components/SelectableCircularCard';
import CircularList from '../components/CircularList';
import CircularFilterDropdown from '../components/CircularFilterDropdown';
import CircularStats from '../components/CircularStats';
import CircularHeader from '../components/CircularHeader';
import CircularSearchBar from '../components/CircularSearchBar';
import CircularEmptyState from '../components/CircularEmptyState';
import CircularDeleteModal from '../components/CircularDeleteModal';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import AdvancedFilters from '../components/AdvancedFilters';
import {
    Search, RefreshCw, X, AlertTriangle,
    Loader2, ShieldAlert, Layers, Check, Trash2
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

            // Filter out ghost circulars - documents that appear in queries but don't have valid data
            const GHOST_IDS = ['dOgZ9Aks5NjHXsMOFQ9L']; // Known ghost circular IDs
            allCirculars = allCirculars.filter(circular => {
                // Exclude known ghost IDs
                if (GHOST_IDS.includes(circular.id)) {
                    console.warn('Filtering out ghost circular:', circular.id);
                    return false;
                }
                // Must have required fields to be valid
                if (!circular.id || !circular.title || !circular.created_at) {
                    console.warn('Filtering out invalid circular:', circular.id);
                    return false;
                }
                return true;
            });

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
                        <CircularHeader profile={profile} />

                        <CircularStats
                            profile={profile}
                            stats={stats}
                            circulars={circulars}
                        />
                    </div>
                </div>

                {/* ── Search + Filter Row ──────────────────────────────── */}
                <CircularSearchBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onRefresh={refetch}
                  loading={loading}
                  loadingMore={loadingMore}
                  selectedDept={selectedDept}
                  onDeptChange={setSelectedDept}
                  priorityFilter={priorityFilter}
                  onPriorityChange={setPriorityFilter}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  isAdmin={profile?.role === 'admin'}
                  onDeleteAllClick={() => setShowDeleteConfirm(true)}
                />


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
                <CircularEmptyState
                  searchTerm={searchTerm}
                  selectedDept={selectedDept}
                  priorityFilter={priorityFilter}
                  profile={profile}
                  onResetFilters={() => { setSelectedDept('ALL'); setPriorityFilter('all'); setSearchTerm(''); }}
                />
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

                        <CircularList
                            circulars={filteredCirculars}
                            profile={profile}
                            onDelete={handleDelete}
                            onUpdate={handleUpdate}
                            selectionMode={selectionMode}
                            selectedCirculars={selectedCirculars}
                            onSelect={handleSelectCircular}
                            loading={false}
                            hasMore={hasMore && !searchTerm}
                            loadingMore={loadingMore}
                            onLoadMore={fetchMore}
                            isEmpty={filteredCirculars.length === 0}
                            onCreateClick={() => window.location.href = '/dashboard/create'}
                        />
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            <CircularDeleteModal
              isOpen={showDeleteConfirm}
              isDeleting={isDeletingAll}
              onConfirm={handleDeleteAll}
              onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

export default CircularCenter;
