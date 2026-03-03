import { memo } from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

/**
 * Circular Empty State Component
 * Displays empty state when no circulars match filters or search
 * Extracted from CircularCenter for better maintainability
 */
const CircularEmptyState = memo(({
  onResetFilters,
}) => {

  return (
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
        onClick={onResetFilters}
        className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary/90 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-main"
        aria-label="Reset all filters"
      >
        Reset filters
      </button>
    </motion.div>
  );
}, () => {
  return true; // No props to compare, always use same component
});

CircularEmptyState.displayName = 'CircularEmptyState';

export default CircularEmptyState;
