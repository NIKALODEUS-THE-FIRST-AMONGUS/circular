import { useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { deleteCircular, createDocument } from '../../lib/firebase-db';
import { uploadFile } from '../../lib/storage';
import { optimizeCloudinaryUrl } from '../../lib/cloudinary';
import { useNotify } from '../../components/Toaster';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeHTML, isValidURL, sanitizeFilename } from '../../utils/sanitize';
import CircularFeatures from '../../components/CircularFeatures';
import { useCircularFeatures } from '../../hooks/useCircularFeatures';
import { ThemeContext } from '../../context/ThemeContext';

// ─── Theme ────────────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:     dark ? "bg-[#0a0b0f]"                 : "bg-[#f8fafc]",
  heading:  dark ? "text-[#f1f3f9]"               : "text-slate-900",
  sub:      dark ? "text-[#94a3b8]"               : "text-slate-700",
  muted:    dark ? "text-slate-500"               : "text-slate-400",
  card:     dark ? "bg-[#11141b] border-white/5"  : "bg-white border-slate-200",
  divider:  dark ? "border-white/6"               : "border-slate-100",
  input:    dark
    ? "bg-white/4 border-white/8 text-[#f1f3f9] placeholder-slate-600 focus:border-blue-500/50"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400",
  iconBtn:  dark ? "bg-white/5 border-white/8 text-slate-300 hover:bg-white/10"
                 : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200",
  overlay:  dark ? "bg-black/85 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm",
  sheet:    dark ? "bg-[#11141b] border-white/8"  : "bg-white border-slate-200",
  drag:     dark ? "bg-white/10"                  : "bg-slate-300",
  attach:   dark ? "bg-white/3 border-white/6 hover:bg-white/6"
                 : "bg-slate-50 border-slate-200 hover:bg-slate-100",
  priority: {
    urgent:    { bg: dark ? "bg-red-500/15 border-red-500/25"    : "bg-red-50 border-red-200",    text: dark ? "text-red-400"    : "text-red-600",    dot: "bg-red-500"    },
    important: { bg: dark ? "bg-orange-500/15 border-orange-500/25" : "bg-orange-50 border-orange-200", text: dark ? "text-orange-400" : "text-orange-600", dot: "bg-orange-500" },
    standard:  { bg: dark ? "bg-blue-500/15 border-blue-500/25"  : "bg-blue-50 border-blue-200",  text: dark ? "text-blue-400"   : "text-blue-600",   dot: "bg-blue-400"   },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, children, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const isImageURL = (url) => {
  if (!url || typeof url !== "string") return false;
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url.split("?")[0])) return true;
  // Cloudinary image upload URLs
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/") && !url.includes(".pdf")) return true;
  return false;
};

const getSafeFilename = (url) => {
  if (!url) return "file";
  try { return sanitizeFilename(decodeURIComponent(url.split("/").pop().split("?")[0])) || "file"; }
  catch { return "file"; }
};

const getFileExtension = (url) => {
  if (!url) return "FILE";
  const ext = url.split("/").pop().split("?")[0].split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
};

