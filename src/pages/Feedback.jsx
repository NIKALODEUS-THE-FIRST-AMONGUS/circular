import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { getDocuments, createDocument, updateDocument, deleteDocument } from "../lib/firebase-db";
import { useNotify } from "../components/Toaster";
import { serverTimestamp } from "firebase/firestore";
import {
  checkProfanity, getProfanitySeverity,
  checkExtremeOffensive, checkAntiSemitism, sanitizeProfanity,
} from "../utils/profanityFilter";
import { ThemeContext } from "../context/ThemeContext";
import { useContext } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES = [
  { id: "bug",         label: "Bug",     emoji: "🐛", sub: "Something broken"  },
  { id: "improvement", label: "Improve", emoji: "📈", sub: "Make it better"    },
  { id: "feature",     label: "Feature", emoji: "💡", sub: "New idea"          },
  { id: "other",       label: "Other",   emoji: "💬", sub: "General"           },
];
const CATEGORIES = ["Functionality","UI/UX","Performance","Security","Notifications","Circulars","Members","Other"];
const STATUSES   = ["pending","reviewing","in_progress","resolved","rejected"];

// ─── Theme ────────────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:      dark ? "bg-black text-white"                : "bg-white text-gray-900",
  panel:     dark ? "bg-[#121212] border-white/8"      : "bg-gray-50 border-gray-200",
  card:      dark ? "bg-[#121212] border-white/10 shadow-2xl rounded-3xl" : "bg-white border-gray-200 shadow-xl rounded-3xl",
  cardHov:   dark ? "hover:border-white/20 active:scale-[0.99]" : "hover:border-gray-300 active:scale-[0.99]",
  heading:   dark ? "text-white"                       : "text-gray-900",
  sub:       dark ? "text-gray-400"                    : "text-gray-500",
  muted:     dark ? "text-gray-500"                    : "text-gray-400",
  input:     dark
    ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-red-500/60"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-red-400",
  sLabel:    dark ? "text-gray-600"                    : "text-gray-400",
  divider:   dark ? "border-white/6"                   : "border-gray-100",
  chipOff:   dark ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8"
                  : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200",
  chipOn:    "bg-red-500 border-red-500 text-white",
  overlay:   dark ? "bg-black/70"                      : "bg-black/50",
  modal:     dark ? "bg-[#121212] border-white/10"     : "bg-white border-gray-200",
  drag:      dark ? "bg-white/20"                      : "bg-gray-300",
  togOn:     "bg-red-500 border-red-500",
  togOff:    dark ? "bg-white/10 border-white/15"      : "bg-gray-200 border-gray-300",
  statusCls: {
    pending:     dark ? "bg-amber-500/12 text-amber-400 border-amber-500/20"  : "bg-amber-50 text-amber-700 border-amber-200",
    reviewing:   dark ? "bg-blue-500/12  text-blue-400  border-blue-500/20"   : "bg-blue-50  text-blue-700  border-blue-200",
    in_progress: dark ? "bg-purple-500/12 text-purple-400 border-purple-500/20": "bg-purple-50 text-purple-700 border-purple-200",
    resolved:    dark ? "bg-green-500/12 text-green-400 border-green-500/20"  : "bg-green-50 text-green-700 border-green-200",
    rejected:    dark ? "bg-red-500/12   text-red-400   border-red-500/20"    : "bg-red-50   text-red-700   border-red-200",
  },
  typeCls: {
    bug:         dark ? "bg-red-500/12   text-red-400   border-red-500/20"    : "bg-red-50   text-red-600   border-red-200",
    improvement: dark ? "bg-blue-500/12  text-blue-400  border-blue-500/20"   : "bg-blue-50  text-blue-600  border-blue-200",
    feature:     dark ? "bg-amber-500/12 text-amber-400 border-amber-500/20"  : "bg-amber-50 text-amber-600 border-amber-200",
    other:       dark ? "bg-white/8      text-gray-400  border-white/10"      : "bg-gray-100 text-gray-600  border-gray-200",
  },
  voteBtn:   dark ? "bg-white/5 border-white/10 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200",
  commentBg: dark ? "bg-white/3 border-white/6"        : "bg-gray-50 border-gray-100",
  iconBtn:   dark ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                  : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200",
  profanity: {
    low:     dark ? "bg-amber-500/10 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700",
    medium:  dark ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-700",
    high:    dark ? "bg-red-500/10 border-red-500/25 text-red-400"       : "bg-red-50 border-red-200 text-red-700",
    extreme: dark ? "bg-red-900/30 border-red-500/40 text-red-300"       : "bg-red-100 border-red-300 text-red-800",
  },
});


// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const fmtTime = (ts) => {
  try {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
};

const Toggle = ({ on, onToggle, dark }) => {
  const T = tk(dark);
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      className={`relative rounded-full border transition-colors duration-200 shrink-0 ${on ? T.togOn : T.togOff}`}
      style={{ width: 40, height: 22, minWidth: 40 }}>
      <motion.span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm"
        style={{ width: 18, height: 18 }}
        animate={{ x: on ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }} />
    </button>
  );
};

const SectionLabel = ({ children, dark }) => (
  <p className={`text-[10px] font-bold uppercase tracking-[1.3px] mb-2 ${tk(dark).sLabel}`}>{children}</p>
);

// ─── Profanity warning banner ─────────────────────────────────────────────────
const ProfanityBanner = ({ warning, dark }) => {
  if (!warning) return null;
  const T   = tk(dark);
  const cls = T.profanity[warning.severity] || T.profanity.low;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${cls}`}>
      <Ic size={14}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </Ic>
      <p className="text-xs font-semibold leading-relaxed">{warning.message}</p>
    </motion.div>
  );
};

// ─── Profanity modal ──────────────────────────────────────────────────────────
const ProfanityModal = ({ message, onClean, onEdit, onClose, dark }) => {
  const T = tk(dark);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-center justify-center p-6`}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md border rounded-3xl p-8 shadow-2xl ${T.modal}`}>
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-100"}`}>
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className={`text-lg font-bold mb-2 ${T.heading}`}>Language Warning</h3>
          <p className={`text-sm leading-relaxed ${T.muted}`}>
            {message || "Your feedback contains inappropriate language."}{" "}
            We can clean it up automatically, or you can edit it yourself.
          </p>
        </div>
        <div className="space-y-2">
          <button onClick={onClean}
            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
            Clean & Continue
          </button>
          <button onClick={onEdit}
            className={`w-full py-3 rounded-xl border text-sm font-semibold transition-colors ${T.iconBtn}`}>
            Edit My Feedback
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Comment modal ────────────────────────────────────────────────────────────
const CommentModal = ({ item, onClose, onPost, dark }) => {
  const T = tk(dark);
  const [text, setText]       = useState("");
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);
    await onPost(item.id, text.trim());
    setPosting(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-center justify-center p-6`}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl ${T.modal}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${T.divider}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
              <Ic size={16}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ic>
            </div>
            <div>
              <p className={`text-sm font-bold ${T.heading}`}>Add Comment</p>
              <p className={`text-xs truncate max-w-xs ${T.muted}`}>{item.title}</p>
            </div>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${T.iconBtn}`}>
            <Ic size={14}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Item preview */}
          <div className={`px-4 py-3 rounded-xl border ${T.commentBg}`}>
            <p className={`text-xs font-semibold leading-snug ${T.sub}`}
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {item.description}
            </p>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Write your comment…" rows={4} style={{ fontSize: 16 }}
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors ${T.input}`} />
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${T.iconBtn}`}>
              Cancel
            </button>
            <button onClick={post} disabled={!text.trim() || posting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-40">
              {posting ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
              ) : (
                <Ic size={14}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic>
              )}
              {posting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────
const DeleteModal = ({ onConfirm, onCancel, dark, deleting }) => {
  const T = tk(dark);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-center justify-center p-6`}
      onClick={onCancel}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm border rounded-3xl p-7 text-center shadow-2xl ${T.modal}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
          <Ic size={24}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
        </div>
        <h3 className={`text-base font-bold mb-1 ${T.heading}`}>Delete Feedback?</h3>
        <p className={`text-sm mb-6 ${T.muted}`}>This cannot be undone. All comments will also be deleted.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${T.iconBtn}`}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Feedback card ────────────────────────────────────────────────────────────
const FeedbackCard = ({ item, dark, isAdmin, onVote, onComment, onStatus, onDelete, index }) => {
  const T       = tk(dark);
  const typeMeta = TYPES.find((t) => t.id === item.type) || TYPES[3];
  const typeCls  = T.typeCls[item.type] || T.typeCls.other;
  const statusCls = T.statusCls[item.status] || T.statusCls.pending;
  const voteCount = item.feedback_votes?.[0]?.count || 0;
  const commentCount = item.feedback_comments?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`border p-8 transition-all duration-200 mb-6 ${T.card} ${T.cardHov}`}>
      <div className="flex items-start gap-4">

        {/* Vote button */}
        <button onClick={() => onVote(item.id)}
          className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all shrink-0 ${T.voteBtn}`}>
          <Ic size={15}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></Ic>
          <span className="text-xs font-bold">{voteCount}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: type + status + time */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeCls}`}>
              {typeMeta.emoji} {typeMeta.label.toUpperCase()}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusCls}`}>
              {item.status?.replace("_", " ")?.toUpperCase() || "PENDING"}
            </span>
            {item.has_profanity && isAdmin && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${dark ? "bg-red-500/12 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200"}`}>
                <Ic size={10}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></Ic>
                Profanity: {item.profanity_severity}
              </span>
            )}
            <span className={`ml-auto text-[11px] shrink-0 ${T.muted}`}>{fmtTime(item.created_at)}</span>
          </div>

          {/* Row 2: title */}
          <h3 className={`text-sm font-bold mb-1 leading-snug ${T.heading}`}
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.title}
          </h3>

          {/* Row 3: description */}
          <p className={`text-xs leading-relaxed mb-3 ${T.sub}`}
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.description}
          </p>

          {/* Row 4: meta */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                {(item.user_name || "?").charAt(0).toUpperCase()}
              </div>
              <span className={`text-[11px] ${T.muted}`}>
                {item.user_name || "Anonymous"}
                {isAdmin && item.is_anonymous && item.user_email && (
                  <span className={`ml-1 ${dark ? "text-blue-400" : "text-blue-500"}`}>({item.user_email})</span>
                )}
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
              {item.category}
            </span>
            {commentCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 ${dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                <Ic size={10}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ic>
                {commentCount} comment{commentCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Row 5: actions */}
          <div className={`flex items-center gap-2 pt-3 border-t flex-wrap ${T.divider}`}>
            <button onClick={() => onComment(item)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${dark ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"}`}>
              <Ic size={12}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ic>
              Comment
            </button>

            {isAdmin && (
              <>
                {/* Status chips */}
                {STATUSES.filter((s) => s !== item.status).slice(0, 2).map((s) => (
                  <button key={s} onClick={() => onStatus(item.id, s)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${T.chipOff}`}>
                    {s.replace("_", " ")}
                  </button>
                ))}
                <button onClick={() => onDelete(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ml-auto ${dark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"}`}>
                  <Ic size={12}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Comments inline */}
          {item.feedback_comments?.length > 0 && (
            <div className="mt-3 space-y-2">
              {item.feedback_comments.map((c) => (
                <div key={c.id} className={`flex items-start gap-2.5 p-3 rounded-xl border ${T.commentBg}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                    {(c.user_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${T.heading}`}>{c.user_name}</span>
                      {c.is_admin && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-600"}`}>
                          ADMIN
                        </span>
                      )}
                      <span className={`ml-auto text-[10px] ${T.muted}`}>{fmtTime(c.created_at)}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${T.sub}`}>{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Feedback ────────────────────────────────────────────────────────────
const Feedback = () => {
  const { user, profile, isAdmin }  = useAuth();
  const { darkMode }                = useContext(ThemeContext);
  const notify                      = useNotify();
  const dark = darkMode;
  const T    = tk(dark);

  // Form state
  const [type,        setType]        = useState("bug");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("Functionality");
  const [anonymous,   setAnonymous]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // Profanity
  const [profanityWarning,   setProfanityWarning]   = useState(null);
  const [showProfanityModal, setShowProfanityModal] = useState(false);

  // List
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [commentItem,    setCommentItem]    = useState(null);
  const [deleteId,       setDeleteId]       = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  // ── Live profanity check as user types ──
  useEffect(() => {
    const text = `${title} ${description}`;
    const anti = checkAntiSemitism(text);
    if (anti.found) {
      setProfanityWarning({ severity: "extreme", message: "⚠ Anti-Semitic content detected." });
      notify("⚠ Warning: Hate speech detected!", "error");
      return;
    }
    const extreme = checkExtremeOffensive(text);
    if (extreme.isExtreme) {
      setProfanityWarning({ severity: "extreme", message: "🚫 Extremely offensive content detected. This will be auto-rejected." });
      notify("🚫 Extremely offensive content detected!", "error");
      return;
    }
    const result = checkProfanity(text);
    if (result.hasProfanity) {
      const sev = getProfanitySeverity(result.matches);
      setProfanityWarning({
        severity: sev,
        message: sev === "high"
          ? "⚠ Highly offensive language detected. Please be respectful."
          : "⚠ Inappropriate language detected. Keep feedback professional.",
      });
      if (sev === "high") notify("⚠ Warning: Highly offensive language detected.", "error");
    } else {
      setProfanityWarning(null);
    }
  }, [title, description, notify]);

  // ── Fetch ──
  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { orderBy: ["created_at", "desc"] };
      const where = [];
      if (filterType   !== "all") where.push(["type",   "==", filterType]);
      if (filterStatus !== "all") where.push(["status", "==", filterStatus]);
      if (where.length) filters.where = where;

      const data = await getDocuments("feedback", filters);

      // Lazy deletion: resolved/rejected older than 24h
      const now  = Date.now();
      const dayMs = 86400000;
      const stale = data.filter((i) => (i.status === "resolved" || i.status === "rejected") && i.updated_at && now - new Date(i.updated_at).getTime() > dayMs);
      stale.forEach((i) => deleteDocument("feedback", i.id));
      const remaining = data.filter((i) => !stale.find((s) => s.id === i.id));

      const [votes, comments] = await Promise.all([
        getDocuments("feedback_votes"),
        getDocuments("feedback_comments", { orderBy: ["created_at", "asc"] }),
      ]);

      setFeedbackList(remaining.map((item) => ({
        ...item,
        feedback_votes:    [{ count: votes.filter((v) => v.feedback_id === item.id).length }],
        feedback_comments: comments.filter((c) => c.feedback_id === item.id),
        user_name:  item.is_anonymous && !isAdmin ? "Anonymous" : item.user_name,
        user_email: item.is_anonymous && !isAdmin ? null : item.user_email,
      })));
    } catch (e) {
      notify(`Failed to load feedback: ${e.message}`, "error");
    } finally { setLoading(false); }
  }, [filterType, filterStatus, isAdmin, notify]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim() || !description.trim()) { notify("Please fill in all fields", "error"); return; }
    setSubmitting(true);
    try {
      const text = `${title} ${description}`;
      if (checkAntiSemitism(text).found || checkExtremeOffensive(text).isExtreme) {
        setShowProfanityModal(true); setSubmitting(false); return;
      }
      const profResult = checkProfanity(text);
      if (profResult.hasProfanity) {
        setShowProfanityModal(true); setSubmitting(false); return;
      }
      const sev = getProfanitySeverity(profResult.matches);
      await createDocument("feedback", {
        user_id:           user.uid,
        user_name:         profile?.full_name || user.email,
        user_email:        user.email,
        type, title, description, category,
        is_anonymous:      anonymous,
        has_profanity:     profResult.hasProfanity,
        profanity_severity: sev,
        priority:          sev === "medium" ? "low" : "medium",
        status:            "pending",
      });
      notify("Feedback submitted ✓", "success");
      setTitle(""); setDescription(""); setType("bug"); setCategory("Functionality"); setAnonymous(false); setProfanityWarning(null);
      fetchFeedback();
    } catch (e) {
      notify(`Submit failed: ${e.message}`, "error");
    } finally { setSubmitting(false); }
  };

  const handleClean = () => {
    setTitle(sanitizeProfanity(title));
    setDescription(sanitizeProfanity(description));
    setShowProfanityModal(false);
  };

  const handleVote = async (id) => {
    try {
      const existing = await getDocuments("feedback_votes", { where: [["feedback_id","==",id],["user_id","==",user.uid]] });
      if (existing.length > 0) { await deleteDocument("feedback_votes", existing[0].id); notify("Vote removed", "info"); }
      else { await createDocument("feedback_votes", { feedback_id: id, user_id: user.uid }); notify("Upvoted!", "success"); }
      fetchFeedback();
    } catch (e) { notify(`Vote failed: ${e.message}`, "error"); }
  };

  const handleComment = async (feedbackId, text) => {
    try {
      await createDocument("feedback_comments", {
        feedback_id: feedbackId,
        user_id:     user.uid,
        user_name:   profile?.full_name || user.email,
        comment:     text,
        is_admin:    isAdmin,
      });
      notify("Comment posted ✓", "success");
      fetchFeedback();
    } catch (e) { notify(`Comment failed: ${e.message}`, "error"); }
  };

  const handleStatus = async (id, status) => {
    try {
      const data = { status, updated_at: serverTimestamp() };
      if (status === "resolved") { data.resolved_by = user.uid; data.resolved_at = new Date().toISOString(); }
      await updateDocument("feedback", id, data);
      notify(`Status → ${status}`, "success");
      fetchFeedback();
    } catch (e) { notify(`Status update failed: ${e.message}`, "error"); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDocument("feedback", deleteId);
      notify("Deleted ✓", "success");
      setDeleteId(null);
      fetchFeedback();
    } catch (e) { notify(`Delete failed: ${e.message}`, "error"); }
    finally { setDeleting(false); }
  };


  const canSubmit    = !submitting && profanityWarning?.severity !== "extreme";

  return (
    <>
      <div className={`min-h-screen transition-colors duration-300 ${T.page}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

          {/* India tricolor strip */}
          <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 0.5, scaleX: 1 }}
            className="h-0.5 rounded-full mb-8 origin-left"
            style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

          {/* ── Header ── */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 rounded-full bg-red-500" />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-red-400" : "text-red-500"}`}>
                Feedback Hub
              </span>
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight mb-1 ${T.heading}`}>
              Help Us Improve<span className="text-red-500">.</span>
            </h1>
            <p className={`text-sm ${T.sub}`}>Report bugs, suggest improvements, or request new features.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">

            {/* ════════════════════════════════ */}
            {/* LEFT: Submit form               */}
            {/* ════════════════════════════════ */}
            <div className={`border rounded-3xl p-8 sticky top-6 shadow-2xl ${T.panel}`}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-red-500/10" : "bg-red-50"}`}>
                  <Ic size={16}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic>
                </div>
                <h2 className={`text-base font-bold ${T.heading}`}>Submit Feedback</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <SectionLabel dark={dark}>Type</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((ft) => {
                      const sel = type === ft.id;
                      const cls = T.typeCls[ft.id] || T.typeCls.other;
                      return (
                        <button key={ft.id} type="button" onClick={() => setType(ft.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all
                            ${sel ? cls : dark ? "bg-white/3 border-white/8 hover:bg-white/6" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}>
                          <span className="text-base leading-none">{ft.emoji}</span>
                          <div>
                            <p className={`text-xs font-bold leading-tight ${sel ? "" : T.heading}`}>{ft.label}</p>
                            <p className={`text-[10px] ${sel ? "opacity-60" : T.muted}`}>{ft.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <SectionLabel dark={dark}>Category</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button key={c} type="button" onClick={() => setCategory(c)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all
                          ${category === c ? T.chipOn : T.chipOff}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <SectionLabel dark={dark}>Title</SectionLabel>
                    <span className={`text-[10px] ${title.length > 80 ? "text-red-400" : T.muted}`}>{title.length}/100</span>
                  </div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of your feedback…"
                    maxLength={100} required style={{ fontSize: 16 }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${T.input}`} />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <SectionLabel dark={dark}>Description</SectionLabel>
                    <span className={`text-[10px] ${description.length > 850 ? "text-red-400" : T.muted}`}>{description.length}/1000</span>
                  </div>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details — what happened, what you expected…"
                    rows={5} maxLength={1000} required style={{ fontSize: 16 }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors ${T.input}`} />
                </div>

                {/* Profanity warning inline */}
                <AnimatePresence>
                  {profanityWarning && <ProfanityBanner warning={profanityWarning} dark={dark} />}
                </AnimatePresence>

                {/* Anonymous toggle */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${T.card}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-purple-500/10" : "bg-purple-50"}`}>
                      <Ic size={14}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></Ic>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${T.heading}`}>Submit Anonymously</p>
                      <p className={`text-[10px] ${T.muted}`}>Your name won't be shown</p>
                    </div>
                  </div>
                  <Toggle on={anonymous} onToggle={() => setAnonymous((p) => !p)} dark={dark} />
                </div>

                {anonymous && (
                  <p className={`text-[10px] leading-relaxed flex items-start gap-1.5 ${T.muted}`}>
                    <Ic size={11}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>
                    Identity hidden from users. Admins can still see who submitted.
                  </p>
                )}

                {/* Submit */}
                <button type="submit" disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-red-500/20">
                  {submitting ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
                  ) : (
                    <Ic size={15}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic>
                  )}
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </form>
            </div>

            {/* ════════════════════════════════ */}
            {/* RIGHT: Feedback list            */}
            {/* ════════════════════════════════ */}
            <div className="space-y-5">
              {/* Filter bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Ic size={13}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Ic>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${T.muted}`}>Filter</span>
                </div>
                {/* Type filters */}
                <div className="flex gap-1.5">
                  {["all", ...TYPES.map((t) => t.id)].map((id) => (
                    <button key={id} onClick={() => setFilterType(id)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all capitalize
                        ${filterType === id ? T.chipOn : T.chipOff}`}>
                      {id === "all" ? "All" : TYPES.find((t) => t.id === id)?.label || id}
                    </button>
                  ))}
                </div>
                {/* Status filters */}
                <div className="flex gap-1.5 ml-auto">
                  {["all", ...STATUSES].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all capitalize
                        ${filterStatus === s ? T.chipOn : T.chipOff}`}>
                      {s === "all" ? "All status" : s.replace("_", " ")}
                    </button>
                  ))}
                </div>
                {(filterType !== "all" || filterStatus !== "all") && (
                  <button onClick={() => { setFilterType("all"); setFilterStatus("all"); }}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-colors ${dark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
                    <Ic size={11}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
                    Clear
                  </button>
                )}
              </div>

              {/* List */}
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`border rounded-2xl p-5 space-y-3 ${T.card}`}>
                      {[["w-24","w-16","w-16"],["w-3/4"],["w-full","w-2/3"]].map((row, j) => (
                        <div key={j} className="flex gap-2">
                          {row.map((cls, k) => (
                            <div key={k} className={`${cls} h-3 rounded-lg animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : feedbackList.length === 0 ? (
                <div className={`flex flex-col items-center py-20 border rounded-2xl ${T.card}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                    <Ic size={28}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ic>
                  </div>
                  <p className={`text-base font-bold mb-1 ${T.heading}`}>No Feedback Yet</p>
                  <p className={`text-sm ${T.muted}`}>Be the first to submit feedback and help us improve!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {feedbackList.map((item, i) => (
                    <FeedbackCard key={item.id} item={item} dark={dark} isAdmin={isAdmin}
                      index={i} onVote={handleVote}
                      onComment={(it) => setCommentItem(it)}
                      onStatus={handleStatus}
                      onDelete={(id) => setDeleteId(id)} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showProfanityModal && (
          <ProfanityModal key="prof" dark={dark}
            message={profanityWarning?.message}
            onClean={handleClean}
            onEdit={() => setShowProfanityModal(false)}
            onClose={() => setShowProfanityModal(false)} />
        )}
        {commentItem && (
          <CommentModal key="comment" dark={dark} item={commentItem}
            onClose={() => setCommentItem(null)}
            onPost={handleComment} />
        )}
        {deleteId && (
          <DeleteModal key="delete" dark={dark} deleting={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default Feedback;