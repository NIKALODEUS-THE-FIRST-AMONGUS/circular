import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { createDocument } from '../../lib/firebase-db';
import { uploadFile } from '../../lib/storage';
import { useNotify } from '../../components/Toaster';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, Loader2, Plus, UploadCloud, Clock, 
    AlertCircle, FileText, Bell, Users, Megaphone, 
    Paperclip, Menu, LogOut, MessageSquare, Settings, 
    History, Sun, Target
} from 'lucide-react';

const DRAFT_KEY = 'circular_mobile_draft';

const CreateCircularMobile = () => {
    const navigate = useNavigate();
    const { profile, user } = useAuth();
    const notify = useNotify();
    const [loading, setLoading] = useState(false);
    const hasRestored = useRef(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_scope: 'all', // 'all' or 'targeted'
        department_target: 'CSE',
        year_target: '1st Year',
        section_target: 'A',
        priority: 'standard'
    });

    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    const branches = ['CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];
    const sections = ['A', 'B', 'C'];
    const [files, setFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [uploadProgress, setUploadProgress] = useState('');

    // Load draft on mount
    useEffect(() => {
        if (hasRestored.current) return;
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...draft }));
                if (draft.title?.trim() || draft.content?.trim()) {
                    notify('📝 Draft restored from local storage', 'info');
                    hasRestored.current = true;
                }
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, [notify]);

    // Auto-save draft
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        }, 1000); // 1s debounce
        return () => clearTimeout(timer);
    }, [formData]);

    const clearLocalDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
    };

    const handleFileChange = (e) => {
        const sel = Array.from(e.target.files);
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
        const validFiles = [];
        const errors = [];

        sel.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} exceeds 100MB limit`);
                return;
            }
            validFiles.push(file);
        });

        if (errors.length > 0) {
            notify(`⚠️ ${errors.join(' • ')}`, 'error');
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
            const newUrls = validFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
            setPreviewUrls(prev => [...prev, ...newUrls]);
            notify(`📎 ${validFiles.length} file(s) attached`, 'success');
        }
    };

    const removeFile = (i) => {
        if (previewUrls[i]) URL.revokeObjectURL(previewUrls[i]);
        setFiles(prev => prev.filter((_, idx) => idx !== i));
        setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (isDraft = false) => {
        if (!formData.title.trim() || !formData.content.trim()) {
            notify('Please fill in Heading and Message Body', 'error');
            return;
        }

        setLoading(true);
        setUploadProgress('Preparing...');
        try {
            // ── Upload files to Cloudinary ─────────────────────────────────────────
            const uploadedUrls = [];
            if (files.length > 0) {
                setUploadProgress(`Uploading ${files.length} file(s)...`);
                for (let i = 0; i < files.length; i++) {
                    const { url, error } = await uploadFile(files[i]);
                    if (error) throw new Error(`Upload failed: ${error.message}`);
                    uploadedUrls.push(url);
                }
            }

            // Prepare data based on scope
            const finalData = {
                ...formData,
                year_target: formData.target_scope === 'all' ? 'All' : formData.year_target,
                department_target: formData.target_scope === 'all' ? 'All' : formData.department_target,
                section_target: formData.target_scope === 'all' ? 'All' : formData.section_target,
                author_id: user.uid,
                author_name: profile?.full_name || 'Unknown',
                attachments: uploadedUrls,
                status: isDraft ? 'draft' : 'published',
                created_at: new Date()
            };

            await createDocument('circulars', finalData);
            notify(isDraft ? '💾 Draft saved' : '✅ Broadcast sent', 'success');
            clearLocalDraft();
            navigate('/dashboard');
        } catch (error) {
            notify(`Failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#fcfbfb] font-sans flex flex-col">

            <main className="flex-1 overflow-y-auto pb-40 px-4 scroll-smooth">
                {/* Page Title */}
                <div className="py-6">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">Compose Broadcast</h2>
                    <p className="text-slate-500 text-xs font-medium mt-0.5">Ready to update the campus?</p>
                </div>

                {/* Content Fields */}
                <div className="space-y-6">
                    {/* Heading */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Title Heading</label>
                        <input 
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-base font-bold text-slate-900 focus:ring-4 focus:ring-[#ec5b13]/10 focus:border-[#ec5b13] outline-none transition-all duration-300 shadow-sm"
                            placeholder="Enter a descriptive heading..." 
                            type="text"
                        />
                    </div>

                    {/* Body Message */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                        <textarea 
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full bg-white border-2 border-slate-100 rounded-[28px] p-5 text-base font-medium text-slate-800 focus:ring-4 focus:ring-[#ec5b13]/10 focus:border-[#ec5b13] outline-none transition-all duration-300 shadow-sm resize-none"
                            placeholder="Type your detailed message here..."
                            rows="5"
                        ></textarea>
                    </div>

                    {/* Targeted Options */}
                    <div className="space-y-5 bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-[#ec5b13]/10 rounded-lg">
                                    <Users size={16} className="text-[#ec5b13]" />
                                </div>
                                <h3 className="text-[10px] font-medium uppercase tracking-widest text-slate-800">Target Audience</h3>
                            </div>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                                <button 
                                    onClick={() => setFormData({ ...formData, target_scope: 'all' })}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                                        formData.target_scope === 'all' 
                                        ? 'bg-white text-[#ec5b13] shadow-sm' 
                                        : 'text-slate-400'
                                    }`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setFormData({ ...formData, target_scope: 'targeted' })}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                                        formData.target_scope === 'targeted' 
                                        ? 'bg-white text-[#ec5b13] shadow-sm' 
                                        : 'text-slate-400'
                                    }`}
                                >
                                    Target
                                </button>
                            </div>
                        </div>

                        {formData.target_scope === 'targeted' && (
                            <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Year Selection */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Select Year</p>
                                    <div className="flex flex-wrap gap-2">
                                        {years.map(year => (
                                            <button
                                                key={year}
                                                onClick={() => setFormData({ ...formData, year_target: year })}
                                                className={`px-4 py-1.5 rounded-full text-[9px] font-medium transition-all duration-300 active:scale-95 ${
                                                    formData.year_target === year 
                                                    ? 'bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20 scale-105' 
                                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Branch Selection */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Select Branch</p>
                                    <div className="flex flex-wrap gap-2">
                                        {branches.map(branch => (
                                            <button
                                                key={branch}
                                                onClick={() => setFormData({ ...formData, department_target: branch })}
                                                className={`px-4 py-1.5 rounded-xl text-[9px] font-medium transition-all duration-300 active:scale-95 ${
                                                    formData.department_target === branch 
                                                    ? 'bg-white border-2 border-[#ec5b13] text-[#ec5b13] shadow-sm scale-105 z-10' 
                                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}
                                            >
                                                {branch}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Section Selection */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest ml-1">Select Section</p>
                                    <div className="flex gap-2">
                                        {sections.map(sec => (
                                            <button
                                                key={sec}
                                                onClick={() => setFormData({ ...formData, section_target: sec })}
                                                className={`flex-1 py-1.5 rounded-xl text-[9px] font-medium transition-all duration-300 active:scale-95 ${
                                                    formData.section_target === sec 
                                                    ? 'bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20 scale-105' 
                                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                }`}
                                            >
                                                Section {sec}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.target_scope === 'all' && (
                            <div className="py-2 animate-in fade-in duration-500">
                                <p className="text-[10px] font-semibold text-slate-400 text-center italic">This broadcast will reach every student in the institution.</p>
                            </div>
                        )}
                    </div>

                    {/* Priority */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 ml-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ec5b13]"></div>
                            <h3 className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Set Priority Level</h3>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setFormData({ ...formData, priority: 'standard' })}
                                className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-[24px] border-2 transition-all duration-300 active:scale-95 ${
                                    formData.priority === 'standard'
                                    ? 'border-[#ec5b13] bg-[#ec5b13]/5 text-[#ec5b13] shadow-md'
                                    : 'border-white bg-white text-slate-400 shadow-sm'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors ${formData.priority === 'standard' ? 'bg-[#ec5b13]/10' : 'bg-slate-50'}`}>
                                    <Clock size={18} />
                                </div>
                                <span className="font-semibold text-[10px] uppercase tracking-tight">Standard</span>
                            </button>
                            <button 
                                onClick={() => setFormData({ ...formData, priority: 'urgent' })}
                                className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-[24px] border-2 transition-all duration-300 active:scale-95 ${
                                    formData.priority === 'urgent'
                                    ? 'border-red-500 bg-red-50 text-red-600 shadow-md'
                                    : 'border-white bg-white text-slate-400 shadow-sm'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors ${formData.priority === 'urgent' ? 'bg-red-500/10' : 'bg-slate-50'}`}>
                                    <AlertCircle size={18} />
                                </div>
                                <span className="font-semibold text-[10px] uppercase tracking-tight">Urgent</span>
                            </button>
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 ml-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            <h3 className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Supporting Docs</h3>
                        </div>
                        
                        {/* File List */}
                        <AnimatePresence>
                            {files.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {files.map((file, i) => (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                            key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl"
                                        >
                                            <Paperclip size={14} className="text-slate-400" />
                                            <span className="flex-1 text-[11px] font-semibold text-slate-700 truncate">{file.name}</span>
                                            <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>

                        <label className="border-3 border-dashed border-slate-100 rounded-[32px] p-8 flex flex-col items-center justify-center bg-white shadow-sm active:bg-slate-50 transition-colors cursor-pointer group">
                            <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            <UploadCloud size={32} className="text-slate-300" />
                            <div className="mt-2 text-center">
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">PDF, Images or Documents (Max 100MB)</p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-semibold shadow-lg shadow-black/10 active:scale-95 transition-all">
                                <Plus size={16} strokeWidth={3} />
                                Add Files
                            </div>
                        </label>
                    </div>
                </div>
            </main>

            {/* Footer Buttons - Floating Style */}
            <footer className="fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white rounded-[28px] p-3 flex gap-3 z-50 shadow-2xl shadow-black/10">
                <button 
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-[20px] bg-slate-100 text-slate-600 font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <FileText size={16} />
                    Draft
                </button>
                <button 
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="flex-[2] py-3.5 rounded-[20px] bg-[#ec5b13] text-white font-semibold text-xs shadow-xl shadow-[#ec5b13]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span className="truncate max-w-[80px]">{uploadProgress}</span>
                        </>
                    ) : (
                        <>
                            <Send size={16} strokeWidth={2.5} />
                            <span>Broadcast Now</span>
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};

export default CreateCircularMobile;

