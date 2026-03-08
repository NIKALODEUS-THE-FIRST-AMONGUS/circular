/**
 * Mobile Drafts Page - SuchnaX Link
 * Displays saved draft circulars
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDocuments } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { 
    Menu, Bell, Search, Plus, Home, FileText, Users, Settings,
    CheckCircle, MessageSquare, LogOut, Clock, ChevronRight
} from 'lucide-react';
import MobileSidebar from '../../components/MobileSidebar';
import MobileTopBar from '../../components/MobileTopBar';

// Add animations and styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
    .float-animation {
        animation: float 3s ease-in-out infinite;
    }
`;
document.head.appendChild(style);

const DraftsMobile = () => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const notify = useNotify();
    
    const [drafts, setDrafts] = useState([]);
    const [stats, setStats] = useState({ waitlist: 0, totalUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchDrafts = async () => {
        try {
            setLoading(true);
            
            // Fetch drafts for current user
            const draftsData = await getDocuments('circulars', {
                where: [
                    ['author_id', '==', user?.uid],
                    ['status', '==', 'draft']
                ],
                orderBy: ['updated_at', 'desc']
            });
            
            setDrafts(draftsData);

            // Fetch stats for admin
            if (profile?.role === 'admin') {
                const pendingProfiles = await getDocuments('profiles', { 
                    where: [['status', '==', 'pending']] 
                });
                setStats({ waitlist: pendingProfiles.length, totalUsers: 0 });
            }
        } catch (err) {
            console.error('Error fetching drafts:', err);
            notify('Failed to load drafts', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <MobileSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                profile={profile} 
                user={user} 
                stats={stats}
            />

            {/* Top Navbar with Hamburger - Common MobileTopBar */}
            <MobileTopBar 
                onMenuClick={() => setIsSidebarOpen(true)}
                profile={profile}
                user={user}
                waitlistCount={stats.waitlist}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto">
                {/* Header Text Section */}
                <div className="px-5 sm:px-6 md:px-8 lg:px-10 pt-6 sm:pt-8 space-y-2">
                    <h1 className="text-[28px] sm:text-[32px] md:text-4xl font-bold text-slate-900 tracking-tight">
                        My Drafts
                    </h1>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Unfinished circulars saved for later completion.
                    </p>
                </div>

                {/* Empty State or Drafts List */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35]"></div>
                    </div>
                ) : drafts.length === 0 ? (
                    <div 
                        className="px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-24 animate-fade-in"
                        style={{ animation: 'fadeIn 300ms ease-out' }}
                    >
                        {/* Responsive Container */}
                        <div className="
                            flex flex-col items-center justify-center
                            min-h-[calc(100vh-280px)]
                            sm:min-h-[calc(100vh-300px)]
                            md:min-h-[calc(100vh-320px)]
                            lg:flex-row lg:gap-12 lg:max-w-[900px] lg:mx-auto
                            xl:max-w-[1000px]
                            2xl:max-w-[1100px]
                            relative
                        ">
                            {/* Subtle Background Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-green-50/30 opacity-50 pointer-events-none"></div>

                            {/* Illustration Container */}
                            <div className="
                                relative z-10
                                w-[140px] h-[140px]
                                xs:w-[160px] xs:h-[160px]
                                sm:w-[180px] sm:h-[180px]
                                md:w-[200px] md:h-[200px]
                                lg:w-[220px] lg:h-[220px]
                                xl:w-[240px] xl:h-[240px]
                                2xl:w-[260px] 2xl:h-[260px]
                                mb-6 sm:mb-7 md:mb-8 lg:mb-0
                                flex-shrink-0
                                float-animation
                            ">
                                {/* Warm illustration with orange and green accents */}
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {/* Background circle with gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-green-50 rounded-full"></div>
                                    
                                    {/* Document illustration - scales with container */}
                                    <svg className="relative w-[55%] h-[55%] z-10" viewBox="0 0 64 64" fill="none">
                                        {/* Main document */}
                                        <path d="M16 8C16 6.89543 16.8954 6 18 6H38L48 16V54C48 55.1046 47.1046 56 46 56H18C16.8954 56 16 55.1046 16 54V8Z" fill="#FF6B35" fillOpacity="0.9"/>
                                        {/* Folded corner */}
                                        <path d="M38 6L48 16H40C38.8954 16 38 15.1046 38 14V6Z" fill="#FF6B35" fillOpacity="0.6"/>
                                        {/* Lines */}
                                        <line x1="24" y1="24" x2="40" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        <line x1="24" y1="32" x2="40" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        <line x1="24" y1="40" x2="36" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        {/* Green accent dot */}
                                        <circle cx="52" cy="52" r="8" fill="#00C853"/>
                                        {/* Plus sign in green circle */}
                                        <line x1="52" y1="48" x2="52" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        <line x1="48" y1="52" x2="56" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                            </div>

                            {/* Content Container */}
                            <div className="
                                relative z-10 w-full
                                max-w-[280px]
                                xs:max-w-[300px]
                                sm:max-w-[320px]
                                md:max-w-[400px]
                                lg:max-w-[480px]
                                xl:max-w-[550px]
                                lg:flex-1
                            ">
                                {/* Heading - Responsive sizing */}
                                <h3 className="
                                    text-[22px] xs:text-2xl sm:text-[26px] md:text-[28px]
                                    font-bold text-[#1A202C]
                                    mb-4 sm:mb-5
                                    text-center lg:text-left
                                ">
                                    No Drafts Yet
                                </h3>

                                {/* Body Text - Left Aligned, Responsive */}
                                <p className="
                                    text-[#4A5568]
                                    text-sm sm:text-[15px] md:text-base
                                    leading-relaxed
                                    mb-5 sm:mb-6
                                    text-left
                                    max-w-[75ch]
                                ">
                                    Save your work in progress and come back to it anytime. Your drafts are automatically saved.
                                </p>

                                {/* Tip - Simple text with icon */}
                                <div className="flex items-start gap-2 mb-8 sm:mb-10 text-left">
                                    <svg className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                    </svg>
                                    <p className="text-xs sm:text-[13px] md:text-sm text-[#555] leading-relaxed">
                                        You can also access drafts from the quick save option while composing
                                    </p>
                                </div>

                                {/* Button Group - Responsive sizing */}
                                <div className="space-y-3 sm:space-y-4">
                                    {/* Primary Action Button - SOLID ORANGE */}
                                    <button 
                                        onClick={() => navigate('/dashboard/create')}
                                        className="
                                            w-full
                                            sm:max-w-[340px] md:max-w-[360px]
                                            lg:max-w-[380px]
                                            min-h-[44px] sm:min-h-[48px] md:min-h-[52px] lg:min-h-[56px]
                                            bg-[#FF6B35] hover:bg-[#FF5722]
                                            text-white font-bold
                                            py-3 sm:py-3.5 md:py-4
                                            px-6
                                            rounded-xl
                                            transition-all duration-200
                                            active:scale-[0.98]
                                            hover:scale-[1.02]
                                            flex items-center justify-center gap-2
                                            focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2
                                        "
                                        style={{ boxShadow: '0 4px 12px rgba(255, 107, 53, 0.25)' }}
                                        aria-label="Create your first circular"
                                    >
                                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                                        <span className="text-sm sm:text-base">Create Your First Circular</span>
                                    </button>

                                    {/* Secondary Action - Simple Text Link */}
                                    <button 
                                        onClick={() => {
                                            notify('Drafts are automatically saved while you compose circulars', 'info');
                                        }}
                                        className="
                                            w-full
                                            min-h-[44px]
                                            text-[#4A5568] hover:text-[#FF6B35]
                                            text-sm sm:text-[15px] md:text-base
                                            font-medium
                                            py-2
                                            transition-colors duration-200
                                            flex items-center justify-center gap-1.5
                                            focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 rounded-lg
                                        "
                                        aria-label="Learn how drafts work"
                                    >
                                        <span>Learn How Drafts Work</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Drafts List */}
                        <div className="px-5 sm:px-6 md:px-8 lg:px-10 pb-24 space-y-4">
                            {drafts.map((draft) => (
                                <div 
                                    key={draft.id}
                                    onClick={() => navigate(`/dashboard/create?draft=${draft.id}`)}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer active:scale-[0.98] transition-all"
                                >
                                    {/* Draft Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">
                                                {draft.title || 'Untitled Draft'}
                                            </h3>
                                            <p className="text-sm text-slate-600 line-clamp-2">
                                                {draft.content || 'No content yet...'}
                                            </p>
                                        </div>
                                        <div className="ml-3 flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Draft Meta */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                {new Date(draft.updated_at || draft.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <span className="text-[#ec5b13] font-semibold text-sm flex items-center gap-1">
                                            Continue
                                            <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Create New Button at Bottom */}
                        <div className="px-5 sm:px-6 md:px-8 lg:px-10 mt-6 pb-24">
                            <button 
                                onClick={() => navigate('/dashboard/create')}
                                className="bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#ec5b13]/30 flex items-center gap-2 transition-all active:scale-95 w-full justify-center"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create New Circular</span>
                            </button>
                        </div>
                    </>
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/80 backdrop-blur-md px-6 py-3 pb-6 z-50">
                <div className="flex items-center justify-between">
                    {/* Home */}
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex flex-col items-center gap-1 text-slate-400 opacity-60 hover:opacity-100 hover:text-[#FF6B35] transition-all duration-300"
                    >
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Home</span>
                    </button>

                    {/* Drafts (Active) */}
                    <button 
                        onClick={() => navigate('/dashboard/drafts')}
                        className="flex flex-col items-center gap-1 text-[#FF6B35] relative"
                    >
                        <FileText className="w-6 h-6" fill="currentColor" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Drafts</span>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#FF6B35] rounded-full"></div>
                    </button>

                    {/* Members */}
                    <button 
                        onClick={() => navigate('/dashboard/manage-users')}
                        className="flex flex-col items-center gap-1 text-slate-400 opacity-60 hover:opacity-100 hover:text-[#FF6B35] transition-all duration-300"
                    >
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Members</span>
                    </button>

                    {/* Settings */}
                    <button 
                        onClick={() => navigate('/dashboard/profile')}
                        className="flex flex-col items-center gap-1 text-slate-400 opacity-60 hover:opacity-100 hover:text-[#FF6B35] transition-all duration-300"
                    >
                        <Settings className="w-6 h-6" />
                        <span className="text-[10px] font-medium uppercase tracking-tighter">Settings</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default DraftsMobile;
