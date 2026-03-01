import { BRAND_CONFIG } from '../config/branding';

const IndianFlag = ({ size = 'sm' }) => {
    const sizeMap = {
        xs: 'w-4 h-3',
        sm: 'w-6 h-4',
        md: 'w-8 h-6',
        lg: 'w-12 h-9'
    };
    
    return (
        <div className={`${sizeMap[size]} rounded-sm overflow-hidden shadow-sm border border-border-light/30 flex flex-col`}>
            <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.saffron }} />
            <div className="flex-1 bg-white flex items-center justify-center">
                <div 
                    className="rounded-full border border-blue-800" 
                    style={{ 
                        width: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '10px' : '14px',
                        height: size === 'xs' ? '6px' : size === 'sm' ? '8px' : size === 'md' ? '10px' : '14px',
                        borderWidth: size === 'xs' ? '0.5px' : '1px'
                    }}
                >
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="#000080" strokeWidth="1.5" />
                        {[...Array(24)].map((_, i) => (
                            <line
                                key={i}
                                x1="12"
                                y1="12"
                                x2={12 + 10 * Math.cos((i * 15 * Math.PI) / 180)}
                                y2={12 + 10 * Math.sin((i * 15 * Math.PI) / 180)}
                                stroke="#000080"
                                strokeWidth="0.5"
                            />
                        ))}
                    </svg>
                </div>
            </div>
            <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.green }} />
        </div>
    );
};

export default IndianFlag;