const fmtDate = (ts) => {
  try {
    const d = ts?.toDate?.() || new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch { return "—"; }
};

const fmtTimeAgo = (ts) => {
  try {
    const diff = Math.floor((Date.now() - (ts?.toDate?.() || new Date(ts))) / 1000);
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return "—"; }
};

// ─── Fullscreen Image/PDF viewer ──────────────────────────────────────────────
const FullscreenViewer = ({ url, onClose }) => {
  const [showUi, setShowUi] = useState(true);
  const isImg = isImageURL(url);
  const isPdf = getFileExtension(url) === "PDF" || url.includes(".pdf");

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black flex flex-col"
    >
      {/* Floating interactive UI */}
      <AnimatePresence>
        {showUi && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-50 pointer-events-none"
            style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
          >
            <button
              onClick={onClose}
              className="p-2 rounded-full backdrop-blur-md bg-black/40 hover:bg-black/60 transition pointer-events-auto shadow-lg"
            >
              <Ic size={22} className="text-white">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </Ic>
            </button>

            <button
              onClick={async () => {
                try {
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const objectUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = objectUrl;
                  a.download = getSafeFilename(url);
                  a.click();
                  URL.revokeObjectURL(objectUrl);
                } catch {
                  window.open(url, "_blank");
                }
              }}
              className="p-2 rounded-full backdrop-blur-md bg-black/40 hover:bg-black/60 transition pointer-events-auto shadow-lg"
            >
              <Ic size={20} className="text-white">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </Ic>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
      >
        {isImg ? (
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={8}
            centerOnInit
            wheel={{ step: 0.1 }}
            pinch={{ step: 5 }}
            doubleClick={{ disabled: false, mode: "toggle" }}
          >
            {() => (
              <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                <img
                  src={url}
                  alt="Attachment"
                  className="max-w-full max-h-full object-contain select-none cursor-pointer"
                  onClick={() => setShowUi((prev) => !prev)}
                />
              </TransformComponent>
            )}
          </TransformWrapper>
        ) : isPdf ? (
          <iframe src={url} className="w-full h-full border-0 absolute inset-0" title="PDF" />
        ) : (
          <div className="text-center text-white/60 flex items-center justify-center w-full h-full">
            <p className="text-sm">Preview not available</p>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
};

// ─── Attachment card ──────────────────────────────────────────────────────────
const AttachmentCard = ({ url, index, onFullscreen, circularId, userId, dark }) => {
  const T      = tk(dark);
  const isImg  = isImageURL(url);
  const isPdf  = getFileExtension(url) === "PDF" || url.includes(".pdf");
  const name   = getSafeFilename(url);
  const ext    = getFileExtension(url);

  const handleDownload = async () => {
    try {
      if (userId) {
        await createDocument("circular_downloads", {
          circular_id: circularId,
          attachment_url: url,
          user_id: userId,
        }).catch(() => {});
      }
      window.open(url, "_blank", "noreferrer");
    } catch {
      window.open(url, "_blank", "noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`border rounded-2xl overflow-hidden transition-colors ${T.attach}`}
    >
      {/* Image thumbnail */}
      {isImg && (
        <button onClick={() => onFullscreen(url)} className="block w-full relative">
          <img
            src={optimizeCloudinaryUrl(url, { width: 600, height: 300, crop: "fill", quality: "auto:good", format: "auto" })}
            alt={name}
            className="w-full h-44 object-cover"
            onError={(e) => { e.target.parentElement.style.display = "none"; }}
          />
          {/* Fullscreen hint overlay */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 hover:opacity-100 transition-opacity w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
              <Ic size={16} className="text-white"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></Ic>
            </div>
          </div>
        </button>
      )}

      {/* PDF preview hint */}
      {isPdf && (
        <button onClick={() => onFullscreen(url)}
          className={`w-full flex items-center justify-center gap-2 py-8 ${dark ? "bg-red-500/8" : "bg-red-50"}`}>
          <span className="text-3xl">📄</span>
          <div className="text-left">
            <p className={`text-xs font-bold ${dark ? "text-red-400" : "text-red-600"}`}>PDF Document</p>
            <p className={`text-[10px] ${T.muted}`}>Tap to preview</p>
          </div>
        </button>
      )}

      {/* File info row */}
      <div className={`flex items-center gap-3 px-3 py-3 ${(isImg || isPdf) ? `border-t ${T.divider}` : ""}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isImg ? "bg-blue-500/10" : isPdf ? "bg-red-500/10" : "bg-gray-500/10"}`}>
          <span className="text-lg leading-none">{isImg ? "🖼️" : isPdf ? "📄" : "📎"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${T.heading}`}>{name}</p>
          <p className={`text-[10px] ${isImg ? (dark ? "text-blue-400" : "text-blue-600") : isPdf ? (dark ? "text-red-400" : "text-red-600") : T.muted}`}>{ext}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onFullscreen(url)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${T.iconBtn}`}
            title="Fullscreen">
            <Ic size={12}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></Ic>
          </button>
          <button onClick={handleDownload}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${T.iconBtn}`}
            title="Download">
            <Ic size={12}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ic>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Delete confirm ───────────────────────────────────────────────────────────
const DeleteConfirm = ({ onConfirm, onCancel, deleting, dark }) => {
  const T = tk(dark);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] ${T.overlay} flex items-center justify-center px-6`}
      onClick={() => !deleting && onCancel()}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm ${T.sheet} border rounded-3xl p-6 text-center shadow-2xl`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
          <Ic size={26} className={dark ? "text-red-400" : "text-red-500"}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </Ic>
        </div>
        <h3 className={`text-base font-bold mb-1 ${T.heading}`}>Delete this circular?</h3>
        <p className={`text-sm mb-6 ${T.muted}`}>This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {deleting
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
              : "Delete"
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Edit sheet ───────────────────────────────────────────────────────────────
const EditSheet = ({ circular, onSave, onClose, dark }) => {
  const T = tk(dark);
  const notify = useNotify();
  const [editData,          setEditData]          = useState({
    title:       "",
    content:     "",
    attachments: [],
  });
  const [newUrl,    setNewUrl]    = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Synchronize with latest data when opened or circular changes
  useEffect(() => {
    if (circular) {
      setEditData({
        title:       circular.title       || "",
        content:     circular.content     || "",
        attachments: circular.attachments || [],
      });
    }
  }, [circular]);

  const handleSave = async () => {
    if (!editData.title.trim() || !editData.content.trim()) {
      notify("Title and content are required", "error"); return;
    }
    setSaving(true);
    try { await onSave(editData); onClose(); }
    catch (e) { notify("Save failed: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const addUrl = () => {
    const url = newUrl.trim();
    if (!url) return;
    if (!isValidURL(url)) { notify("Invalid URL", "error"); return; }
    if (editData.attachments.includes(url)) { notify("Already added", "error"); return; }
    setEditData((p) => ({ ...p, attachments: [...p.attachments, url] }));
    setNewUrl("");
  };

  const removeAttachment = (i) =>
    setEditData((p) => ({ ...p, attachments: p.attachments.filter((_, idx) => idx !== i) }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const oversized = files.filter((f) => f.size > 100 * 1024 * 1024);
    if (oversized.length) { notify("Files must be < 100MB", "error"); return; }
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { url, error } = await uploadFile(file);
        if (error || !url) throw new Error(`Upload failed: ${file.name}`);
        urls.push(url);
      }
      setEditData((p) => ({ ...p, attachments: [...p.attachments, ...urls] }));
      notify(`${files.length} file(s) uploaded`, "success");
    } catch (e) { notify(e.message, "error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] ${T.overlay} flex items-end justify-center`}
      onClick={() => !saving && onClose()}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl flex flex-col`}
        style={{ maxHeight: "92vh", paddingBottom: "max(20px,env(safe-area-inset-bottom))" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-3 shrink-0 ${T.drag}`} />

        {/* Header */}
        <div className={`flex items-center justify-between px-5 pb-4 border-b shrink-0 ${T.divider}`}>
          <p className={`text-base font-bold ${T.heading}`}>Edit Circular</p>
          <button onClick={onClose} className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            <Ic size={14}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.muted}`}>Title</label>
            <input value={editData.title} onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
              style={{ fontSize: 16 }} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none ${T.input}`} />
          </div>

          {/* Content */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.muted}`}>Content</label>
            <textarea value={editData.content} onChange={(e) => setEditData((p) => ({ ...p, content: e.target.value }))}
              rows={6} style={{ fontSize: 16 }}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none ${T.input}`} />
          </div>

          {/* Attachments */}
          <div>
            <label className={`text-[10px] font-bold uppercase tracking-wider mb-2 block ${T.muted}`}>Attachments</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${dark ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e, "image")} disabled={uploading} />
                <Ic size={13}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Ic>
                {uploading ? "Uploading…" : "Images"}
              </label>
              <label className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${dark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
                <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => handleUpload(e, "pdf")} disabled={uploading} />
                <Ic size={13}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Ic>
                {uploading ? "Uploading…" : "PDFs"}
              </label>
            </div>

            {/* URL input */}
            <div className="flex gap-2 mb-3">
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://…" style={{ fontSize: 16 }}
                className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none ${T.input}`} />
              <button onClick={addUrl}
                className={`px-4 rounded-xl border text-xs font-bold transition-colors ${dark ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-600"}`}>
                Add
              </button>
            </div>

            {/* Attachment list */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {editData.attachments.length === 0
                ? <p className={`text-xs text-center py-3 ${T.muted}`}>No attachments yet</p>
                : editData.attachments.map((url, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dark ? "bg-white/3 border-white/8" : "bg-gray-50 border-gray-200"}`}>
                    <span className="text-base">{isImageURL(url) ? "🖼️" : "📄"}</span>
                    <p className={`flex-1 text-xs truncate ${T.heading}`}>{getSafeFilename(url)}</p>
                    <button onClick={() => removeAttachment(i)} className={`w-6 h-6 rounded-lg flex items-center justify-center ${dark ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
                      <Ic size={12}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t shrink-0 flex gap-3 ${T.divider}`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20">
            {saving
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
              : "Save Changes"
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const CircularDetailMobile = () => {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const { profile, user, isStudent } = useAuth();
  const notify        = useNotify();
  const { darkMode }  = useContext(ThemeContext);
  const dark          = darkMode;
  const T             = tk(dark);

  const [circular,      setCircular]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [fullscreenUrl, setFullscreen]    = useState(null);

  const circularFeatures = useCircularFeatures(user?.uid || user?.id);

  useEffect(() => {
    if (location.state?.action === 'edit') {
      setShowEdit(true);
      // Clear state so it doesn't re-open on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch + track view
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { getCircular } = await import("../../lib/firebase-db");
        const data = await getCircular(id);
        if (!data) throw new Error("Circular not found");
        setCircular(data);

        // Track view (fire and forget)
        if (profile?.id) {
          Promise.all([
            createDocument("circular_views", {
              circular_id: id,
              viewer_id:   profile.id,
              user_name:   profile.full_name,
              user_role:   profile.role,
              department:  profile.department || profile.class_branch,
              viewed_at:   new Date().toISOString(),
            }).catch(() => {}),
            circularFeatures.markAsRead(id),
          ]).catch(() => {});

          // Local notification sync
          const key   = `read_notifications_${profile.id}`;
          const reads = JSON.parse(localStorage.getItem(key) || "[]");
          if (!reads.includes(id)) {
            reads.push(id);
            localStorage.setItem(key, JSON.stringify(reads));
            window.dispatchEvent(new CustomEvent("circularRead", { detail: { id } }));
          }
        }
      } catch (err) {
        notify(err.message, "error");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile?.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCircular(id);
      notify("Circular deleted", "success");
      navigate("/dashboard/center", { state: { refresh: true } });
    } catch (err) {
      notify("Delete failed: " + err.message, "error");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleSave = async (editData) => {
    const { updateCircular } = await import("../../lib/firebase-db");
    // Only send the fields we want to update
    const updates = {
      title:       editData.title,
      content:     editData.content,
      attachments: editData.attachments,
    };
    const updated = await updateCircular(id, updates);
    
    // Merge updates into local state, but be careful with serverTimestamp
    setCircular((p) => {
      const next = { ...p, ...updated };
      // If updated_at is a FieldValue sentinel from firebase-db, 
      // it might break some components if we don't reload.
      // For now, simple spread is okay as we mostly use created_at for UI.
      return next;
    });
    notify("Circular updated", "success");
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="flex flex-col items-center gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className={`text-sm ${T.muted}`}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!circular) return null;

  const priority  = circular.priority || "standard";
  const pMeta     = T.priority[priority] || T.priority.standard;
  const canManage = profile && (profile.id === circular.author_id || profile.role === "admin");
  const attachments = Array.isArray(circular.attachments) ? circular.attachments : [];

  return (
    <>
      <div className={`min-h-screen pb-36 transition-colors duration-300 ${T.page}`}>

        {/* ── Top Spacing ── */}
        <div className="h-14" />

        {/* ── Back Navigation ── */}
        <div className="px-4 pt-6 pb-2">
          <button 
            onClick={() => navigate(-1)} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${T.iconBtn || "bg-white/5 border-white/10 text-[#94a3b8]"}`}
          >
            <Ic size={14}><polyline points="15 18 9 12 15 6"/></Ic>
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
          </button>
        </div>

        {/* ── Actions Bar (Secondary) ── */}
        <div className={`px-4 pb-4 flex items-center justify-end gap-2 border-b transition-colors ${dark ? "border-white/5" : "border-slate-50"}`}>

          <div className="flex items-center gap-2">
            {/* Share */}
            <button onClick={() => navigator.share?.({ title: circular.title, text: circular.content, url: window.location.href }).catch(() => {})}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${T.iconBtn}`}>
              <Ic size={14}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Ic>
            </button>
            {/* Edit/delete for owners */}
            {canManage && (
              <>
                <button onClick={() => setShowEdit(true)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${T.iconBtn}`}>
                  <Ic size={14}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ic>
                </button>
                <button onClick={() => setShowDelete(true)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${dark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-500"}`}>
                  <Ic size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── HIGH PRIORITY banner ── */}
        {circular.priority === "urgent" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-xs font-bold">
            <Ic size={13} className="text-white"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>
            URGENT NOTICE — IMMEDIATE ACTION REQUIRED
          </div>
        )}
        {circular.priority === "important" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-xs font-bold">
            <Ic size={13} className="text-white"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>
            HIGH PRIORITY
          </div>
        )}

        <div className="px-4 pt-5 max-w-lg mx-auto space-y-5">

          {/* ── Badges row ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${pMeta.bg} ${pMeta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pMeta.dot}`} />
              {priority.toUpperCase()}
            </span>
            {[
              circular.department_target,
              circular.target_year !== "All" && circular.target_year,
              circular.target_section !== "All" && circular.target_section && `Sec ${circular.target_section}`,
              circular.status === "draft" && "DRAFT",
            ].filter(Boolean).map((label, idx) => (
              <span key={`${label}-${idx}`} className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${dark ? "bg-white/8 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {label?.toUpperCase?.() || label}
              </span>
            ))}
          </div>

          {/* ── Title ── */}
          <h1 className={`text-xl font-bold leading-snug ${T.heading}`}>{circular.title}</h1>

          {/* ── Author row ── */}
          <div className={`flex items-center gap-3 pb-4 border-b ${T.divider}`}>
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-orange-500">
                {(circular.author_name || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${T.heading}`}>{circular.author_name || "Unknown"}</p>
              <p className={`text-[10px] ${T.muted}`}>{fmtDate(circular.created_at)} · {fmtTimeAgo(circular.created_at)}</p>
            </div>
            {!isStudent && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Ic size={12} className={T.muted}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ic>
                <span className={`text-[11px] ${T.muted}`}>{circular.view_count || 0}</span>
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div className={`border rounded-2xl p-5 ${T.card}`}>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${T.sub}`}>
              {sanitizeHTML(circular.content || "")}
            </p>
          </div>

          {/* ── Attachments ── */}
          {attachments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Ic size={13} className={T.muted}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Ic>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${T.muted}`}>
                  {attachments.length} Attachment{attachments.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-3">
                {attachments.map((url, i) => (
                  <AttachmentCard key={i} url={url} index={i}
                    onFullscreen={setFullscreen}
                    circularId={circular.id}
                    userId={profile?.id}
                    dark={dark} />
                ))}
              </div>
            </div>
          )}

          {/* ── CircularFeatures (bookmarks, acknowledgment, etc) ── */}
          <div className={`border rounded-2xl overflow-hidden ${T.card}`}>
            <CircularFeatures circular={circular} />
          </div>

        </div>
      </div>

      {/* ── Fullscreen viewer ── */}
      <AnimatePresence>
        {fullscreenUrl && (
          <FullscreenViewer key="fs" url={fullscreenUrl} onClose={() => setFullscreen(null)} dark={dark} />
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {showDelete && (
          <DeleteConfirm key="del" dark={dark}
            onConfirm={handleDelete} onCancel={() => setShowDelete(false)} deleting={deleting} />
        )}
      </AnimatePresence>

      {/* ── Edit sheet ── */}
      <AnimatePresence>
        {showEdit && (
          <EditSheet key="edit" dark={dark} circular={circular}
            onSave={handleSave} onClose={() => setShowEdit(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default CircularDetailMobile;
