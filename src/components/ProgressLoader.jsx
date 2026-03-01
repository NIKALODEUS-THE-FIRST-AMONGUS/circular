import { motion } from 'framer-motion';

/**
 * Premium Circular Progress Loader
 * @param {number} progress - 0 to 100
 * @param {string} label - Optional status text
 * @param {string} size - size of the loader (md, lg, xl)
 */
const ProgressLoader = ({ progress, label, size = 'md' }) => {
    const sizeMap = {
        sm: { box: 60, stroke: 4, font: 'text-xs' },
        md: { box: 100, stroke: 6, font: 'text-base' },
        lg: { box: 160, stroke: 8, font: 'text-xl' },
        xl: { box: 220, stroke: 10, font: 'text-3xl' }
    };

    const s = sizeMap[size] || sizeMap.md;
    const center = s.box / 2;
    const radius = (s.box - s.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative" style={{ width: s.box, height: s.box }}>
                {/* SVG Ring Background */}
                <svg width={s.box} height={s.box} className="transform -rotate-90">
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={s.stroke}
                        fill="transparent"
                        className="text-border-light/30"
                    />
                    {/* Progress Ring */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={s.stroke}
                        fill="transparent"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        strokeLinecap="round"
                        className="text-primary"
                    />
                </svg>

                {/* Percentage Counter */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <span className={`font-black tabular-nums tracking-tighter ${s.font} text-text-main`}>
                            {Math.floor(progress)}%
                        </span>
                    </div>
                </div>
            </div>

            {label && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-1"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted animate-pulse">
                        {label}
                    </p>
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="h-1 w-1 rounded-full bg-primary"
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ProgressLoader;
