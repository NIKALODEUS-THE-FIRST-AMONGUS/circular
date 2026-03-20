import { memo, useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Circular Stats Component
 * Displays role-specific statistics cards
 * Extracted from CircularCenter for better maintainability
 */
const CircularStats = memo(({
  profile,
  stats = {},
  circulars = [],
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile?.role !== 'student' && profile?.role !== 'teacher') return;
    
    // Function to calculate unread from localStorage
    const calculateUnread = () => {
        if (!profile?.id) return;
        const readList = JSON.parse(localStorage.getItem(`read_notifications_${profile.id}`) || '[]');
        const unread = circulars.filter(c => !readList.includes(c.id)).length;
        setUnreadCount(unread);
    };

    // Calculate immediately
    calculateUnread();

    // Listen for custom mark-as-read events or cross-tab storage changes
    const handleStorageChange = () => calculateUnread();
    
    window.addEventListener('circularRead', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('circularRead', handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [circulars, profile?.id, profile?.role]);

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="grid grid-cols-2 gap-4 w-full lg:w-auto"
    >
      {profile.role === 'admin' ? (
        <>
          <RouterLink 
            to="/dashboard/approvals" 
            className="group relative p-6 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`View ${stats.pendingApprovals || 0} pending approvals`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/70 group-hover:text-primary transition-colors">Approvals</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-primary">{stats.pendingApprovals || 0}</p>
          </RouterLink>
          <div 
            className="group relative p-6 rounded-2xl bg-success/5 hover:bg-success/10 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`Total users: ${stats.totalUsers || 0}`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-success/70 group-hover:text-success transition-colors">Total Users</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-success">{stats.totalUsers || 0}</p>
          </div>
        </>
      ) : profile.role === 'teacher' ? (
        <>
          <RouterLink 
            to="/dashboard/my-posts" 
            className="group relative p-6 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`View your ${stats.myPosts || 0} posts`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/70 group-hover:text-primary transition-colors">Posts</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-primary">{stats.myPosts || 0}</p>
          </RouterLink>
          <div 
            className="group relative p-6 rounded-2xl bg-warning/5 hover:bg-warning/10 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`${stats.todayCount || 0} broadcasts today`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-warning/70 group-hover:text-warning transition-colors">Today</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-warning">{stats.todayCount || 0}</p>
          </div>
        </>
      ) : (
        <>
          <div 
            className="group relative p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`${circulars.length} total broadcasts`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted group-hover:text-text-main transition-colors">TOTAL CIRCULARS</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-text-main">{circulars.length}</p>
          </div>
          <div 
            className="group relative p-6 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-300 min-w-[140px] text-center"
            aria-label={`${unreadCount} unread circulars`}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500/70 group-hover:text-amber-500 transition-colors">UNREAD</p>
            <p className="text-4xl md:text-5xl font-black tracking-tighter mt-1 text-amber-500">
              {unreadCount}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.profile?.role === nextProps.profile?.role &&
    prevProps.stats.pendingApprovals === nextProps.stats.pendingApprovals &&
    prevProps.stats.totalUsers === nextProps.stats.totalUsers &&
    prevProps.stats.myPosts === nextProps.stats.myPosts &&
    prevProps.stats.todayCount === nextProps.stats.todayCount &&
    prevProps.circulars.length === nextProps.circulars.length
  );
});

CircularStats.displayName = 'CircularStats';

export default CircularStats;
