import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, User, Paperclip, ExternalLink, ShieldAlert, Share2,
    ChevronDown, ChevronUp, ChevronRight, Clock, Tag, Pencil, Trash2, X, Check,
    AlertTriangle, Loader2, Download, FileText, FileImage, FileSpreadsheet,
    FileArchive, Film, Music, File, TrendingDown, Users, Maximize2, Trash,
    Eye, Shield
} from 'lucide-react';
import { createDocument, deleteCircular } from '../lib/firebase-db';
import { useNotify as useToast } from './Toaster';

const DEPTS = ['ALL', 'CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const getFileExtension = (url) => {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('.').pop().toLowerCase();
    } catch {
        return '';
    }
};

const getFileName = (url) => {
    try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/');
        const raw = decodeURIComponent(parts[parts.length - 1]);
        return raw || 'Document';
    } catch {
        return 'Document';
    }
};

const isImageUrl = (url) => {
    const ext = getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
};

const getFileInfo = (url) => {
    const ext = getFileExtension(url);
    const typeMap = {
        pdf: { icon: FileText, label: 'PDF', color: '#e53935', bg: '#fce4ec' },
        doc: { icon: FileText, label: 'DOC', color: '#1a73e8', bg: '#e8f0fe' },
        docx: { icon: FileText, label: 'DOCX', color: '#1a73e8', bg: '#e8f0fe' },
        xls: { icon: FileSpreadsheet, label: 'XLS', color: '#0f9d58', bg: '#e6f4ea' },
        xlsx: { icon: FileSpreadsheet, label: 'XLSX', color: '#0f9d58', bg: '#e6f4ea' },
        csv: { icon: FileSpreadsheet, label: 'CSV', color: '#0f9d58', bg: '#e6f4ea' },
        ppt: { icon: FileText, label: 'PPT', color: '#f4511e', bg: '#fce8e6' },
        pptx: { icon: FileText, label: 'PPTX', color: '#f4511e', bg: '#fce8e6' },
        jpg: { icon: FileImage, label: 'IMAGE', color: '#7c4dff', bg: '#ede7f6' },
        jpeg: { icon: FileImage, label: 'IMAGE', color: '#7c4dff', bg: '#ede7f6' },
        png: { icon: FileImage, label: 'IMAGE', color: '#7c4dff', bg: '#ede7f6' },
        gif: { icon: FileImage, label: 'IMAGE', color: '#7c4dff', bg: '#ede7f6' },
        webp: { icon: FileImage, label: 'IMAGE', color: '#7c4dff', bg: '#ede7f6' },
        svg: { icon: FileImage, label: 'SVG', color: '#7c4dff', bg: '#ede7f6' },
        zip: { icon: FileArchive, label: 'ZIP', color: '#ff7043', bg: '#fbe9e7' },
        rar: { icon: FileArchive, label: 'RAR', color: '#ff7043', bg: '#fbe9e7' },
        mp4: { icon: Film, label: 'VIDEO', color: '#00897b', bg: '#e0f2f1' },
        mp3: { icon: Music, label: 'AUDIO', color: '#e91e63', bg: '#fce4ec' },
        txt: { icon: FileText, label: 'TXT', color: '#546e7a', bg: '#eceff1' },
    };
    return typeMap[ext] || { icon: File, label: ext.toUpperCase() || 'FILE', color: '#5f6368', bg: '#f1f3f4' };
};

/* ── LinkPreview ────────────────────────────────────────────────────────────── */

