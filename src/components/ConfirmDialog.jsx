/* eslint-disable react-refresh/only-export-components */
import { useState, createContext, useContext, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, X } from 'lucide-react';

const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
    const [dialogConfig, setDialogConfig] = useState(null);

    const confirm = useCallback((config) => {
        return new Promise((resolve) => {
            setDialogConfig({
                ...config,
                resolve
            });
        });
    }, []);

    const handleClose = (value) => {
        if (dialogConfig?.resolve) {
            dialogConfig.resolve(value);
        }
        setDialogConfig(null);
    };

    return (
        <DialogContext.Provider value={confirm}>
            {children}
            <AnimatePresence>
                {dialogConfig && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-[#1a1c1e] rounded-[32px] shadow-2xl border border-border-light dark:border-white/10 max-w-sm w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8 space-y-6">
                                {/* Close Button */}
                                <button 
                                    onClick={() => handleClose(false)}
                                    className="absolute top-6 right-6 text-text-muted hover:text-text-main transition-colors"
                                >
                                    <X size={18} />
                                </button>

                                {/* Icon Container */}
                                <div className="flex items-center justify-center pt-2">
                                    <div className={`h-20 w-20 rounded-[28px] flex items-center justify-center ${
                                        dialogConfig.type === 'danger' 
                                            ? 'bg-red-50 text-red-500 dark:bg-red-500/10' 
                                            : 'bg-primary/5 text-primary dark:bg-primary/10'
                                    }`}>
                                        {dialogConfig.type === 'danger' ? <AlertTriangle size={36} strokeWidth={1.5} /> : <Info size={36} strokeWidth={1.5} />}
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-black text-text-main tracking-tight leading-tight px-2">
                                        {dialogConfig.title || 'Are you sure?'}
                                    </h3>
                                    <p className="text-[13px] text-text-muted leading-relaxed font-medium px-4">
                                        {dialogConfig.message}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={() => handleClose(true)}
                                        className={`h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] ${
                                            dialogConfig.type === 'danger' 
                                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-500/20' 
                                                : 'bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20'
                                        }`}
                                    >
                                        {dialogConfig.confirmText || (dialogConfig.mode === 'alert' ? 'OK' : 'Confirm')}
                                    </button>
                                    
                                    {dialogConfig.mode !== 'alert' && (
                                        <button
                                            onClick={() => handleClose(false)}
                                            className="h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest text-text-muted hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
                                        >
                                            {dialogConfig.cancelText || 'Cancel'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DialogContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useConfirm must be used within a DialogProvider');
    }
    return context;
};
