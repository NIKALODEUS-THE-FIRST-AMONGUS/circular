import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../components/Toaster';
import { motion, AnimatePresence } from 'framer-motion';
import CircularCard from '../components/CircularCard';
import {
    Send, Paperclip, X, AlertCircle, CheckCircle2,
    Loader2, Target, Zap, Eye, EyeOff, Info,
    UploadCloud, Pencil, Sparkles, Save
} from 'lucide-react';
import { withAdaptiveTimeout } from '../lib/networkSpeed';
import { safeError, safeWarn, safeGroup, safeGroupEnd } from '../utils/logger';
import { uploadToCloudinary } from '../lib/cloudinary';
import { createCircular, updateCircular, createAuditLog } from '../lib/firebase-db';

const DRAFT_KEY = 'circular_draft';

const CreateCircular = () => {
    const { user, profile } = useAuth();
    const notify = useNotify();
    const navigate = useNavigate();
    const location = useLocation();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('standard');
    const [dept, setDept] = useState(profile?.department || 'ALL');
    const [files, setFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [targetType, setTargetType] = useState('universal');
    const [targetYear, setTargetYear] = useState('ALL');
    const [targetSection, setTargetSection] = useState('ALL');
    const [lastSaved, setLastSaved] = useState(null);
    const [editingDraftId, setEditingDraftId] = useState(null);

    // Load draft from navigation state or localStorage
    useEffect(() => {
        // Check if we're editing a draft from the Drafts page
        if (location.state?.draft) {
            const draft = location.state.draft;
            setEditingDraftId(draft.id);
            setTitle(draft.title || '');
            setContent(draft.content || '');
            setPriority(draft.priority || 'standard');
            setDept(draft.department_target || profile?.department || 'ALL');
            setTargetType(draft.department_target === 'ALL' ? 'universal' : 'targeted');
            setTargetYear(draft.target_year || 'ALL');
            setTargetSection(draft.target_section || 'ALL');
            notify('📝 Draft loaded for editing', 'info');
            return;
        }

        // Otherwise load from localStorage
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const draft = JSON.parse(saved);
                setTitle(draft.title || '');
                setContent(draft.content || '');
                setPriority(draft.priority || 'standard');
                setDept(draft.dept || profile?.department || 'ALL');
                setTargetType(draft.targetType || 'universal');
                setTargetYear(draft.targetYear || 'ALL');
                setTargetSection(draft.targetSection || 'ALL');
                setLastSaved(new Date(draft.timestamp));
                notify('📝 Draft restored', 'info');
            }
        } catch (err) {
            console.error('Failed to load draft:', err);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-save draft
    useEffect(() => {
        if (!title && !content) return;

        const timer = setTimeout(() => {
            try {
                const draft = {
                    title,
                    content,
                    priority,
                    dept,
                    targetType,
                    targetYear,
                    targetSection,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                setLastSaved(new Date());
            } catch (err) {
                console.error('Failed to save draft:', err);
            }
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => clearTimeout(timer);
    }, [title, content, priority, dept, targetType, targetYear, targetSection]);

    // Clear draft on successful publish
    const clearDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
            setLastSaved(null);
        } catch (err) {
            console.error('Failed to clear draft:', err);
        }
    };

    const departments = [
        { id: 'ALL', label: 'All Hubs' },
        { id: 'CSE', label: 'CSE' },
        { id: 'AIDS', label: 'AIDS' },
        { id: 'AIML', label: 'AIML' },
        { id: 'ECE', label: 'ECE' },
        { id: 'EEE', label: 'EEE' },
        { id: 'MECH', label: 'MECH' },
        { id: 'CIVIL', label: 'CIVIL' },
    ];

    const handleFileChange = (e) => {
        const sel = Array.from(e.target.files);
        
        // Allowed file types
        const ALLOWED_EXTENSIONS = {
            images: ['jpg', 'jpeg', 'png', 'webp'],
            documents: ['pdf', 'doc', 'docx'],
            spreadsheets: ['xls', 'xlsx']
        };
        
        const ALLOWED_MIME_TYPES = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        
        // Validate files before adding
        const validFiles = [];
        const errors = [];
        
        sel.forEach(file => {
            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} exceeds 5MB limit`);
                return;
            }
            
            // Check file extension
            const fileExt = file.name.split('.').pop().toLowerCase();
            const allAllowedExts = [...ALLOWED_EXTENSIONS.images, ...ALLOWED_EXTENSIONS.documents, ...ALLOWED_EXTENSIONS.spreadsheets];
            
            if (!allAllowedExts.includes(fileExt)) {
                errors.push(`${file.name}: Only JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX allowed`);
                return;
            }
            
            // Check MIME type
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                errors.push(`${file.name}: Invalid file type`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (errors.length > 0) {
            notify(`⚠️ ${errors.join(' • ')}`, 'error', { duration: 5000 });
        }
        
        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
            
            // Create optimized previews
            const newUrls = validFiles.map(f => {
                if (f.type.startsWith('image/')) {
                    // For images, create optimized preview
                    return URL.createObjectURL(f);
                }
                return null;
            });
            
            setPreviewUrls(prev => [...prev, ...newUrls]);
            notify(`📎 ${validFiles.length} file(s) attached`, 'success');
        }
    };

    const removeFile = (i) => {
        URL.revokeObjectURL(previewUrls[i]);
        setFiles(prev => prev.filter((_, idx) => idx !== i));
        setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
        notify('🗑️ File removed', 'info');
    };

    const handleSubmit = async (e, forcedStatus = 'published') => {
        e?.preventDefault();
        if (!title.trim() || !content.trim()) {
            notify('⚠️ Please fill in the title and message', 'error');
            return;
        }

        setLoading(true);
        setUploadProgress('Preparing...');
        notify('📝 Creating circular...', 'info');
        safeGroup('📤 Create Circular Debug');

        try {
            // Upload files to Cloudinary with progress tracking
            const uploadedUrls = [];
            if (files.length > 0) {
                notify(`📤 Uploading ${files.length} file(s) to Cloudinary...`, 'info');
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

                    const { url, error: upErr } = await uploadToCloudinary(file);

                    if (upErr || !url) {
                        safeError('Cloudinary upload error:', upErr);
                        throw new Error(`Failed to upload ${file.name}: ${upErr?.message || 'Unknown error'}`);
                    }

                    uploadedUrls.push(url);
                }
                notify(`✅ ${files.length} file(s) uploaded`, 'success');
            }

            // Insert circular
            setUploadProgress('Saving circular...');
            const authorName = (() => {
                const titles = [];
                if (profile?.academic_title) titles.push(profile.academic_title);
                if (profile?.gender_title) titles.push(profile.gender_title);
                if (titles.length === 0 && profile?.title) titles.push(profile.title);
                
                const name = profile?.full_name || user.email.split('@')[0];
                return titles.length > 0 ? `${titles.join('. ')}. ${name}` : name;
            })();
            
            const circularData = {
                title,
                content,
                author_id: user.uid,
                author_name: authorName,
                department_target: targetType === 'universal' ? 'ALL' : dept,
                target_year: targetType === 'universal' ? 'ALL' : targetYear,
                target_section: targetType === 'universal' ? 'ALL' : targetSection,
                priority,
                attachments: uploadedUrls,
                status: forcedStatus
            };


            // Insert or update circular with Firebase
            setUploadProgress(editingDraftId ? 'Updating draft...' : 'Saving circular...');
            
            let created;
            if (editingDraftId) {
                // Update existing draft or publish it
                created = await withAdaptiveTimeout(
                    updateCircular(editingDraftId, circularData),
                    { multiplier: 3 }
                );

                if (!created) {
                    throw new Error('Failed to update circular');
                }
                
                // Add the ID back since updateCircular returns it
                created.id = editingDraftId;
            } else {
                // Create new circular with Firebase
                created = await withAdaptiveTimeout(
                    createCircular(circularData),
                    { multiplier: 3 }
                );

                if (!created || !created.id) {
                    throw new Error('Failed to create circular');
                }
            }

            // Audit log in background (non-blocking)
            (async () => {
                try {
                    await createAuditLog({
                        actor_id: user.uid,
                        action: forcedStatus === 'draft' ? 'save_draft' : 'create_circular',
                        details: { title, priority, dept },
                    });
                } catch (err) {
                    safeWarn('Audit log failed (non-critical):', err);
                }
            })();

            // TODO: Send FCM notifications for published circulars
            // This requires Firebase Cloud Functions or a backend API
            if (forcedStatus === 'published' && created?.id) {
                setUploadProgress('Circular published!');
                notify('🔔 Circular published successfully', 'success');
                console.log('📢 Notification system: TODO - Implement Firebase Cloud Functions for push notifications');
            }

            safeGroupEnd();
            notify(
                forcedStatus === 'draft'
                    ? '✅ Draft saved successfully!'
                    : '✅ Circular broadcasted successfully!',
                'success'
            );

            // Clear draft from localStorage on successful publish
            clearDraft();

            // Navigate based on action
            if (forcedStatus === 'published' && created?.id) {
                // After publishing, navigate to center with refresh flag
                setTimeout(() => {
                    setLoading(false);
                    navigate('/dashboard/center', { state: { refresh: true } });
                }, 600);
            } else if (forcedStatus === 'draft') {
                // After saving draft, navigate to drafts page
                setTimeout(() => {
                    setLoading(false);
                    navigate('/dashboard/drafts');
                }, 600);
            }
        } catch (err) {
            safeError('Submit error:', err);
            safeGroupEnd();
            notify(`❌ Failed to ${forcedStatus === 'draft' ? 'save draft' : 'publish'}: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setUploadProgress('');
        }
    };

    /* ── derived state ── */
    const canBroadcast = title.trim() && content.trim() && !loading;

    return (
        <div className="max-w-6xl mx-auto px-4 lg:px-0">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">

                {/* ── Page header ── */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary text-[11px] font-black uppercase tracking-[0.2em] mb-1">
                            <Sparkles size={13} className="animate-pulse" />
                            Creative Studio
                        </div>
                        <h1 className="text-3xl font-black text-text-main tracking-tight">
                            Compose Broadcast<span className="text-primary">.</span>
                        </h1>
                        <p className="text-text-muted text-sm font-medium">
                            Draft and distribute official institutional circulars.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <motion.div 
                                initial={{ scale: 1 }}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 0.3 }}
                                key={lastSaved.toString()}
                                className="flex items-center gap-2 px-3 py-2 bg-success/10 dark:bg-success/10 border border-success/30 text-success rounded-lg"
                            >
                                <div className="relative">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                    <div className="absolute -right-0.5 -bottom-0.5 bg-success rounded-full">
                                        <svg className="w-2.5 h-2.5 text-white dark:text-slate-900" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd"></path>
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-[10px] font-semibold hidden sm:inline">
                                    Saved {new Date(lastSaved).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </motion.div>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsPreview(p => !p)}
                            className={`
                                inline-flex items-center gap-2 h-11 px-6 rounded-full border font-bold text-sm transition-all
                                ${isPreview
                                    ? 'bg-primary/10 text-primary border-[#1a73e8]/30'
                                    : 'bg-bg-light text-text-muted border-border-light hover:border-[#1a73e8]/40 hover:text-primary'}
                            `}
                        >
                            {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                            {isPreview ? 'Back to Editor' : 'Live Preview'}
                        </button>
                    </div>
                </header>

                {/* ── Two-column layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-8 items-start">

                    {/* ── Left: Editor / Preview ── */}
                    <div>
                        <AnimatePresence mode="wait">
                            {isPreview ? (

                                <motion.div
                                    key="preview"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-700">
                                        <Info size={15} />
                                        <p className="text-[11px] font-black uppercase tracking-wider">Live Preview — as seen by members</p>
                                    </div>
                                    <CircularCard circular={{
                                        title: title || 'Untitled Circular',
                                        content: content || 'No content drafted yet…',
                                        author_name: (() => {
                                            const titles = [];
                                            if (profile?.academic_title) titles.push(profile.academic_title);
                                            if (profile?.gender_title) titles.push(profile.gender_title);
                                            if (titles.length === 0 && profile?.title) titles.push(profile.title);
                                            const name = profile?.full_name || user?.email;
                                            return titles.length > 0 ? `${titles.join('. ')}. ${name}` : name;
                                        })(),
                                        department_target: dept,
                                        priority,
                                        attachments: previewUrls,
                                        created_at: new Date().toISOString(),
                                    }} />
                                </motion.div>

                            ) : (

                                <motion.div
                                    key="editor"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    className="bg-bg-light rounded-[40px] border border-border-light shadow-google p-8 space-y-8"
                                >
                                    {/* Headline */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.18em]">
                                            Circular Headline <span className="text-text-dim font-normal normal-case text-[9px]">(Shift+Enter for new line)</span>
                                        </label>
                                        <textarea
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            placeholder="Enter a clear, descriptive title…"
                                            rows={2}
                                            className="w-full bg-surface-light border border-border-light rounded-xl px-4 py-3 text-[18px] font-black text-text-main placeholder:text-[#bdc1c6] placeholder:font-normal outline-none focus:border-[#1a73e8] focus:bg-bg-light transition-all resize-none"
                                        />
                                    </div>

                                    {/* Body */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.18em]">
                                            Broadcast Message
                                        </label>
                                        <textarea
                                            value={content}
                                            onChange={e => setContent(e.target.value)}
                                            placeholder="Write your message here. Be clear and concise."
                                            rows={12}
                                            maxLength={5000}
                                            className="w-full bg-surface-light border border-border-light rounded-xl px-4 py-3 text-[15px] font-medium text-text-main placeholder:text-[#bdc1c6] placeholder:font-normal outline-none focus:border-[#1a73e8] focus:bg-bg-light transition-all resize-none leading-relaxed"
                                        />
                                        <div className="flex justify-end">
                                            <span className={`text-[10px] font-bold ${content.length > 4500 ? 'text-[#d93025]' : 'text-text-dim'}`}>
                                                {content.length} / 5000
                                            </span>
                                        </div>
                                    </div>

                                    {/* Attachments */}
                                    <div className="space-y-3 pt-6 border-t border-[#f1f3f4]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <Paperclip size={15} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">Attachments</span>
                                            </div>
                                            <span className="text-[10px] text-text-dim font-bold">{files.length} attached</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <AnimatePresence>
                                                {files.map((file, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ scale: 0.85, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.85, opacity: 0 }}
                                                        className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-border-light"
                                                    >
                                                        <Paperclip size={12} className="text-primary" />
                                                        <span className="text-[11px] font-bold text-text-main max-w-[160px] truncate">{file.name}</span>
                                                        <button type="button" onClick={() => removeFile(i)} className="text-text-dim hover:text-[#d93025] transition-colors">
                                                            <X size={13} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            <label className="cursor-pointer group relative">
                                                <div 
                                                    className="flex items-center gap-2 bg-bg-light border-2 border-dashed border-border-light hover:border-[#1a73e8] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider text-text-muted hover:text-primary transition-all"
                                                    onClick={() => {
                                                        notify('📎 Supported formats: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX (Max 5MB)', 'info', { duration: 4000 });
                                                    }}
                                                >
                                                    <UploadCloud size={14} />
                                                    Add File
                                                </div>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    className="hidden" 
                                                    accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                                    onChange={handleFileChange}
                                                    onClick={() => {
                                                        // Show toast when file input is clicked
                                                        notify('📎 Supported formats: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX (Max 5MB)', 'info', { duration: 4000 });
                                                    }}
                                                />
                                                
                                                {/* Info Tooltip */}
                                                <div className="absolute left-0 top-full mt-2 w-64 bg-bg-dark text-white text-[10px] p-3 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                                    <div className="flex items-start gap-2">
                                                        <Info size={14} className="text-primary shrink-0 mt-0.5" />
                                                        <div className="space-y-1">
                                                            <p className="font-bold">Allowed file types:</p>
                                                            <p className="text-text-muted">
                                                                <span className="text-white">Images:</span> JPG, PNG, WEBP<br/>
                                                                <span className="text-white">Documents:</span> PDF, DOC, DOCX<br/>
                                                                <span className="text-white">Spreadsheets:</span> XLS, XLSX
                                                            </p>
                                                            <p className="text-[9px] text-text-muted mt-2">Max 5MB per file</p>
                                                        </div>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-bg-dark transform rotate-45"></div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Right: Configuration panel ── */}
                    <aside className="space-y-6 lg:sticky lg:top-20">

                        <div className="bg-bg-light rounded-[32px] border border-border-light shadow-google p-6 space-y-6">

                            {/* Target Audience */}
                            <div className="flex items-center gap-2">
                            <Target size={17} className="text-primary" />
                            <span className="text-[12px] font-black text-text-main uppercase tracking-[0.15em]">Target Scope</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setTargetType('universal')}
                                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${targetType === 'universal' ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-bg-light text-text-muted border-border-light'}`}
                            >
                                Universal
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('targeted')}
                                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${targetType === 'targeted' ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-bg-light text-text-muted border-border-light'}`}
                            >
                                Targeted
                            </button>
                            </div>

                            <AnimatePresence>
                            {targetType === 'targeted' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 overflow-hidden pt-2"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Year</label>
                                        <div className="grid grid-cols-5 gap-1">
                                            {['ALL', '1', '2', '3', '4'].map(y => (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => setTargetYear(y)}
                                                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${targetYear === y ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-bg-light text-text-muted border-border-light'}`}
                                                >
                                                    {y === 'ALL' ? 'All' : `${y}yr`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Branch (Hub)</label>
                                        <select
                                            value={dept}
                                            onChange={e => setDept(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-border-light focus:border-[#1a73e8] outline-none text-[11px] font-bold text-text-main bg-bg-light transition-all"
                                        >
                                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Section</label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {['ALL', 'A', 'B', 'C'].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setTargetSection(s)}
                                                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${targetSection === s ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-bg-light text-text-muted border-border-light'}`}
                                                >
                                                    {s === 'ALL' ? 'All' : s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>

                            <p className="text-[10px] text-text-dim font-medium italic pt-2 border-t border-[#f1f3f4]">
                            {targetType === 'universal'
                                ? 'This broadcast will be visible to everyone across all departments.'
                                : `Targeting: ${targetYear === 'ALL' ? 'All Years' : `Year ${targetYear}`} | ${dept} | ${targetSection === 'ALL' ? 'All Sections' : `Sec ${targetSection}`}`}
                            </p>

                            {/* Priority */}
                            <div className="mt-4 pt-4 border-t border-[#f1f3f4] space-y-4">
                            <div className="flex items-center gap-2">
                                <Zap size={17} className="text-amber-500" />
                                <span className="text-[12px] font-black text-text-main uppercase tracking-[0.15em]">Priority</span>
                                </div>
                                <div className="grid gap-2">
                                {[
                                    { id: 'standard', Icon: CheckCircle2, label: 'Standard', desc: 'Regular announcement' },
                                    { id: 'important', Icon: AlertCircle, label: 'High Priority', desc: 'Urgent — highlighted in feed' },
                                ].map(({ id, Icon, label, desc }) => ( // eslint-disable-line no-unused-vars
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setPriority(id)}
                                        className={`
                                            flex items-center gap-3 p-4 rounded-2xl border text-left transition-all
                                            ${priority === id
                                                ? id === 'important'
                                                    ? 'bg-red-50 border-[#d93025]/30 text-[#d93025]'
                                                    : 'bg-primary/10 border-[#1a73e8]/30 text-primary'
                                                : 'bg-surface-light border-border-light text-text-muted hover:bg-bg-light'}
                                        `}
                                    >
                                        <Icon size={18} />
                                        <div>
                                            <p className="text-[12px] font-black uppercase tracking-wider">{label}</p>
                                            <p className="text-[10px] font-medium opacity-70 mt-0.5">{desc}</p>
                                        </div>
                                    </button>
                                ))}
                                </div>
                            </div>
                        </div>

                        {/* Broadcast button */}
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => handleSubmit(e, 'draft')}
                                    disabled={!canBroadcast}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
                                        ${canBroadcast
                                            ? 'bg-bg-light text-text-muted border border-border-light hover:bg-surface-light shadow-sm active:scale-[0.98]'
                                            : 'bg-primary/5 text-[#bdc1c6] cursor-not-allowed'}
                                    `}
                                >
                                    {loading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Pencil size={14} />
                                            <span className="hidden sm:inline">Save Draft</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={(e) => handleSubmit(e, 'published')}
                                    disabled={!canBroadcast}
                                    className={`
                                        flex-[1.5] flex items-center justify-center gap-3 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
                                        ${canBroadcast
                                            ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-md hover:shadow-lg active:scale-[0.98]'
                                            : 'bg-primary/5 text-[#bdc1c6] cursor-not-allowed'}
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>{uploadProgress || "Publishing..."}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> Broadcast
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Live System Active</span>
                                </div>
                                <p className="text-[9px] text-text-dim font-medium">
                                    Publishing as: <span className="font-bold text-text-main">{user?.email}</span>
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateCircular;
