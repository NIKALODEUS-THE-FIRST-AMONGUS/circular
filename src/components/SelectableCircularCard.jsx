import { motion } from 'framer-motion';
import { CheckSquare, Square } from 'lucide-react';
import CircularCard from './CircularCard';

/**
 * Wrapper for CircularCard that adds selection capability
 */
const SelectableCircularCard = ({ 
    circular, 
    profile, 
    onDelete, 
    onUpdate,
    selectionMode = false,
    isSelected = false,
    onSelect
}) => {
    const handleCardClick = (e) => {
        if (selectionMode && e.target.closest('.selection-checkbox')) {
            e.preventDefault();
            e.stopPropagation();
            onSelect?.(circular.id);
        }
    };

    return (
        <div className="relative" onClick={handleCardClick}>
            {/* Selection Checkbox */}
            {selectionMode && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 left-4 z-10 selection-checkbox"
                >
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect?.(circular.id);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                            isSelected 
                                ? 'bg-primary text-white' 
                                : 'bg-white/60 backdrop-blur-md dark:bg-gray-800/60 text-text-muted hover:bg-surface-light/70'
                        }`}
                    >
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                </motion.div>
            )}
            
            {/* Original Card */}
            <div className={selectionMode ? 'ml-16' : ''}>
                <CircularCard
                    circular={circular}
                    profile={profile}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                />
            </div>
        </div>
    );
};

export default SelectableCircularCard;
