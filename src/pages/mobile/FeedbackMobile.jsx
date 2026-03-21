import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../../lib/firebase-config";
import {
  collection, addDoc, getDocs, query, where,
  orderBy, serverTimestamp, doc, updateDoc,
  increment, deleteDoc
} from "firebase/firestore";
import {
  Layout, Clock, ThumbsUp, MessageCircle, MoreVertical, Trash2,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, Send, Check
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ThemeContext } from "../../context/ThemeContext";
import BottomNav from "../../components/BottomNav";
import { useNotify } from "../../components/Toaster";
import {
  checkProfanity, getProfanitySeverity,
  checkExtremeOffensive, sanitizeProfanity,
  checkAntiSemitism
} from "../../utils/profanityFilter";
import { useConfirm } from "../../components/ConfirmDialog";

// ─── Profanity filter logic replaced by centralized util ──────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────
const FEEDBACK_TYPES = [
  { id: "bug",     label: "Bug",      emoji: "🐛", sub: "Something broken",    color: "red"    },
  { id: "improve", label: "Improve",  emoji: "📈", sub: "Make it better",      color: "blue"   },
  { id: "feature", label: "Feature",  emoji: "💡", sub: "New idea",            color: "amber"  },
  { id: "other",   label: "Other",    emoji: "💬", sub: "General feedback",    color: "gray"   },
];

const CATEGORIES = ["Functionality","UI/UX","Performance","Security","Notifications","Circulars","Members","Other"];

const TYPE_META = {
  bug:     { dark: "bg-red-500/15 text-red-400 border-red-500/20",       light: "bg-red-50 text-red-600 border-red-200"       },
  improve: { dark: "bg-blue-500/15 text-blue-400 border-blue-500/20",    light: "bg-blue-50 text-blue-600 border-blue-200"    },
  feature: { dark: "bg-amber-500/15 text-amber-400 border-amber-500/20", light: "bg-amber-50 text-amber-600 border-amber-200" },
  other:   { dark: "bg-white/8 text-gray-400 border-white/10",           light: "bg-gray-100 text-gray-600 border-gray-200"   },
};

// ─── Theme ────────────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:     dark ? "bg-[#0d1117]"                    : "bg-[#f4f6f9]",
  heading:  dark ? "text-white"                      : "text-gray-900",
  sub:      dark ? "text-gray-400"                   : "text-gray-500",
  muted:    dark ? "text-gray-500"                   : "text-gray-400",
  card:     dark ? "bg-[#161b22] border-white/10 shadow-2xl rounded-3xl" : "bg-white border-gray-200 shadow-lg rounded-3xl",
  cardHov:  dark ? "hover:border-white/20 active:scale-[0.98]" : "hover:border-gray-300 active:scale-[0.98]",
  divider:  dark ? "border-white/6"                  : "border-gray-100",
  input:    dark
    ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-orange-500/50"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400",
  iconBtn:  dark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                 : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200",
  sheet:    dark ? "bg-[#161b22] border-white/10"    : "bg-white border-gray-200",
  overlay:  dark ? "bg-black/72"                     : "bg-black/50",
  drag:     dark ? "bg-white/20"                     : "bg-gray-300",
  chipOff:  dark ? "bg-white/5 border-white/10 text-gray-400"
                 : "bg-gray-100 border-gray-200 text-gray-500",
  chipOn:   "bg-orange-500 border-orange-500 text-white",
  sLabel:   dark ? "text-gray-600"                   : "text-gray-400",
  tabActive: dark ? "text-white border-b-2 border-orange-500" : "text-gray-900 border-b-2 border-orange-500",
  tabInact:  dark ? "text-gray-500"                  : "text-gray-400",
  voteBtn:   dark ? "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                  : "text-gray-400 hover:text-orange-500 hover:bg-orange-50",
  commentBg: dark ? "bg-white/3 border-white/6"      : "bg-gray-50 border-gray-100",
  pageBg:    dark ? "#0d1117"                        : "#f4f6f9",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const Toggle = ({ on, onToggle, dark }) => {
  const T = tk(dark);
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      className={`relative rounded-full border transition-colors duration-200 shrink-0
        ${on ? "bg-orange-500 border-orange-500" : dark ? "bg-white/10 border-white/15" : "bg-gray-200 border-gray-300"}`}
      style={{ width: 40, height: 22, minWidth: 40 }}>
      <motion.span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm"
        style={{ width: 18, height: 18 }}
        animate={{ x: on ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }} />
    </button>
  );
};

