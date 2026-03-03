import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

/**
 * Circular Delete Modal Component
 * Handles delete all circulars confirmation modal
 * Extracted from CircularCenter for better maintainability
 */
const CircularDeleteModal = memo(({
  isOpen = false,
  isDeleting = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && onCancel()}
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
                disabled={isDeleting}
                onClick={onCancel}
                aria-label="Cancel delete operation"
                className="flex-1 h-14 bg-surface-light text-text-main rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-border-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-border-light focus:outline-none focus:ring-2 focus:ring-text-main focus:ring-offset-2 focus:ring-offset-bg-light"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={onConfirm}
                aria-label="Confirm delete all circulars"
                className="flex-1 h-14 bg-danger text-white rounded-2xl font-extrabold text-[12px] uppercase tracking-[0.12em] hover:bg-danger/90 transition-all duration-200 shadow-lg shadow-danger/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 border-2 border-danger hover:border-danger/80 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-bg-light"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.isDeleting === nextProps.isDeleting
  );
});

CircularDeleteModal.displayName = 'CircularDeleteModal';

export default CircularDeleteModal;
