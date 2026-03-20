import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, X, Trash2 } from 'lucide-react';
import AdvancedFilters from './AdvancedFilters';
import CircularFilterDropdown from './CircularFilterDropdown';

/**
 * Circular Search Bar Component
 * Handles search, refresh, filters, and delete all functionality
 * Extracted from CircularCenter for better maintainability
 */
const CircularSearchBar = memo(({
  searchTerm = '',
  onSearchChange,
  onRefresh,
  loading = false,
  loadingMore = false,
  selectedDept = 'ALL',
  onDeptChange,
  priorityFilter = 'all',
  onPriorityChange,
  onApplyFilters,
  onClearFilters,
  isAdmin = false,
  isStudent = false,
  onDeleteAllClick,
}) => {
  return (
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search broadcasts, topics, or faculty..."
          className="bg-transparent border-none text-[14px] font-medium text-text-main focus:ring-0 outline-none w-full placeholder:text-text-muted/50"
        />
        <AnimatePresence>
          {searchTerm && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={() => onSearchChange('')}
              className="p-1 text-text-muted hover:text-danger rounded-full transition-all shrink-0"
            >
              <X size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        title="Refresh circulars"
        aria-label="Refresh circulars"
        className="h-12 min-w-[48px] px-4 bg-bg-light border-2 border-border-light rounded-xl text-text-main hover:text-primary hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-main"
      >
        <RefreshCw size={20} className={loading && !loadingMore ? 'animate-spin' : ''} />
      </button>

      {/* Advanced Filters */}
      <AdvancedFilters 
        onApply={onApplyFilters}
        onClear={onClearFilters}
        isStudent={isStudent}
      />

      {/* Delete All Button (Admin only) */}
      {isAdmin && (
        <button
          onClick={onDeleteAllClick}
          title="Delete All Circulars"
          aria-label="Delete all circulars from system"
          className="h-12 px-5 bg-danger/10 border-2 border-danger/30 rounded-xl text-danger hover:bg-danger hover:text-white hover:border-danger hover:shadow-lg hover:shadow-danger/30 transition-all duration-200 flex items-center gap-2.5 group font-bold focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-main"
        >
          <Trash2 size={20} />
          <span className="hidden md:inline text-[12px] font-extrabold uppercase tracking-[0.12em]">Delete All</span>
        </button>
      )}

      {/* Filter Dropdown */}
      <CircularFilterDropdown
        selectedDept={selectedDept}
        onDeptChange={onDeptChange}
        priorityFilter={priorityFilter}
        onPriorityChange={onPriorityChange}
        onClearFilters={onClearFilters}
      />
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.loading === nextProps.loading &&
    prevProps.loadingMore === nextProps.loadingMore &&
    prevProps.selectedDept === nextProps.selectedDept &&
    prevProps.priorityFilter === nextProps.priorityFilter &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

CircularSearchBar.displayName = 'CircularSearchBar';

export default CircularSearchBar;
