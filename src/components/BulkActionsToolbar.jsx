import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Archive, ArchiveRestore, CheckSquare, X } from 'lucide-react';

/**
 * Bulk Actions Toolbar
 * Shows when items are selected, provides bulk operations
 */
const BulkActionsToolbar = ({ 
    selectedCount, 
    onMarkAllRead, 
    onDelete, 
    onArchive, 
    onUnarchive,
    onClear,
    showArchive = true 
}) => {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="sticky top-4 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 mx-auto w-fit"
                >
                    <span className="font-semibold text-sm">
                        {selectedCount} selected
                    </span>
                    
                    <div className="h-6 w-px bg-white/30" />
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onMarkAllRead}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            title="Mark as read"
                        >
                            <CheckSquare size={18} />
                        </button>
                        
                        {showArchive && (
                            <>
                                <button
                                    onClick={onArchive}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-all"
                                    title="Archive"
                                >
                                    <Archive size={18} />
                                </button>
                                
                                <button
                                    onClick={onUnarchive}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-all"
                                    title="Unarchive"
                                >
                                    <ArchiveRestore size={18} />
                                </button>
                            </>
                        )}
                        
                        <button
                            onClick={onDelete}
                            className="p-2 hover:bg-red-500 rounded-lg transition-all"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                        
                        <div className="h-6 w-px bg-white/30 ml-2" />
                        
                        <button
                            onClick={onClear}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            title="Clear selection"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BulkActionsToolbar;
