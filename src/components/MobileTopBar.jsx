import React from 'react';
import { Menu, Bell, Users } from 'lucide-react';

const TinyIndianFlag = () => (
    <div className="w-5 h-3.5 bg-white border border-slate-100 flex flex-col shadow-sm ml-1 shrink-0 overflow-hidden rounded-[2px]">
        <div className="h-1/3 bg-[#FF9933]"></div>
        <div className="h-1/3 bg-white flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-900"></div>
        </div>
        <div className="h-1/3 bg-[#128807]"></div>
    </div>
);

const MobileTopBar = ({ onMenuClick, profile, user, waitlistCount = 0 }) => {
    return (
        <nav className="sticky top-0 z-50 px-4 h-16 flex items-center justify-between border-b shrink-0" 
             style={{ backgroundColor: '#000033', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-3">
                <button 
                    onClick={onMenuClick} 
                    aria-label="Open main menu" 
                    className="p-2 -ml-2 text-white active:scale-95 transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                >
                    <Menu className="h-6 w-6" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0">
                        <img src="/logo.svg" alt="SuchnaX Logo" className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-lg tracking-tight flex items-center shrink-0">
                        <span className="text-white">Suchna</span>
                        <span className="text-[#ec5b13] italic">X</span> 
                        <span className="text-[#22c55e] ml-1">Link</span>
                        <TinyIndianFlag />
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button aria-label="View notifications" className="p-2 text-white relative active:scale-95 transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
                    <Bell className="h-6 w-6" />
                    {waitlistCount > 0 && (
                        <span aria-label={`${waitlistCount} unread notifications`} className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                </button>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0 bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                    {profile?.avatar_url || user?.photoURL ? (
                        <img alt="User Profile" className="w-full h-full object-cover" src={profile?.avatar_url || user?.photoURL} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                        <span>{profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default MobileTopBar;
