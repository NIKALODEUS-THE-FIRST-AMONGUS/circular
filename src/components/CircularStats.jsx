import { memo } from 'react';
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
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 min-w-[140px]"
            aria-label={`View ${stats.pendingApprovals || 0} pending approvals`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary/70 group-hover:text-primary transition-colors">Waitlist</p>
            <p className="text-5xl font-black tracking-tighter mt-2 text-primary">{stats.pendingApprovals || 0}</p>
          </RouterLink>
          <div 
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 hover:border-success hover:shadow-xl hover:shadow-success/20 transition-all duration-300 min-w-[140px]"
            aria-label={`Total users: ${stats.totalUsers || 0}`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-success/70 group-hover:text-success transition-colors">Total Users</p>
            <p className="text-5xl font-black tracking-tighter mt-2 text-success">{stats.totalUsers || 0}</p>
          </div>
        </>
      ) : profile.role === 'teacher' ? (
        <>
          <RouterLink 
            to="/dashboard/my-posts" 
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 min-w-[140px]"
            aria-label={`View your ${stats.myPosts || 0} posts`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary/70 group-hover:text-primary transition-colors">Posts</p>
            <p className="text-5xl font-black tracking-tighter mt-2 text-primary">{stats.myPosts || 0}</p>
          </RouterLink>
          <div 
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/20 hover:border-warning hover:shadow-xl hover:shadow-warning/20 transition-all duration-300 min-w-[140px]"
            aria-label={`${stats.todayCount || 0} broadcasts today`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-warning/70 group-hover:text-warning transition-colors">Today</p>
            <p className="text-5xl font-black tracking-tighter mt-2 text-warning">{stats.todayCount || 0}</p>
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
