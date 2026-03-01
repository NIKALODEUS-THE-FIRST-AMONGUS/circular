/**
 * Inline Indian Flag SVG Component
 * Accurate representation with proper colors and 24-spoke Ashoka Chakra
 */

const IndianFlagInline = ({ width = 20, height = 14, className = "opacity-80" }) => {
    return (
        <svg width={width} height={height} viewBox="0 0 30 20" className={className}>
            {/* Saffron */}
            <rect width="30" height="6.67" fill="#FF9933"/>
            
            {/* White */}
            <rect y="6.67" width="30" height="6.67" fill="#FFFFFF"/>
            
            {/* Green */}
            <rect y="13.33" width="30" height="6.67" fill="#138808"/>
            
            {/* Ashoka Chakra - 24 spokes */}
            <g transform="translate(15, 10)">
                {/* Outer circle */}
                <circle cx="0" cy="0" r="3" fill="none" stroke="#000080" strokeWidth="0.4"/>
                
                {/* Center dot */}
                <circle cx="0" cy="0" r="0.4" fill="#000080"/>
                
                {/* 24 spokes */}
                {[...Array(24)].map((_, i) => {
                    const angle = (i * 15 * Math.PI) / 180;
                    const x = 2.6 * Math.cos(angle);
                    const y = 2.6 * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1="0"
                            y1="0"
                            x2={x}
                            y2={y}
                            stroke="#000080"
                            strokeWidth="0.15"
                        />
                    );
                })}
            </g>
        </svg>
    );
};

export default IndianFlagInline;
