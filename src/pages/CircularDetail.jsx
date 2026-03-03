import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deleteCircular, createDocument } from '../lib/firebase-db';
import { uploadToCloudinary } from '../lib/cloudinary';
import { useNotify } from '../components/Toaster';
import {
    ChevronLeft, Calendar, User, Tag, Eye, ShieldAlert,
    Download, FileText, ExternalLink, Loader2,
    AlertCircle, Trash2, Pencil, X, File, Image as ImageIcon,
    Shield, ChevronDown, ArrowRight, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { sanitizeHTML, isValidURL, sanitizeFilename } from '../utils/sanitize';
import CircularFeatures from '../components/CircularFeatures';
import { useCircularFeatures } from '../hooks/useCircularFeatures';

// Helper to check if URL is an image
const isImageURL = (url) => {
    if (!url || typeof url !== 'string') return false;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    return imageExtensions.test(url.split('?')[0]);
};

// Helper to get safe filename
const getSafeFilename = (url) => {
    if (!url || typeof url !== 'string') return 'file';
    try {
        const filename = url.split('/').pop().split('?')[0];
        return sanitizeFilename(decodeURIComponent(filename));
    } catch {
        return 'file';
    }
};

// Helper to get file extension
const getFileExtension = (url) => {
    if (!url || typeof url !== 'string') return '';
    const filename = url.split('/').pop().split('?')[0];
    const ext = filename.split('.').pop();
    return ext ? ext.toUpperCase() : 'FILE';
};

// PDF Downloader Component
const PDFDownloader = ({ pdfUrls, circularId, userId }) => {
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-center gap-4 p-5 bg-surface-light hover:bg-bg-light border border-border-light rounded-2xl transition-all cursor-pointer"
                onClick={() => handleDownload(pdfUrls[0], 0)}
            >
                <div className="h-12 w-12 rounded-xl bg-[#fce4ec] flex items-center justify-center text-[#e53935] shrink-0">
                    <FileText size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-text-main truncate">{getSafeFilename(pdfUrls[0])}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">SECURE PDF DOCUMENT</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
                    {downloading === 0 ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
        >
            <div
                className="group flex items-center gap-4 p-5 bg-surface-light hover:bg-bg-light border border-border-light rounded-2xl transition-all cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="h-12 w-12 rounded-xl bg-[#fce4ec] flex items-center justify-center text-[#e53935] shrink-0">
                    <Shield size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-text-main">Secure PDF Documents</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">{pdfUrls.length} FILES AVAILABLE</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center text-text-muted group-hover:text-primary transition-all shrink-0">
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={18} />
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
                        className="overflow-hidden space-y-2 pl-4"
                    >
                        {pdfUrls.map((url, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group/item flex items-center gap-3 p-4 bg-bg-light hover:bg-surface-light border border-border-light/40 rounded-xl transition-all cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(url, index);
                                }}
                            >
                                <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
                                <div className="h-10 w-10 rounded-lg bg-[#fce4ec] flex items-center justify-center text-[#e53935] shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-text-main truncate">{getSafeFilename(url)}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-dim">PDF Document</p>
                                </div>
                                <div className="h-8 w-8 rounded-lg bg-surface-light group-hover/item:bg-primary group-hover/item:text-white flex items-center justify-center transition-all shrink-0">
                                    {downloading === index ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const CircularDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const notify = useNotify();
    const [circular, setCircular] = useState(null);
    const [viewCount, setViewCount] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({ title: '', content: '', attachments: [] });
    const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // Dynamic Progress - disabled since we don't show loading
    const { complete } = useSimulatedProgress(false, { slowdownPoint: 90 });

    // Circular features hook
    const circularFeatures = useCircularFeatures(profile?.id);

    useEffect(() => {
        const fetchCircular = async () => {
            try {
                // Import Firebase functions
                const { getCircular } = await import('../lib/firebase-db');
                const { getDocuments } = await import('../lib/firebase-db');
                
                // Fetch circular and view count
                const [circularData, viewCounts] = await Promise.all([
                    getCircular(id),
                    getDocuments('circular_views', {
                        where: [['circular_id', '==', id]]
                    })
                ]);

                if (!circularData) {
                    throw new Error('Circular not found');
                }
                
                setCircular(circularData);
                setEditData({ 
                    title: circularData.title || '', 
                    content: circularData.content || '',
                    attachments: circularData.attachments || []
                });

                // Set view count
                setViewCount(viewCounts.length);

                // Track view and mark as read (fire and forget - don't wait)
                if (profile?.id) {
                    Promise.all([
                        createDocument('circular_views', {
                            circular_id: id, 
                            viewer_id: profile.id,
                            viewed_at: new Date().toISOString()
                        }).catch(() => {}), // Ignore if already exists
                        circularFeatures.markAsRead(id)
                    ]).catch(err => console.error('Track view error:', err));
                }
            } catch (err) {
                notify(err.message, 'error');
                navigate('/dashboard');
            } finally {
                complete();
            }
        };

        fetchCircular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, profile, navigate, notify, complete]);

    if (!circular) return null;

    const formattedDate = new Date(circular.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    const isImportant = circular.priority === 'important';

    const canManage = profile && (profile.id === circular.author_id || profile.role === 'admin');

    const handleDelete = async () => {
        setDeleting(true);
        notify('🗑️ Deleting circular...', 'info');
        try {
            // Delete the circular
            await deleteCircular(id);

            notify('✅ Circular deleted successfully', 'success');

            // Navigate to center with refresh flag
            navigate('/dashboard/center', { state: { refresh: true } });
        } catch (err) {
            notify(`❌ Delete failed: ${err.message}`, 'error');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const nextTitle = editData.title.trim();
        const nextContent = editData.content.trim();

        if (!nextTitle || !nextContent) {
            notify('⚠️ Title and content cannot be empty', 'error');
            return;
        }

        setSaving(true);
        notify('💾 Saving changes...', 'info');
        try {
            const { updateCircular } = await import('../lib/firebase-db');
            const updatedData = await updateCircular(id, {
                title: nextTitle,
                content: nextContent,
                attachments: editData.attachments
            });
            
            setCircular({ ...circular, ...updatedData });
            notify('☁️ Circular updated', 'success');
            setShowEditModal(false);
        } catch (err) {
            notify(`❌ Update failed: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAttachment = () => {
        const url = newAttachmentUrl.trim();
        if (!url) {
            notify('⚠️ Please enter a valid URL', 'error');
            return;
        }
        if (!isValidURL(url)) {
            notify('⚠️ Please enter a valid URL format', 'error');
            return;
        }
        if (editData.attachments.includes(url)) {
            notify('⚠️ This attachment already exists', 'error');
            return;
        }
        setEditData(prev => ({
            ...prev,
            attachments: [...prev.attachments, url]
        }));
        setNewAttachmentUrl('');
        notify('✅ Attachment added', 'success');
    };

    const handleRemoveAttachment = (index) => {
        setEditData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
        notify('🗑️ Attachment removed', 'info');
    };

    const handleCopyAttachment = (url) => {
        navigator.clipboard.writeText(url).then(() => {
            notify('📋 URL copied to clipboard', 'success');
        }).catch(() => {
            notify('❌ Failed to copy URL', 'error');
        });
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validate file types
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        const invalidFiles = files.filter(f => !validTypes.includes(f.type));
        
        if (invalidFiles.length > 0) {
            notify('⚠️ Only images (JPG, PNG, GIF, WEBP) and PDFs are allowed', 'error');
            return;
        }

        // Validate file sizes (max 5MB per file)
        const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            notify('⚠️ Files must be smaller than 5MB', 'error');
            return;
        }

        setUploading(true);
        notify(`📤 Uploading ${files.length} file(s)...`, 'info');
        try {
            const uploadedUrls = [];
            
            for (const file of files) {
                const { url, error } = await uploadToCloudinary(file);
                
                if (error || !url) {
                    throw new Error(`Failed to upload ${file.name}`);
                }

                uploadedUrls.push(url);
            }

            setEditData(prev => ({
                ...prev,
                attachments: [...prev.attachments, ...uploadedUrls]
            }));

            notify(`✅ ${files.length} file(s) uploaded successfully`, 'success');
            e.target.value = ''; // Reset input
        } catch (err) {
            notify(`❌ Upload failed: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
        <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
            {/* Back Button */}
            <button 
                onClick={() => navigate('/dashboard')} 
                className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-primary transition-colors mb-6"
            >
                <ChevronLeft size={16} />
                Back to Circular Center
            </button>

            {/* Main Content - Single Column MS Teams Style */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-light dark:bg-surface-light border border-border-light rounded-2xl shadow-sm overflow-hidden"
            >
                {/* Status Header */}
                {isImportant && (
                    <div className="bg-danger text-white px-6 py-3 text-xs font-bold flex items-center gap-2">
                        <ShieldAlert size={16} />
                        HIGH PRIORITY
                    </div>
                )}

                <div className="p-6 sm:p-8 space-y-6">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="text-2xl sm:text-3xl font-bold text-text-main leading-tight">
                                {circular.title}
                            </h1>
                            {canManage && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="p-2 hover:bg-surface-light rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={18} className="text-text-muted" />
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} className="text-red-600" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                <span>{circular.author_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span>{formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tag size={16} />
                                <span>{circular.department_target}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye size={16} />
                                <span>{viewCount} views</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border-light"></div>

                    {/* Content */}
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-base leading-relaxed text-text-main whitespace-pre-wrap">
                            {sanitizeHTML(circular.content || '')}
                        </p>
                    </div>



                    {/* Attachments Group - Enhanced with Image Previews */}
                    {circular.attachments && circular.attachments.length > 0 && (() => {
                        const images = circular.attachments.filter(isImageURL);
                        const pdfs = circular.attachments.filter(url => getFileExtension(url) === 'PDF');
                        const otherDocs = circular.attachments.filter(url => !isImageURL(url) && getFileExtension(url) !== 'PDF');
                        
                        return (
                        <div className="pt-6 border-t border-border-light space-y-4">
                            <h3 className="text-sm font-semibold text-text-main">Attachments</h3>
                            
                            <div className="space-y-3">
                                {/* Images - Grid Layout with Compressed Thumbnails */}
                                {images.length > 0 && (
                                    <div className={`grid gap-3 ${
                                        images.length === 1 ? 'grid-cols-1 max-w-md' : 
                                        images.length === 2 ? 'grid-cols-2' : 
                                        images.length === 3 ? 'grid-cols-3' : 
                                        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                                    }`}>
                                        {images.map((url, idx) => {
                                            if (!isValidURL(url)) {
                                                console.warn('Invalid attachment URL:', url);
                                                return null;
                                            }

                                            const fileName = getSafeFilename(url);
                                            
                                            return (
                                                <div key={`img-${idx}`} className="group relative">
                                                    <div className="bg-surface-light border border-border-light rounded-xl overflow-hidden hover:shadow-lg transition-all aspect-square">
                                                        <img 
                                                            src={url} 
                                                            alt={`Attachment ${idx + 1}`}
                                                            className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                                                            loading="lazy"
                                                            onClick={() => window.open(url, '_blank')}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-text-muted"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="p-3 bg-white/90 dark:bg-black/90 text-text-main rounded-full shadow-lg backdrop-blur-sm">
                                                                <Maximize2 size={18} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] font-semibold text-text-muted truncate mt-1 px-1">{fileName}</p>
                                                </div>
                                            );
                                        }).filter(Boolean)}
                                    </div>
                                )}
                                
                                {/* PDF Downloader */}
                                {pdfs.length > 0 && (
                                    <PDFDownloader
                                        pdfUrls={pdfs}
                                        circularId={circular.id}
                                        userId={profile?.id}
                                    />
                                )}
                                
                                {/* Other Documents */}
                                {otherDocs.map((url, idx) => {
                                    if (!isValidURL(url)) {
                                        console.warn('Invalid attachment URL:', url);
                                        return null;
                                    }

                                    const fileName = getSafeFilename(url);
                                    const fileExt = getFileExtension(url);
                                    
                                    return (
                                        <a
                                            key={`doc-${idx}`}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-4 bg-surface-light hover:bg-bg-light border border-border-light rounded-xl group transition-all"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center text-text-muted group-hover:text-primary transition-colors border border-border-light group-hover:border-primary/20 shrink-0">
                                                <File size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-text-main truncate">{fileName}</p>
                                                        <p className="text-[10px] text-text-muted">{fileExt}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <a
                                                            href={url}
                                                            download
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 hover:bg-surface-light rounded-lg transition-all text-text-muted hover:text-primary"
                                                            title="Download"
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                                                    </div>
                                                </a>
                                            );
                                        }).filter(Boolean)}
                                    </div>
                                </div>
                                );
                            })()}

                    {/* Circular Features: Bookmarks, Comments, Acknowledgments */}
                    <div className="mt-6 pt-6 border-t border-border-light">
                        <CircularFeatures circular={circular} />
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Delete Confirmation - Full Page Blur */}
        <AnimatePresence>
            {showDeleteConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg bg-black/50"
                    onClick={() => !deleting && setShowDeleteConfirm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-bg-light dark:bg-surface-light rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-border-light"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="h-12 w-12 bg-danger/10 rounded-xl flex items-center justify-center">
                                <AlertCircle className="text-danger" size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-text-main">Delete this circular?</h3>
                                <p className="text-text-muted text-sm">
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="flex-1 h-10 rounded-lg border border-border-light text-text-muted font-semibold text-sm hover:bg-surface-light transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 h-10 rounded-lg bg-danger text-white font-semibold text-sm hover:bg-danger/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Edit Modal - Full Page Blur */}
        <AnimatePresence>
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg bg-black/50"
                    onClick={() => !saving && setShowEditModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 24 }}
                        className="bg-bg-light dark:bg-surface-light rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-border-light max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-text-main">Edit Circular</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 text-text-dim hover:text-text-main hover:bg-surface-light rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-3 sm:space-y-4">
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-xs sm:text-sm font-semibold text-text-main">Title</label>
                                <input
                                    required
                                    value={editData.title}
                                    onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border-light bg-bg-light outline-none font-medium text-text-main text-sm focus:border-primary transition-all"
                                    placeholder="Title"
                                />
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-xs sm:text-sm font-semibold text-text-main">Content</label>
                                <textarea
                                    required
                                    rows={6}
                                    value={editData.content}
                                    onChange={e => setEditData(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-border-light bg-bg-light outline-none font-medium text-text-main text-sm resize-none focus:border-primary transition-all"
                                    placeholder="Content"
                                />
                            </div>

                            {/* Attachments Section */}
                            <div className="space-y-2 sm:space-y-3">
                                <label className="text-xs sm:text-sm font-semibold text-text-main">Attachments</label>
                                
                                {/* Upload Buttons - Mobile Optimized */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary/10 text-primary font-semibold text-xs sm:text-sm hover:bg-primary/20 transition-all cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <ImageIcon size={16} />
                                        {uploading ? 'Uploading...' : 'Upload Images'}
                                    </label>
                                    
                                    <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-red-500/10 text-red-600 font-semibold text-xs sm:text-sm hover:bg-red-500/20 transition-all cursor-pointer">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <FileText size={16} />
                                        {uploading ? 'Uploading...' : 'Upload PDFs'}
                                    </label>
                                </div>

                                {/* Or Add URL */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border-light"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-2 bg-bg-light text-text-muted">or add URL</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newAttachmentUrl}
                                        onChange={e => setNewAttachmentUrl(e.target.value)}
                                        className="flex-1 h-9 sm:h-10 px-3 rounded-lg border border-border-light bg-bg-light outline-none font-medium text-text-main text-xs sm:text-sm focus:border-primary transition-all"
                                        placeholder="https://example.com/file.pdf"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAttachment}
                                        className="px-3 sm:px-4 h-9 sm:h-10 rounded-lg bg-primary/10 text-primary font-semibold text-xs sm:text-sm hover:bg-primary/20 transition-all whitespace-nowrap"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Attachments List - Mobile Optimized */}
                                {editData.attachments && editData.attachments.length > 0 && (
                                    <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                                        {editData.attachments.map((url, index) => {
                                            const isImage = isImageURL(url);
                                            const fileName = getSafeFilename(url);
                                            const fileExt = getFileExtension(url);
                                            
                                            return (
                                                <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-surface-light border border-border-light rounded-lg group">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        {isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-text-main truncate">{fileName}</p>
                                                        <p className="text-[10px] text-text-muted">{fileExt}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyAttachment(url)}
                                                            className="p-1.5 sm:p-2 hover:bg-bg-light rounded-lg transition-all text-text-muted hover:text-primary"
                                                            title="Copy URL"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAttachment(index)}
                                                            className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-text-muted hover:text-red-600"
                                                            title="Remove"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                {(!editData.attachments || editData.attachments.length === 0) && (
                                    <p className="text-xs text-text-muted italic text-center py-2">No attachments added yet</p>
                                )}
                            </div>

                            <div className="flex gap-2 sm:gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={saving}
                                    className="flex-1 h-10 rounded-lg border border-border-light text-text-muted font-semibold text-sm hover:bg-surface-light transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 h-10 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
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

export default CircularDetail;
