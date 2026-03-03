import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Circular Header Component
 * Displays the main title, description, and Indian flag
 * Extracted from CircularCenter for better maintainability
 */
const CircularHeader = memo(({
  profile,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
        <span className="text-[11px] font-extrabold text-primary uppercase tracking-[0.25em]">
          {profile?.role === 'admin' ? 'Administrative Node' : profile?.role === 'teacher' ? 'Faculty Portal' : 'Student Hub'}
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl md:text-6xl font-black text-text-main tracking-tighter leading-none flex flex-wrap items-baseline gap-x-3">
          <span className="opacity-90">Circular</span>
          <span className="text-primary uppercase">Center</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-primary"
          >
            .
          </motion.span>
          {/* Indian Flag SVG */}
          <motion.img 
            src="/indian-flag.svg"
            alt="Indian Flag"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="h-8 w-12 rounded-md shadow-md border-2 border-border-light/50 ml-2"
          />
        </h1>
        <p className="text-text-muted font-semibold text-base md:text-lg max-w-2xl leading-relaxed">
          {profile?.role === 'admin'
            ? "System metrics and approvals consolidated."
            : `Accessing broadcasts for ${profile?.department || 'all'} departments.`
          }
        </p>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.profile?.role === nextProps.profile?.role;
});

CircularHeader.displayName = 'CircularHeader';

export default CircularHeader;
