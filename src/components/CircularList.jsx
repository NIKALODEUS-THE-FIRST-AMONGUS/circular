import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Layers } from 'lucide-react';
import SelectableCircularCard from './SelectableCircularCard';

/**
 * Circular List Component
 * Handles rendering of circular list with pagination
 * Extracted from CircularCenter for better maintainability
 */
const CircularList = memo(({
  circulars = [],
  profile,
  onDelete,
  onUpdate,
  selectionMode = false,
  selectedCirculars = [],
  onSelect,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  isEmpty = false,
  onCreateClick,
}) => {
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loadingMore, hasMore, onLoadMore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-light border border-border-light rounded-3xl p-12 text-center space-y-6"
      >
        <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
          <Layers size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-text-main">No Circulars Yet</h3>
          <p className="text-text-muted font-medium max-w-md mx-auto">
            No circulars match your filters. Try adjusting your search or filters.
          </p>
        </div>
        {onCreateClick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreateClick}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:shadow-lg transition-all mx-auto"
          >
            <Layers size={18} />
            Create Your First Circular
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-0"
    >
      <AnimatePresence mode="popLayout">
        {circulars.map((circular, index) => (
          <motion.div
            key={circular.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            className="px-6 py-5 bg-bg-light/30 backdrop-blur-md hover:bg-surface-light/40 transition-all border-b border-border-light/20 last:border-b-0"
          >
            <SelectableCircularCard
              circular={circular}
              profile={profile}
              onDelete={onDelete}
              onUpdate={onUpdate}
              selectionMode={selectionMode}
              isSelected={selectedCirculars.includes(circular.id)}
              onSelect={onSelect}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center px-6 py-4 border-t border-border-light bg-surface-light/60">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            aria-label="Load more circulars"
            className="px-10 py-3 bg-primary/10 text-primary rounded-xl font-extrabold text-[12px] uppercase tracking-[0.12em] flex items-center gap-2.5 hover:bg-primary hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-primary/30 hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-light"
          >
            {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
            {loadingMore ? 'Loading...' : 'Load older updates'}
          </button>
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.circulars.length === nextProps.circulars.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.loadingMore === nextProps.loadingMore &&
    prevProps.hasMore === nextProps.hasMore &&
    prevProps.isEmpty === nextProps.isEmpty &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.selectedCirculars.length === nextProps.selectedCirculars.length
  );
});

CircularList.displayName = 'CircularList';

export default CircularList;
