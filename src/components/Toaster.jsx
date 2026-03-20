/* eslint-disable react-refresh/only-export-components */
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useState, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'success') => {
        setToasts((prev) => {
            // Check for duplicate message
            if (prev.some(t => t.message === message)) return prev;
            
            const id = Math.random().toString(36).substring(2, 9);
            setTimeout(() => removeToast(id), 5000);
            return [...prev, { id, message, type }];
        });
    }, [removeToast]);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed bottom-8 right-8 z-[10000] space-y-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className="pointer-events-auto"
                        >
                            <div className={`flex items-center gap-4 px-6 py-4 rounded-[24px] shadow-google border ${toast.type === 'success' ? 'bg-bg-light border-green-200 dark:border-green-900' :
                                toast.type === 'error' ? 'bg-bg-light border-red-200 dark:border-red-900' :
                                    'bg-bg-light border-blue-200 dark:border-blue-900'
                                }`}>
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${toast.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                    toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {toast.type === 'success' && <CheckCircle2 size={20} />}
                                    {toast.type === 'error' && <AlertCircle size={20} />}
                                    {toast.type === 'info' && <Info size={20} />}
                                </div>
                                <div className="flex-1 pr-4">
                                    <p className="text-[13px] font-bold text-text-main">{toast.message}</p>
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-text-muted hover:text-text-main transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useNotify = () => useContext(ToastContext);
