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
      <div className="mb-2">
        <p className="text-[10px] font-medium text-text-muted/70 tracking-wide uppercase">Proudly Made in India by SxL Labs</p>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-px bg-primary pointer-events-none"></div>
        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
          {profile?.role === 'admin' ? 'Administrative Node' : profile?.role === 'teacher' ? 'Faculty Portal' : 'Student Hub'}
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-main tracking-tighter leading-none flex flex-wrap items-center gap-x-3">
          Circular <span className="text-primary uppercase tracking-tight">Center.</span>
          
          {/* Indian Flag */}
          <div className="w-8 h-5 bg-white border border-border-light flex flex-col shadow-sm shrink-0 ml-2 rounded-[2px] overflow-hidden">
            <div className="h-[33.33%] bg-[#FF9933]"></div>
            <div className="h-[33.33%] bg-white relative flex items-center justify-center">
              <div className="absolute w-2.5 h-2.5 rounded-full border border-[#000080] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#000080]"></div>
              </div>
            </div>
            <div className="h-[33.33%] bg-[#138808]"></div>
          </div>
        </h1>
        <p className="text-text-muted font-medium text-sm md:text-base max-w-2xl mt-3">
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
