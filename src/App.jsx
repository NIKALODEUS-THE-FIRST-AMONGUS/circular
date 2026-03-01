import { lazy, Suspense, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './components/Toaster';
import { NetworkProvider } from './context/NetworkContext';
import { startKeepAlive, pingOnVisibilityChange } from './lib/keepAlive';
import { setupGlobalErrorHandling } from './utils/errorTracking';
import { performanceMonitor } from './utils/performanceMonitor';
import OfflineBanner from './components/OfflineBanner';

// Lazy load pages for better performance on slow networks
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-light">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Hub...</p>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  
  // Memoize the routes to prevent unnecessary re-renders
  const routes = useMemo(() => (
    <Routes location={location} key={location.pathname.split('/')[1]}>
      <Route path="/" element={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.3 } }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <LandingPage />
        </motion.div>
      } />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  ), [location]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnimatePresence mode="wait" initial={false}>
        {routes}
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  // Initialize enterprise features
  useEffect(() => {
    // Setup global error tracking (like Sentry)
    setupGlobalErrorHandling();
    
    // Track page load performance
    performanceMonitor.mark('app_start');
    
    // Log Core Web Vitals after page loads (only in development)
    if (import.meta.env.DEV) {
      performanceMonitor.getCoreWebVitals().then(vitals => {
        console.log('📊 Core Web Vitals:', vitals);
      });
    }
    
    // Start database keep-alive to prevent auto-pausing
    const intervalId = startKeepAlive();
    
    // Also ping when user returns to tab
    pingOnVisibilityChange();
    
    performanceMonitor.mark('app_ready');
    performanceMonitor.measure('App Initialization', 'app_start', 'app_ready');
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Router>
      <NetworkProvider>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <OfflineBanner />
                <AppContent />
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </NetworkProvider>
    </Router>
  );
}

export default App;