const LinkPreview = ({ url }) => {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isDrive = url.includes('drive.google.com');

    return (
        <motion.a
            href={url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group block p-4 rounded-3xl border border-border-light/30 bg-surface-light/40 hover:bg-surface-light hover:border-primary hover:shadow-m3-2 transition-all duration-300 no-underline"
        >
            <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${isYouTube ? 'bg-red-50 text-red-600' : isDrive ? 'bg-green-50 text-green-600' : 'bg-primary/10 text-primary'}`}>
                    {isYouTube ? <Film size={20} /> : isDrive ? <FileText size={20} /> : <ExternalLink size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-0.5">
                        {isYouTube ? 'YouTube Media' : isDrive ? 'Google Drive' : 'External Link'}
                    </p>
                    <p className="text-sm font-black text-text-main truncate group-hover:text-primary transition-colors italic">
                        {url}
                    </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-text-dim group-hover:text-primary group-hover:rotate-45 transition-all">
                    <ExternalLink size={14} />
                </div>
            </div>
        </motion.a>
    );
};

/* ── PDFDownloader ─────────────────────────────────────────────────────────── */

const PDFDownloader = ({ pdfUrls, circularId, userId, onDownloadRecorded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [downloading, setDownloading] = useState(null);

    const handleDownload = async (url, index) => {
        setDownloading(index);
        try {
            if (userId) {
                await createDocument('circular_downloads', {
                    circular_id: circularId,
                    attachment_url: url,
                    user_id: userId,
                });
                onDownloadRecorded?.();
            }
            window.open(url, '_blank', 'noreferrer');
        } catch {
            window.open(url, '_blank', 'noreferrer');
        } finally {
            setDownloading(null);
        }
    };

    if (pdfUrls.length === 0) return null;

    if (pdfUrls.length === 1) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex items-center gap-3 p-3 rounded-2xl border border-border-light/60 bg-surface-light hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => handleDownload(pdfUrls[0], 0)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-11 w-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[#fce4ec]">
                    <FileText size={20} style={{ color: '#e53935' }} />
                </div>
                <div className="flex-1 min-w-0 relative">
                    <p className="text-[12px] font-black text-text-main truncate leading-tight">
                        {getFileName(pdfUrls[0])}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#e53935' }}>
                        PDF
                    </p>
                </div>
                <div className="relative shrink-0 h-8 w-8 rounded-xl flex items-center justify-center bg-surface-light group-hover:bg-primary group-hover:text-white transition-all">
                    {downloading === 0 ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
        >
            <div
                className="group relative flex items-center gap-3 p-3 rounded-2xl border border-border-light/60 bg-surface-light hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-11 w-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[#fce4ec]">
                    <Shield size={20} style={{ color: '#e53935' }} />
                </div>
                <div className="flex-1 min-w-0 relative">
                    <p className="text-[12px] font-black text-text-main leading-tight">
                        Secure PDF Documents
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#e53935' }}>
                        {pdfUrls.length} FILES AVAILABLE
                    </p>
                </div>
                <div className="relative shrink-0 h-8 w-8 rounded-xl flex items-center justify-center bg-surface-light group-hover:bg-primary group-hover:text-white transition-all">
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={14} />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-2 space-y-2"
                    >
                        {pdfUrls.map((url, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group/item relative flex items-center gap-3 p-3 pl-6 rounded-2xl border border-border-light/40 bg-bg-light hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(url, index);
                                }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary" />
                                <div className="relative h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-[#fce4ec]">
                                    <FileText size={16} style={{ color: '#e53935' }} />
                                </div>
                                <div className="flex-1 min-w-0 relative">
                                    <p className="text-[11px] font-bold text-text-main truncate">
                                        {getFileName(url)}
                                    </p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-dim">
                                        PDF Document
                                    </p>
                                </div>
                                <div className="relative shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-surface-light group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                    {downloading === index ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ── AttachmentTile ─────────────────────────────────────────────────────────── */

const AttachmentTile = ({ url, index, circularId, userId, onDownloadRecorded }) => {
    const [downloading, setDownloading] = useState(false);
    const { icon: Icon, label, color, bg } = getFileInfo(url);
    const fileName = getFileName(url);

    const handleDownload = async (e) => {
        e.stopPropagation();
        setDownloading(true);
        try {
            if (userId) {
                await createDocument('circular_downloads', {
                    circular_id: circularId,
                    attachment_url: url,
                    user_id: userId,
                });
                onDownloadRecorded?.();
            }
            window.open(url, '_blank', 'noreferrer');
        } catch {
            // console.error('Download log error');
            window.open(url, '_blank', 'noreferrer');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="group relative flex items-center gap-3 p-3 rounded-2xl border border-border-light/60 bg-surface-light hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
            onClick={handleDownload}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            title={`Click to download: ${fileName}`}
        >
            <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div
                className="relative h-11 w-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: bg }}
            >
                <Icon size={20} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0 relative">
                <p className="text-[12px] font-black text-text-main truncate leading-tight">
                    {fileName}
                </p>
                <p
                    className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                    style={{ color }}
                >
                    {label}
                </p>
            </div>
            <div className="relative shrink-0 h-8 w-8 rounded-xl flex items-center justify-center bg-surface-light group-hover:bg-primary group-hover:text-white transition-all">
                {downloading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Download size={14} />
                }
            </div>
        </motion.div>
    );
};

/* ── ImagePreview ───────────────────────────────────────────────────────────── */

const ImagePreview = ({ url, index, circularId, userId, onDownloadRecorded }) => {
    const [loading, setLoading] = useState(true);
    const [showFullSize, setShowFullSize] = useState(false);
    const fileName = getFileName(url);

    const handleDownload = async (e) => {
        e.stopPropagation();
        try {
            if (userId) {
                await createDocument('circular_downloads', {
                    circular_id: circularId,
                    attachment_url: url,
                    user_id: userId,
                });
                onDownloadRecorded?.();
            }
            window.open(url, '_blank', 'noreferrer');
        } catch {
            window.open(url, '_blank', 'noreferrer');
        }
    };

    const handleImageClick = (e) => {
        e.stopPropagation();
        setShowFullSize(true);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group cursor-pointer overflow-hidden rounded-2xl border border-border-light/30 bg-surface-light aspect-square"
                onClick={handleImageClick}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-primary/40" />
                    </div>
                )}
                <img
                    src={url}
                    alt={fileName}
                    onLoad={() => setLoading(false)}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${loading ? 'opacity-0' : 'opacity-100'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="p-3 bg-white/90 dark:bg-black/90 text-text-main rounded-full shadow-lg backdrop-blur-sm">
                        <Maximize2 size={18} />
                    </div>
                </div>
            </motion.div>

            {/* Full Size Modal */}
            <AnimatePresence>
                {showFullSize && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                        onClick={() => setShowFullSize(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-7xl max-h-[90vh] w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowFullSize(false)}
                                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                            <img
                                src={url}
                                alt={fileName}
                                className="w-full h-full object-contain rounded-2xl"
                            />
                            <button
                                onClick={handleDownload}
                                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-all shadow-lg"
                            >
                                <Download size={16} />
                                Download
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

/* ── CircularCard ───────────────────────────────────────────────────────────── */

const CircularCard = ({ circular, profile, onDelete, onUpdate }) => {
    const navigate = useNavigate();
    const notify = useToast();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({});

    const { id, title, content, author_id, department_target, priority, attachments, created_at } = circular;

    const date = new Date(created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const isImportant = priority === 'important';
    const canManage = profile && (profile.id === author_id || profile.role === 'admin');


    // Separate images, PDFs, and other attachments
    const images = (attachments || []).filter(isImageUrl);
    const pdfs = (attachments || []).filter(url => getFileExtension(url) === 'pdf');
    const otherDocs = (attachments || []).filter(url => !isImageUrl(url) && getFileExtension(url) !== 'pdf');



    const handleShare = async (e) => {
        e.stopPropagation();
        const shareText = `${title}\n\n${content}\n\n- Shared from SuchnaX Link`;
        
        // Try native share API first (mobile/modern browsers)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: shareText,
                });
                notify("Shared successfully!", "success");
                return;
            } catch (shareErr) {
                // User cancelled or share failed, fall back to clipboard
                if (shareErr.name !== 'AbortError') {
                    console.log('Share failed, using clipboard');
                }
            }
        }
        
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(shareText);
            notify("Copied to clipboard!", "success");
        } catch {
            notify("Could not share", "error");
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            await deleteCircular(id);
            notify("Circular deleted.", "success");
            onDelete?.(id);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const openEdit = (e) => {
        e.stopPropagation();
        setEditData({
            title,
            content,
            priority,
            department_target,
            attachments: attachments || []
        });
        setShowEditModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Input Sanitization & Basic Validation
        const sanitizedTitle = stripHtml(editData.title).trim();
        const sanitizedContent = stripHtml(editData.content).trim();

        if (!sanitizedTitle || !sanitizedContent) {
            notify("Title and content cannot be empty or contain malicious tags.", "error");
            return;
        }

        setSaving(true);
        try {
            const { updateCircular } = await import('../lib/firebase-db');
            const updatedData = await updateCircular(id, {
                title: sanitizedTitle,
                content: sanitizedContent,
                priority: editData.priority,
                department_target: editData.department_target,
                attachments: editData.attachments
            });
            
            notify("Circular updated!", "success");
            onUpdate?.(updatedData);
            setShowEditModal(false);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const removeAttachment = (index) => {
        setEditData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`glass-card p-8 md:p-10 relative ${isImportant ? 'border-l-4 border-l-danger' : ''}`}
            >
                <div className="space-y-7">
                    {/* Header: Unified Proportional Badge System */}
                    <div
                        className="flex items-center justify-between border-b border-border-light/15 pb-5 cursor-pointer group/header"
                        onClick={() => navigate(`/dashboard/center/${id}`)}
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Priority & Target Joined Badge */}
                            <div className="flex items-center">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-l-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-sm z-10 border transition-all ${isImportant
                                    ? 'bg-danger text-white border-danger'
                                    : 'bg-primary text-white border-primary'
                                    }`}>
                                    {isImportant ? <ShieldAlert size={12} strokeWidth={3} /> : <Tag size={12} strokeWidth={3} />}
                                    {priority}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-surface-light border border-border-light border-l-0 rounded-r-xl text-[10px] font-bold uppercase tracking-wider text-text-main pr-5">
                                    <span className="text-text-muted/50 font-black">TO:</span> {department_target}
                                </div>
                            </div>

                            {/* Academic Context Badges */}
                            <div className="flex items-center gap-2">
                                {circular.target_year && circular.target_year !== 'ALL' && (
                                    <span className="px-3 py-1.5 bg-bg-light border border-primary/20 text-primary rounded-xl text-[9px] font-black uppercase tracking-tighter shadow-sm">
                                        BATCH {circular.target_year}
                                    </span>
                                )}
                                {circular.target_section && circular.target_section !== 'ALL' && (
                                    <span className="px-3 py-1.5 bg-bg-light border border-amber-500/30 text-amber-700 rounded-xl text-[9px] font-black uppercase tracking-tighter shadow-sm">
                                        SEC {circular.target_section}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-5">
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-light/50 rounded-xl border border-border-light/20">
                                <Clock size={12} strokeWidth={3} className="text-text-dim/40" />
                                <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">{date}</span>
                            </div>
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-light group-hover/header:bg-primary/10 group-hover/header:text-primary transition-all">
                                <ChevronRight size={18} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Body: Premium Typography & Smooth Expand */}
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                className="text-2xl md:text-3xl font-black text-text-main leading-[1.1] tracking-tighter hover:text-primary transition-colors cursor-pointer group/title flex-1"
                                onClick={() => navigate(`/dashboard/center/${id}`)}
                            >
                                {title}
                                <span className="inline-block h-1.5 w-1.5 bg-primary rounded-full ml-1.5 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                            </h2>
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button 
                                    onClick={handleShare} 
                                    className="h-10 w-10 flex items-center justify-center text-text-dim hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90"
                                    title="Share circular"
                                >
                                    <Share2 size={18} strokeWidth={2.5} />
                                </button>
                                {canManage && (
                                    <>
                                        <button 
                                            onClick={openEdit} 
                                            className="h-10 w-10 flex items-center justify-center text-text-dim hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90"
                                            title="Edit circular"
                                        >
                                            <Pencil size={16} strokeWidth={2.5} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} 
                                            className="h-10 w-10 flex items-center justify-center text-text-dim hover:text-danger hover:bg-danger/10 rounded-full transition-all active:scale-90"
                                            title="Delete circular"
                                        >
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <motion.p
                                layout
                                className="text-text-muted text-[16px] leading-relaxed font-medium whitespace-pre-wrap line-clamp-3 opacity-80"
                            >
                                {content}
                            </motion.p>

                            {/* Link Previews */}


                            {content.length > 200 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/center/${id}`); }}
                                    className="mt-3 text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 px-0 hover:gap-3 transition-all active:scale-95"
                                >
                                    OPEN FULL DOCUMENT <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Specialized Image Display - Side by Side Grid */}
                    {images.length > 0 && (
                        <div className={`grid gap-3 pt-2 ${
                            images.length === 1 ? 'grid-cols-1 max-w-2xl' : 
                            images.length === 2 ? 'grid-cols-2' : 
                            images.length === 3 ? 'grid-cols-3' : 
                            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                        }`}>
                            {images.map((url, i) => (
                                <ImagePreview
                                    key={i}
                                    url={url}
                                    index={i}
                                    circularId={id}
                                    userId={profile?.id}
                                    onDownloadRecorded={null}
                                />
                            ))}
                        </div>
                    )}

                    {/* Other Attachments */}
                    {(pdfs.length > 0 || otherDocs.length > 0) && (
                        <div className="space-y-3 pt-2">
                            {images.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="h-[1px] flex-1 bg-outline/20" />
                                    <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em]">Documents</span>
                                    <div className="h-[1px] flex-1 bg-outline/20" />
                                </div>
                            )}
                            <div className="space-y-2">
                                {/* PDF Downloader */}
                                {pdfs.length > 0 && (
                                    <PDFDownloader
                                        pdfUrls={pdfs}
                                        circularId={id}
                                        userId={profile?.id}
                                        onDownloadRecorded={null}
                                    />
                                )}
                                
                                {/* Other Documents */}
                                {otherDocs.length > 0 && (
                                    <div className={`grid gap-2 ${otherDocs.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                        {otherDocs.map((url, i) => (
                                            <AttachmentTile
                                                key={i}
                                                url={url}
                                                index={i}
                                                circularId={id}
                                                userId={profile?.id}
                                                onDownloadRecorded={null}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        style={{ 
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            background: 'rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-[28px] p-8 max-w-[420px] w-full border border-border-light/20 relative z-[10000]"
                            style={{
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 120px rgba(255, 153, 51, 0.5), 0 0 160px rgba(19, 136, 8, 0.35)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center gap-5">
                                <div className="h-16 w-16 bg-danger/10 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle className="text-danger" size={32} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-text-main tracking-tight">Delete Circular?</h3>
                                    <p className="text-text-muted text-[15px] font-medium leading-relaxed">This action is permanent and cannot be undone.</p>
                                </div>
                                <div className="flex gap-3 w-full pt-2">
                                    <button 
                                        onClick={() => setShowDeleteConfirm(false)} 
                                        className="flex-1 h-12 rounded-xl bg-surface-light border border-border-light text-text-main font-bold text-sm uppercase tracking-wide hover:bg-surface-light/80 transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDelete} 
                                        disabled={deleting} 
                                        className="flex-1 h-12 rounded-xl bg-danger text-white font-bold text-sm uppercase tracking-wide hover:bg-danger/90 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center"
                                    >
                                        {deleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                        style={{ 
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)'
                        }}
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 24 }}
                            className="bg-white dark:bg-gray-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl border border-border-light max-h-[90vh] overflow-y-auto relative z-[10000]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Edit Circular</p>
                                    <h2 className="text-xl font-black text-text-main">Update Broadcast</h2>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="p-2 text-text-dim hover:text-text-main hover:bg-surface-light rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Title</label>
                                    <input required value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} className="w-full h-12 px-5 rounded-2xl border border-border-light outline-none font-bold text-text-main text-sm focus:border-primary transition-all" placeholder="Title" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Content</label>
                                    <textarea required rows={6} value={editData.content} onChange={e => setEditData(p => ({ ...p, content: e.target.value }))} className="w-full px-5 py-4 rounded-2xl border border-border-light outline-none font-medium text-text-main text-sm resize-none focus:border-primary transition-all" placeholder="Content" />
                                </div>

                                {/* Attachment Management Section */}
                                {editData.attachments && editData.attachments.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Paperclip size={14} className="text-text-dim" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Manage Attachements ({editData.attachments.length})</span>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {editData.attachments.map((url, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-surface-light rounded-xl border border-border-light/50 group">
                                                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                                                        {isImageUrl(url) ? <FileImage size={16} className="text-primary" /> : <FileText size={16} className="text-text-dim" />}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-text-main truncate flex-1">{getFileName(url)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(i)}
                                                        className="p-1.5 rounded-lg text-text-dim hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Priority</label>
                                        <div className="flex gap-2">
                                            {['normal', 'important'].map(p => (
                                                <button key={p} type="button" onClick={() => setEditData(prev => ({ ...prev, priority: p }))} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase transition-all border ${editData.priority === p ? 'bg-primary text-white border-primary' : 'bg-bg-light text-text-muted border-border-light'}`}>{p}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Target Dept</label>
                                        <select value={editData.department_target} onChange={e => setEditData(p => ({ ...p, department_target: e.target.value }))} className="w-full h-10 px-4 rounded-xl border border-border-light outline-none text-[11px] font-bold text-text-main">
                                            {DEPTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 h-12 rounded-2xl border border-border-light text-text-muted font-black text-[11px] uppercase tracking-widest hover:bg-surface-light transition-all">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-widest hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default memo(CircularCard);
