import { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, Check, Layers, ShieldAlert, X } from 'lucide-react';

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

/**
 * Circular Filter Dropdown Component
 * Handles department and priority filtering
 * Extracted from CircularCenter for better maintainability
 */
const CircularFilterDropdown = memo(({
  selectedDept = 'ALL',
  onDeptChange,
  priorityFilter = 'all',
  onPriorityChange,
  onClearFilters,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const activeFilterCount = (selectedDept !== 'ALL' ? 1 : 0) + (priorityFilter === 'important' ? 1 : 0);
  const selectedDeptObj = DEPARTMENTS.find(dept => dept.id === selectedDept);

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

  const handleClearAll = () => {
    onDeptChange('ALL');
    onPriorityChange('all');
    setFilterOpen(false);
    onClearFilters?.();
  };

  return (
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
                    onClick={() => onDeptChange(dept.id)}
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
                    onClick={() => onPriorityChange(p.id)}
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
                onClick={handleClearAll}
                aria-label="Clear all filters"
                className="w-full py-3 rounded-xl text-[12px] font-extrabold uppercase tracking-[0.12em] text-text-main hover:text-danger hover:bg-danger/10 border-2 border-border-light hover:border-danger/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-light"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter pills */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 mt-2 flex flex-wrap gap-2"
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
                  onClick={() => onDeptChange('ALL')} 
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
                  onClick={() => onPriorityChange('all')} 
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
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.selectedDept === nextProps.selectedDept &&
    prevProps.priorityFilter === nextProps.priorityFilter
  );
});

CircularFilterDropdown.displayName = 'CircularFilterDropdown';

export default CircularFilterDropdown;
