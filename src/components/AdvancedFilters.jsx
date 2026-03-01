import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, SortAsc, User, Filter, X } from 'lucide-react';

/**
 * Advanced Filters Component
 * Date range, sort options, author filter
 */
const AdvancedFilters = ({ onApply, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: 'all', // all, today, week, month, custom
        sortBy: 'newest', // newest, oldest, most_viewed
        author: '',
        customStartDate: '',
        customEndDate: ''
    });

    const handleApply = () => {
        onApply(filters);
        setIsOpen(false);
    };

    const handleClear = () => {
        const cleared = {
            dateRange: 'all',
            sortBy: 'newest',
            author: '',
            customStartDate: '',
            customEndDate: ''
        };
        setFilters(cleared);
        onClear();
        setIsOpen(false);
    };

    const activeFiltersCount = Object.values(filters).filter(v => 
        v && v !== 'all' && v !== 'newest'
    ).length;

    return (
        <div className="relative">
            {/* Filter Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light hover:bg-bg-light text-text-main font-semibold text-sm transition-all"
            >
                <Filter size={16} />
                Advanced Filters
                {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                    </span>
                )}
            </button>

            {/* Filter Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        
                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-80 bg-bg-light border border-border-light rounded-2xl shadow-2xl p-6 space-y-4 z-50"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-text-main">Filters</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-surface-light rounded transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Date Range */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
                                    <Calendar size={14} />
                                    Date Range
                                </label>
                                <select
                                    value={filters.dateRange}
                                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-border-light bg-bg-light text-sm focus:border-primary outline-none"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                    <option value="custom">Custom Range</option>
                                </select>

                                {filters.dateRange === 'custom' && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <input
                                            type="date"
                                            value={filters.customStartDate}
                                            onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                                            className="h-10 px-3 rounded-lg border border-border-light bg-bg-light text-xs focus:border-primary outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={filters.customEndDate}
                                            onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                                            className="h-10 px-3 rounded-lg border border-border-light bg-bg-light text-xs focus:border-primary outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sort By */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
                                    <SortAsc size={14} />
                                    Sort By
                                </label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-border-light bg-bg-light text-sm focus:border-primary outline-none"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="most_viewed">Most Viewed</option>
                                </select>
                            </div>

                            {/* Author Filter */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
                                    <User size={14} />
                                    Author
                                </label>
                                <input
                                    type="text"
                                    value={filters.author}
                                    onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                                    placeholder="Filter by author name..."
                                    className="w-full h-10 px-3 rounded-lg border border-border-light bg-bg-light text-sm focus:border-primary outline-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-border-light">
                                <button
                                    onClick={handleClear}
                                    className="flex-1 h-10 rounded-lg border border-border-light text-text-muted font-semibold text-sm hover:bg-surface-light transition-all"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="flex-1 h-10 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all"
                                >
                                    Apply
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdvancedFilters;
