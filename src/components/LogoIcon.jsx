// SuchnaX Link Logo - Tricolor X Design
const LogoIcon = ({ size = 40, className = '' }) => {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Green Arrow (Bottom-Left pointing up-right) */}
            <path 
                d="M 20 80 L 20 60 L 40 60 L 40 40 L 20 40 L 20 20 L 40 20 L 60 40 L 40 60 L 40 80 Z" 
                fill="#138808"
            />
            
            {/* Saffron Arrow (Top-Right pointing down-left) */}
            <path 
                d="M 80 20 L 80 40 L 60 40 L 60 60 L 80 60 L 80 80 L 60 80 L 40 60 L 60 40 L 60 20 Z" 
                fill="#FF9933"
            />
            
            {/* White X Center with subtle border */}
            <path 
                d="M 35 35 L 50 50 L 35 65 L 42 72 L 50 64 L 58 72 L 65 65 L 57 57 L 65 50 L 58 43 L 50 51 L 42 43 Z" 
                fill="#FFFFFF" 
                stroke="#E5E7EB" 
                strokeWidth="1"
            />
        </svg>
    );
};

export default LogoIcon;