const fmtDate = (ts) => {
  try {
    const d = ts?.toDate?.() || new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return "—"; }
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.055, duration: 0.36, ease: [0.22, 1, 0.36, 1] } }),
};
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

// ─── Submit form (full flow) ──────────────────────────────────────────────────
const SubmitForm = ({ dark, onSubmitted, isAdmin: _isAdmin }) => {
  const T = tk(dark);
  const { profile } = useAuth(); // FIXED: useAuth instead of useContext(AuthContext)
  const notify = useNotify();

  const [step,        setStep]        = useState("form"); // form | review | success
  const [type,        setType]        = useState("bug");
  const [category,    setCategory]    = useState("Functionality");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [anonymous,   setAnonymous]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [profanityWarn, setProfanityWarn] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState(null);

  // Real-time profanity check mirroring desktop version
  useEffect(() => {
    const checkText = `${title} ${description}`;
    
    // Check for anti-Semitism (custom request)
    const anti = checkAntiSemitism(checkText);
    if (anti.found) {
      setProfanityWarning({
        severity: 'extreme',
        message: 'Warning : Anti Semitist found'
      });
      notify("Hate speech detected! Please be respectful.", "error"); 
      return;
    }

    const extreme = checkExtremeOffensive(checkText);
    if (extreme.isExtreme) {
      setProfanityWarning({
        severity: 'extreme',
        message: '🚫 Extremely offensive content detected. It will be flagged or rejected.'
      });
      notify("Extremely offensive content detected!", "error");
      return;
    }
    const regular = checkProfanity(checkText);
    if (regular.hasProfanity) {
      const severity = getProfanitySeverity(regular.matches);
      setProfanityWarning({
        severity,
        message: severity === 'high'
          ? '⚠️ Highly offensive language detected.'
          : '⚠️ Inappropriate language detected.'
      });
      if (severity === 'high') notify("Warning: Highly offensive language detected.", "error");
    } else {
      setProfanityWarning(null);
    }
  }, [title, description, notify]);

  const selectedType = FEEDBACK_TYPES.find((t) => t.id === type);
  const typeMeta     = TYPE_META[type] || TYPE_META.other;
  const typeCls      = typeMeta[dark ? "dark" : "light"];

  const validate = () => {
    if (!title.trim())       return "Please add a title";
    if (title.length > 100)  return "Title too long (max 100)";
    if (!description.trim()) return "Please add a description";
    return null;
  };

  const handleReview = () => {
    const err = validate();
    if (err) return setError(err);

    // Re-check current text against latest detection state
    const checkText = `${title} ${description}`;
    const anti = checkAntiSemitism(checkText);
    const extreme = checkExtremeOffensive(checkText);
    const regular = checkProfanity(checkText);

    if (anti.found) {
      setProfanityWarn(true);
      return;
    }

    if (extreme.isExtreme) {
      setError("🚫 Please remove offensive language to proceed.");
      return;
    }
    
    if (regular.hasProfanity) {
      setProfanityWarn(true);
      return;
    }

    setError("");
    setStep("review");
  };

  const handleProceedWithClean = () => {
    setTitle(sanitizeProfanity(title));
    setDescription(sanitizeProfanity(description));
    setProfanityWarn(false);
    setStep("review");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        type,
        category,
        title:       title.trim(),
        description: description.trim(),
        anonymous,
        user_id:     auth.currentUser?.uid,
        user_name:   anonymous ? "Anonymous" : (profile?.full_name || profile?.name || "Unknown"), // FIXED: use full_name
        user_role:   profile?.role || "student",
        votes:       0,
        status:      "open",
        created_at:  serverTimestamp(),
      });
      setStep("success");
      setTimeout(() => {
        setStep("form");
        setTitle(""); setDescription(""); setType("bug"); setCategory("Functionality"); setAnonymous(false);
        onSubmitted?.();
      }, 2200);
    } catch {
      setError("Submission failed. Try again.");
      setStep("form");
    } finally { setSubmitting(false); }
  };

  // ── Success screen ──
  if (step === "success") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-10 text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4">
          <span className="text-4xl">✓</span>
        </motion.div>
        <h3 className={`text-lg font-bold mb-1 ${T.heading}`}>Feedback Sent!</h3>
        <p className={`text-sm ${T.muted}`}>Thanks for helping us improve Suchna X Link.</p>
      </motion.div>
    );
  }

  // ── Review screen ──
  if (step === "review") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("form")}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            <Ic size={13}><polyline points="15 18 9 12 15 6"/></Ic>
          </button>
          <div>
            <p className={`text-sm font-bold ${T.heading}`}>Review & Submit</p>
            <p className={`text-xs ${T.muted}`}>Confirm before sending</p>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 space-y-3 ${T.card}`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${typeCls}`}>
              {selectedType?.emoji} {selectedType?.label?.toUpperCase()}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
              {category}
            </span>
            {anonymous && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg ${dark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                Anonymous
              </span>
            )}
          </div>
          <p className={`text-sm font-semibold ${T.heading}`}>{title}</p>
          <p className={`text-xs leading-relaxed ${T.sub}`}>{description}</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-orange-500/20">
          {submitting ? (
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
          ) : (
            <><Ic size={15}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic> Submit Feedback</>
          )}
        </button>
      </motion.div>
    );
  }

  // ── Main form ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-4">

      {/* Type selector — compact 2x2 */}
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${T.sLabel}`}>Type</p>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map((ft) => {
            const isSelected = type === ft.id;
            const cls = TYPE_META[ft.id][dark ? "dark" : "light"];
            return (
              <motion.button key={ft.id} whileTap={{ scale: 0.95 }}
                onClick={() => setType(ft.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left
                  ${isSelected ? cls : dark ? "bg-white/3 border-white/8" : "bg-gray-50 border-gray-200"}`}>
                <span className="text-base leading-none">{ft.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight truncate ${isSelected ? "" : T.heading}`}>{ft.label}</p>
                  <p className={`text-[10px] leading-tight truncate ${isSelected ? "opacity-60" : T.muted}`}>{ft.sub}</p>
                </div>
                {isSelected && (
                  <span className="ml-auto w-3.5 h-3.5 rounded-full bg-current opacity-30 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Category — wrap grid, no overflow */}
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${T.sLabel}`}>Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.93 }}
              onClick={() => setCategory(c)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all
                ${category === c ? T.chipOn : T.chipOff}`}>
              {c}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${T.sLabel}`}>Title</p>
          <span className={`text-[10px] ${title.length > 80 ? "text-orange-400" : T.muted}`}>{title.length}/100</span>
        </div>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="Brief summary of your feedback…"
          maxLength={100} style={{ fontSize: 16 }}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${T.input}`} />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${T.sLabel}`}>Description</p>
          <span className={`text-[10px] ${description.length > 850 ? "text-orange-400" : T.muted}`}>{description.length}/1000</span>
        </div>
        <textarea value={description} onChange={(e) => { setDescription(e.target.value); setError(""); }}
          placeholder="Provide details — what happened, what you expected, any steps to reproduce…"
          rows={5} maxLength={1000} style={{ fontSize: 16 }}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors ${T.input}`} />
      </div>

      {/* Anonymous toggle */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border ${T.card}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-purple-500/10" : "bg-purple-50"}`}>
            <Ic size={15}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></Ic>
          </div>
          <div>
            <p className={`text-sm font-medium ${T.heading}`}>Submit Anonymously</p>
            <p className={`text-xs ${T.muted}`}>Your name won't be shown</p>
          </div>
        </div>
        <Toggle on={anonymous} onToggle={() => setAnonymous((p) => !p)} dark={dark} />
      </div>

      {/* Real-time profanity warning indicator */}
      <AnimatePresence>
        {profanityWarning && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`p-3 rounded-xl border flex items-start gap-2.5 mb-2 overflow-hidden ${
              profanityWarning.severity === 'extreme'
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            }`}>
            <span className="shrink-0 text-sm">
              {profanityWarning.severity === 'extreme' ? "🚫" : "⚠️"}
            </span>
            <p className="text-xs font-bold leading-tight">{profanityWarning.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-red-500 font-bold mb-2">{error}</p>}

      {/* Submit → goes to review */}
      <div className="pt-2">
        <button onClick={handleReview}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20">
          <Ic size={15}><polyline points="9 18 15 12 9 6"/></Ic>
          Review & Submit
        </button>
      </div>

      {/* Profanity warning modal */}
      <AnimatePresence>
        {profanityWarn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 ${tk(dark).overlay} flex items-center justify-center px-6`}>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className={`w-full max-w-sm ${tk(dark).sheet} border rounded-3xl p-6 shadow-2xl`}>
              <div className="text-3xl text-center mb-3">⚠️</div>
              <h3 className={`text-base font-bold text-center mb-1 ${T.heading}`}>Language Warning</h3>
              <p className={`text-sm text-center mb-5 ${T.muted}`}>
                {profanityWarning?.message || "Your feedback contains inappropriate language."}
                <br />
                We'll clean it up automatically, or you can edit it.
              </p>
              <div className="space-y-2">
                <button onClick={handleProceedWithClean}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                  Clean & Continue
                </button>
                <button onClick={() => setProfanityWarn(false)}
                  className={`w-full py-3 rounded-xl border text-sm font-semibold ${T.iconBtn}`}>
                  Edit My Feedback
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Feedback card ────────────────────────────────────────────────────────────
const FeedbackCard = ({ item, dark, isAdmin: _isAdmin, onVote, onTap, index }) => {
  const T     = tk(dark);
  const tm    = TYPE_META[item.type] || TYPE_META.other;
  const typeCls = tm[dark ? "dark" : "light"];
  const ft    = FEEDBACK_TYPES.find((f) => f.id === item.type);

  const statusCls = {
    open:        dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20"   : "bg-blue-50 text-blue-600 border-blue-200",
    in_progress: dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200",
    resolved:    dark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200",
    closed:      dark ? "bg-white/8 text-gray-400 border-white/10"          : "bg-gray-100 text-gray-500 border-gray-200",
  }[item.status] || "";

  return (
    <motion.div variants={fadeUp} custom={index} layout
      className={`border p-6 cursor-pointer transition-all duration-200 mb-5 ${T.card} ${T.cardHov}`}
      onClick={() => onTap(item)}>

      {/* Row 1: type + status + time */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeCls}`}>
          {ft?.emoji} {ft?.label?.toUpperCase() || item.type?.toUpperCase()}
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusCls}`}>
          {item.status?.replace("_", " ")?.toUpperCase() || "OPEN"}
        </span>
        <span className={`ml-auto text-[11px] shrink-0 ${T.muted}`}>{fmtDate(item.created_at)}</span>
      </div>

      {/* Row 2: title */}
      <p className={`text-sm font-semibold mb-1 leading-snug ${T.heading}`}
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {item.title}
      </p>

      {/* Row 3: description preview */}
      <p className={`text-xs leading-relaxed mb-3 ${T.sub}`}
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {item.description}
      </p>

      {/* Row 4: footer */}
      <div className={`flex items-center justify-between pt-3 border-t ${T.divider}`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center`}>
            <span className="text-[8px] font-bold text-white">
              {item.anonymous ? "A" : (item.user_name?.charAt(0) || "?")}
            </span>
          </div>
          <span className={`text-[11px] ${T.muted}`}>
            {item.anonymous ? "Anonymous" : item.user_name || "Unknown"}
          </span>
          {item.category && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${dark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
              {item.category}
            </span>
          )}
        </div>

        {/* Vote button */}
        <button
          onClick={(e) => { e.stopPropagation(); onVote(item); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors ${T.voteBtn}`}>
          <Ic size={13}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></Ic>
          <span className="text-xs font-semibold">{item.votes || 0}</span>
        </button>
      </div>
    </motion.div>
  );
};

// ─── Feedback detail sheet ────────────────────────────────────────────────────
const FeedbackDetail = ({ item, onClose, dark, isAdmin, onStatusChange, onDelete }) => {
  const T  = tk(dark);
  const ft = FEEDBACK_TYPES.find((f) => f.id === item.type);
  const tm = TYPE_META[item.type] || TYPE_META.other;
  const [comment,  setComment]  = useState("");
  const [comments, setComments] = useState([]);
  const [posting,  setPosting]  = useState(false);
  const [_showDeleteConfirm, _setShowDeleteConfirm] = useState(null);
  const { profile } = useAuth(); // FIXED: useAuth instead of useContext(AuthContext)
  const confirm = useConfirm();

  useEffect(() => {
    getDocs(query(collection(db, "feedback_comments"),
      where("feedback_id", "==", item.id), orderBy("created_at", "asc")))
      .then((snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [item.id]);

  const postComment = async () => {
    if (!comment.trim()) return;
    if (checkProfanity(comment).hasProfanity) {
      return confirm({
        title: 'Respectful Communication',
        message: '⚠️ Inappropriate language detected. Please keep the feedback professional and respectful.',
        mode: 'alert',
        confirmText: 'I Understand'
      });
    }
    setPosting(true);
    try {
      const docRef = await addDoc(collection(db, "feedback_comments"), {
        feedback_id: item.id,
        user_id:     auth.currentUser?.uid,
        user_name:   profile?.full_name || profile?.name || "Unknown", // FIXED: use full_name
        user_role:   profile?.role || "student",
        content:     comment.trim(),
        created_at:  serverTimestamp(),
      });
      setComments((p) => [...p, { id: docRef.id, user_name: profile?.full_name || profile?.name, user_role: profile?.role, content: comment.trim(), created_at: new Date() }]);
      setComment("");
    } finally { setPosting(false); }
  };

  const STATUSES = ["open","in_progress","resolved","closed"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-end justify-center`}
      onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl flex flex-col`}
        style={{ maxHeight: "90vh", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-3 shrink-0 ${T.drag}`} />

        {/* Header */}
        <div className={`px-5 pb-4 border-b shrink-0 ${T.divider}`}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tm[dark ? "dark" : "light"]}`}>
              {ft?.emoji} {ft?.label?.toUpperCase()}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
              {item.category}
            </span>
            <span className={`text-[10px] ${T.muted}`}>{fmtDate(item.created_at)}</span>
          </div>
          <p className={`text-base font-bold leading-snug ${T.heading}`}>{item.title}</p>

          {/* Admin status changer */}
          {isAdmin && (
            <div className="mt-3 flex gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: "none" }}>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => onStatusChange(item.id, s)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all
                      ${item.status === s
                        ? "bg-orange-500 border-orange-500 text-white"
                        : dark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"
                      }`}>
                    {s.replace("_", " ").toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={() => onDelete(item.id)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className={`text-sm leading-relaxed ${T.sub}`}>{item.description}</p>

          {/* Submitter */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? "bg-white/3 border-white/6" : "bg-gray-50 border-gray-100"}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">
                {item.anonymous ? "A" : item.user_name?.charAt(0) || "?"}
              </span>
            </div>
            <div>
              <p className={`text-xs font-semibold ${T.heading}`}>{item.anonymous ? "Anonymous" : item.user_name}</p>
              <p className={`text-[10px] ${T.muted}`}>{item.anonymous ? "Identity hidden" : item.user_role}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Ic size={13}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/></Ic>
              <span className={`text-xs font-semibold ${T.muted}`}>{item.votes || 0} votes</span>
            </div>
          </div>

          {/* Comments */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${T.sLabel}`}>
              Comments ({comments.length})
            </p>
            {comments.length === 0 ? (
              <p className={`text-xs text-center py-4 ${T.muted}`}>No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className={`border rounded-xl p-3 ${T.commentBg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${T.heading}`}>{c.user_name || "Unknown"}</span>
                      {c.user_role === "admin" && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dark ? "bg-orange-500/15 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                          ADMIN
                        </span>
                      )}
                      <span className={`ml-auto text-[10px] ${T.muted}`}>{fmtDate(c.created_at)}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${T.sub}`}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className={`px-5 py-3 border-t shrink-0 ${T.divider}`}>
          <div className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && postComment()}
              placeholder="Add a comment…" style={{ fontSize: 16 }}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${T.input}`} />
            <button onClick={postComment} disabled={!comment.trim() || posting}
              className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0">
              <Ic size={15}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main FeedbackMobile ──────────────────────────────────────────────────────
const FeedbackMobile = () => {
  const { profile, stats } = useAuth(); // FIXED: useAuth and stats
  const confirm = useConfirm();
  const { theme }        = useContext(ThemeContext); // FIXED: theme
  const dark             = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); // FIXED: derived dark
  const T                = tk(dark);
  const isAdmin          = profile?.role === "admin" || profile?.role === "dept_admin";

  const [tab,      setTab]      = useState("submit"); // submit | feed
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("all");

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, "feedback"), orderBy("created_at", "desc"));
      } else {
        q = query(collection(db, "feedback"),
          where("user_id", "==", auth.currentUser?.uid),
          orderBy("created_at", "desc"));
      }
      const snap = await getDocs(q);
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Lazy Deletion: Remove closed/resolved tickets older than 24h
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const toDeleteIds = [];
      const remaining = raw.filter(item => {
        if ((item.status === 'resolved' || item.status === 'rejected') && item.updated_at) {
          const updated = item.updated_at.toMillis ? item.updated_at.toMillis() : new Date(item.updated_at).getTime();
          if (now - updated > dayMs) {
            toDeleteIds.push(item.id);
            return false;
          }
        }
        return true;
      });

      if (toDeleteIds.length > 0) {
        toDeleteIds.forEach(id => deleteDoc(doc(db, "feedback", id)));
      }

      setItems(remaining);
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { if (tab === "feed") fetchFeed(); }, [tab, fetchFeed]);

  const handleVote = async (item) => {
    await updateDoc(doc(db, "feedback", item.id), { votes: increment(1) });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, votes: (i.votes || 0) + 1 } : i));
  };

  const handleStatusChange = async (id, status) => {
    await updateDoc(doc(db, "feedback", id), { 
      status, 
      updated_at: serverTimestamp() 
    });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status, updated_at: { toMillis: () => Date.now() } } : i));
    if (selected?.id === id) setSelected((p) => ({ ...p, status, updated_at: { toMillis: () => Date.now() } }));
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
        title: 'Delete Feedback?',
        message: 'Are you sure you want to permanently remove this feedback? This action cannot be undone.',
        type: 'danger',
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel'
    });
    if (!ok) return;
    await deleteDoc(doc(db, "feedback", id));
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.type === filter || i.status === filter);
  }, [items, filter]);

  const FEED_FILTERS = [
    { id: "all",         label: `All (${items.length})`     },
    { id: "bug",         label: "🐛 Bugs"                   },
  ];

  return (
    <>
      <motion.div initial="hidden" animate="show" variants={stagger}
        className={`min-h-screen px-5 pt-20 pb-24 transition-colors duration-300 ${T.page}`}>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 rounded-full bg-orange-500" />
          <h1 className={`text-2xl font-black tracking-tight ${T.heading}`}>Feedback</h1>
        </div>

        {/* India tricolor strip as a purposeful accent */}
        <motion.div variants={fadeUp}
          className="h-1 w-24 rounded-full mb-6 origin-left shadow-sm"
          style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

        {/* Header */}
        <motion.div variants={fadeUp} className="mb-5">
          <h1 className={`text-2xl font-bold ${T.heading}`}>Help Us Improve</h1>
          <p className={`text-xs mt-0.5 ${T.sub}`}>Report bugs, suggest features, share feedback</p>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp}
          className={`flex border-b mb-5 ${T.divider}`}>
          {[
            { id: "submit", label: "Submit",                      badge: null         },
            { id: "feed",   label: isAdmin ? "Community" : "Mine", badge: items.length || null },
          ].map(({ id, label, badge }) => (
            <button key={id} onClick={() => { setTab(id); if (id === "feed") fetchFeed(); }}
              className={`flex items-center gap-1.5 text-sm font-semibold pb-3 mr-6 transition-all ${tab === id ? T.tabActive : T.tabInact}`}>
              {label}
              {badge !== null && badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === id
                    ? dark ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-600"
                    : dark ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-500"
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Submit tab ── */}
        {tab === "submit" && (
          <SubmitForm dark={dark} isAdmin={isAdmin}
            onSubmitted={() => { setTab("feed"); fetchFeed(); }} />
        )}

        {/* ── Feed tab ── */}
        {tab === "feed" && (
          <motion.div initial="hidden" animate="show" variants={stagger}>
            {/* Filter chips */}
            <motion.div variants={fadeUp}
              className="flex gap-2 mb-4 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}>
              {FEED_FILTERS.map(({ id, label }) => (
                <motion.button key={id} whileTap={{ scale: 0.93 }}
                  onClick={() => setFilter(id)}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap
                    ${filter === id ? T.chipOn : T.chipOff}`}>
                  {label}
                </motion.button>
              ))}
            </motion.div>

            {/* Refresh */}
            <motion.div variants={fadeUp} className="flex justify-end mb-3">
              <button onClick={fetchFeed}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${T.iconBtn}`}>
                <Ic size={12}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></Ic>
                Refresh
              </button>
            </motion.div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className={`border rounded-2xl p-4 space-y-2 ${T.card}`}>
                    {[["w-20 h-4","w-16 h-4"],["w-3/4 h-4"],["w-full h-3","w-2/3 h-3"]].map((row, j) => (
                      <div key={j} className="flex gap-2">
                        {row.map((cls, k) => (
                          <div key={k} className={`${cls} rounded-lg animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div variants={fadeUp}
                className={`flex flex-col items-center py-14 border rounded-2xl ${T.card}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                  <Ic size={24}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ic>
                </div>
                <p className={`text-sm font-semibold mb-1 ${T.heading}`}>No Feedback Yet</p>
                <p className={`text-xs text-center mb-4 ${T.muted}`}>Be the first to submit feedback!</p>
                <button onClick={() => setTab("submit")}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white">
                  Submit Feedback →
                </button>
              </motion.div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                <AnimatePresence>
                  {filtered.map((item, i) => (
                    <FeedbackCard key={item.id} item={item} dark={dark} isAdmin={isAdmin}
                      onVote={handleVote} onTap={setSelected} index={i} 
                      onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Bottom Navigation ── */}
        <BottomNav notifCount={stats?.pendingApprovals || 0} />
      </motion.div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <FeedbackDetail key="detail" item={selected} dark={dark} isAdmin={isAdmin}
            onClose={() => setSelected(null)} onStatusChange={handleStatusChange} 
            onDelete={handleDelete} />
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackMobile;
