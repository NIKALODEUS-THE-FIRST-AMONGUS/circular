import { BRAND_CONFIG } from '../config/branding';

const TricolorAccent = ({ orientation = 'horizontal', thickness = 'thin' }) => {
    const thicknessMap = {
        thin: orientation === 'horizontal' ? 'h-[2px]' : 'w-[2px]',
        medium: orientation === 'horizontal' ? 'h-1' : 'w-1',
        thick: orientation === 'horizontal' ? 'h-1.5' : 'w-1.5'
    };
    
    const size = thicknessMap[thickness];
    
    if (orientation === 'horizontal') {
        return (
            <div className={`w-full ${size} flex`}>
                <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.saffron }} />
                <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.white }} />
                <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.green }} />
            </div>
        );
    }
    
    return (
        <div className={`${size} h-full flex flex-col`}>
            <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.saffron }} />
            <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.white }} />
            <div className="flex-1" style={{ backgroundColor: BRAND_CONFIG.colors.green }} />
        </div>
    );
};

export default TricolorAccent;
