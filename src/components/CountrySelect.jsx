import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRIES = [
    { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
    { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
    { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
    { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
    { name: 'Iceland', code: 'IS', dial: '+354', flag: '🇮🇸' },
    { name: 'Ireland', code: 'IE', dial: '+353', flag: '🇮🇪' },
    { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
    { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
    { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
    { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
    { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
    { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
    { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪' },
    { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
    // Add more common ones or a larger list if needed
].sort((a, b) => a.name.localeCompare(b.name));

const CountrySelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    const filteredCountries = useMemo(() => {
        const s = search.toLowerCase();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(s) ||
            c.dial.includes(s) ||
            c.code.toLowerCase().includes(s)
        );
    }, [search]);

    const selected = COUNTRIES.find(c => c.dial === value) || COUNTRIES[0];

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-12 px-4 rounded-xl border border-outline bg-bg-light hover:border-google-blue transition-all flex items-center gap-2 font-bold min-w-[100px]"
            >
                <span>{selected.flag}</span>
                <span className="text-xs">{selected.dial}</span>
                <ChevronDown size={14} className={`text-text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-m3-3 border border-outline z-50 overflow-hidden"
                    >
                        <div className="p-3 border-b border-outline bg-surface-variant/30 flex items-center gap-2">
                            <Search size={14} className="text-text-dim" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search country..."
                                className="bg-transparent border-none outline-none text-[11px] font-black w-full placeholder:text-text-dim/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((c) => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                            onChange(c.dial);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${selected.code === c.code ? 'bg-google-blue-soft text-google-blue' : 'hover:bg-bg-light'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-base">{c.flag}</span>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-none">{c.name}</p>
                                                <p className="text-[9px] font-bold text-text-dim leading-none mt-1">{c.dial}</p>
                                            </div>
                                        </div>
                                        {selected.code === c.code && <Check size={14} />}
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">No results</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CountrySelect;
