import { useLanguage } from '../hooks/useLanguage';
import { getBrandName, getSlogan, BRAND_CONFIG } from '../config/branding';
import LogoIcon from './LogoIcon';

const BrandLogo = ({ variant = 'full', showSlogan = false, size = 'md' }) => {
    const { language } = useLanguage();
    const brandName = getBrandName(language);
    const slogan = getSlogan(language);
    
    // Split brand name to highlight X
    const parts = brandName.split('X');
    
    const sizeClasses = {
        sm: {
            icon: 32,
            text: 'text-base',
            slogan: 'text-[8px]'
        },
        md: {
            icon: 40,
            text: 'text-lg',
            slogan: 'text-[9px]'
        },
        lg: {
            icon: 48,
            text: 'text-xl',
            slogan: 'text-[10px]'
        }
    };
    
    const s = sizeClasses[size];
    
    if (variant === 'icon') {
        return (
            <div className="flex items-center justify-center">
                <LogoIcon size={s.icon} />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <LogoIcon size={s.icon} />
                <div className="flex flex-col">
                    <h1 className={`${s.text} font-black tracking-tight leading-none flex items-center`}>
                        <span>{parts[0]}</span>
                        <span style={{ color: BRAND_CONFIG.colors.saffron }}>X</span>
                        <span className="ml-[0.15em]">{parts[1]}</span>
                    </h1>
                    {showSlogan && (
                        <p className={`${s.slogan} text-text-muted font-medium mt-0.5 tracking-wide`}>
                            {slogan}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandLogo;
