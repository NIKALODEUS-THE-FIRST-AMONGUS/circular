import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Offline Banner Component
 * Similar to Gmail, Slack, Google Docs offline indicators
 */
const OfflineBanner = () => {
    const { isOnline, wasOffline } = useOnlineStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-danger text-white px-4 py-3 shadow-lg"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <WifiOff size={20} />
                        <span className="font-bold text-sm">
                            No internet connection. Some features may be unavailable.
                        </span>
                    </div>
                </motion.div>
            )}
            {isOnline && wasOffline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    onAnimationComplete={() => {
                        setTimeout(() => {
                            // Auto-hide after 3 seconds
                        }, 3000);
                    }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-success text-white px-4 py-3 shadow-lg"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <Wifi size={20} />
                        <span className="font-bold text-sm">
                            Connection restored. Syncing data...
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineBanner;
