import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/firebase-config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { ThemeContext } from "../../context/ThemeContext";
import { deleteCircular } from "../../lib/firebase-db";
import { useNotify } from "../../components/Toaster";
import { useConfirm } from "../../components/ConfirmDialog";
import BottomNav from "../../components/BottomNav";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:       dark ? "bg-black"                   : "bg-white",
  heading:    dark ? "text-white"                     : "text-gray-900",
  sub:        dark ? "text-gray-400"                  : "text-gray-500",
  card:       dark ? "bg-[#121212] border-white/8"    : "bg-white border-gray-200",
  cardHov:    dark ? "hover:border-white/15 hover:bg-[#1c2333]"
                   : "hover:border-gray-300 hover:shadow-sm",
  statBg:     dark ? "bg-[#121212] border-white/8"    : "bg-white border-gray-200",
  statNum:    dark ? "text-white"                     : "text-gray-900",
  statLbl:    dark ? "text-gray-500"                  : "text-gray-400",
  divider:    dark ? "border-white/5"                 : "border-gray-100",
  muted:      dark ? "text-gray-500"                  : "text-gray-400",
  body:       dark ? "text-gray-400"                  : "text-gray-500",
  chipOff:    dark ? "bg-white/5 border-white/10 text-gray-400"
                   : "bg-gray-100 border-gray-200 text-gray-500",
  chipOn:     "bg-orange-500 border-orange-500 text-white",
  empty:      dark ? "bg-[#121212] border-white/8"    : "bg-white border-gray-200",
  accentBar:  {
    important: "bg-orange-500",
    urgent:    "bg-orange-500",
    normal:    "bg-blue-400",
    standard:  "bg-blue-400",
  },
  badge: {
    important: dark ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                    : "bg-orange-50 text-orange-600 border-orange-200",
    urgent:    dark ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                    : "bg-orange-50 text-orange-600 border-orange-200",
    normal:    dark ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    : "bg-blue-50 text-blue-600 border-blue-200",
    standard:  dark ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    : "bg-blue-50 text-blue-600 border-blue-200",
    draft:     dark ? "bg-white/8 text-gray-400 border-white/10"
                    : "bg-gray-100 text-gray-500 border-gray-200",
  },
  actionBtn:  dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8"
                   : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  deleteBtn:  dark ? "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                   : "text-gray-400 hover:text-orange-500 hover:bg-orange-50",
});

// ─── Tiny icon helper ─────────────────────────────────────────────────────────
const Ic = ({ size = 14, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  show: { transition: { staggerChildren: 0.07 } },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ value, label, color, dark, index }) => {
  const T = tk(dark);
  return (
    <motion.div variants={fadeUp} custom={index}
      className={`flex-1 border rounded-2xl p-4 ${T.statBg}`}>
      <p className={`text-2xl font-bold mb-0.5 ${color}`}>{value}</p>
      <p className={`text-xs ${T.statLbl}`}>{label}</p>
    </motion.div>
  );
};

// ─── Filter chip ──────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick, dark }) => {
  const T = tk(dark);
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onClick}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all duration-150 whitespace-nowrap
        ${active ? T.chipOn : T.chipOff}`}>
      {label}
    </motion.button>
  );
};

// ─── Circular post card ───────────────────────────────────────────────────────
const PostCard = ({ circular, dark, onView, onEdit, onDelete, index }) => {
  const T       = tk(dark);
  const priority = circular.priority || circular.status || "normal";
  const isDraft  = circular.is_draft || circular.status === "draft";

  const date = (() => {
    try {
      const d = circular.created_at?.toDate?.() || new Date(circular.created_at);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch { return "—"; }
  })();

  const target = [
    circular.department_target !== "all" && circular.department_target !== "All"
      ? circular.department_target?.toUpperCase() : null,
    circular.target_year || null,
    circular.target_section ? `Sec ${circular.target_section.toUpperCase()}` : null,
  ].filter(Boolean).join(" · ") || "ALL";

  const accentColor = T.accentBar[priority] || T.accentBar.normal;
  const badgeCls    = isDraft
    ? T.badge.draft
    : T.badge[priority] || T.badge.normal;
  const badgeLabel  = isDraft ? "DRAFT"
    : { important: "IMPORTANT", urgent: "URGENT", normal: "NORMAL", standard: "NORMAL" }[priority] || "NORMAL";

  return (
    <motion.div
      variants={fadeUp} custom={index}
      layout
      className={`relative border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200
        ${T.card} ${T.cardHov}`}
      onClick={() => onView?.(circular)}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentColor}`} />

      <div className="pl-4 pr-4 pt-4 pb-3" style={{ paddingLeft: 18 }}>

        {/* Row 1: badge + target + date */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeCls}`}>
            {badgeLabel}
          </span>
          <span className={`text-[11px] font-medium ${T.muted}`}>
            TO: {target}
          </span>
          <span className={`ml-auto text-[11px] shrink-0 ${T.muted}`}>{date}</span>
        </div>

        {/* Row 2: title */}
        <h3 className={`text-sm font-semibold leading-snug mb-1.5 ${T.heading}`}
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {circular.title || "Untitled"}
        </h3>

        {/* Row 3: content preview */}
        {circular.content && (
          <p className={`text-xs leading-relaxed mb-0 ${T.body}`}
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {circular.content}
          </p>
        )}

        {/* Row 4: footer */}
        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${T.divider}`}>
          {/* Stats */}
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 text-[11px] ${T.muted}`}>
              <Ic><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ic>
              {circular.view_count || 0}
            </span>
            {circular.attachments?.length > 0 && (
              <span className={`flex items-center gap-1 text-[11px] ${T.muted}`}>
                <Ic><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Ic>
                {circular.attachments.length}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit?.(circular)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${T.actionBtn}`}
              aria-label="Edit">
              <Ic><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ic>
            </button>
            <button onClick={() => onDelete?.(circular)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${T.deleteBtn}`}
              aria-label="Delete">
              <Ic><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ filter, dark, onCompose }) => {
  const T = tk(dark);
  return (
    <motion.div variants={fadeUp}
      className={`flex flex-col items-center py-14 px-6 border rounded-2xl ${T.empty}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4
        ${dark ? "bg-white/5" : "bg-gray-100"}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke={dark ? "#4b5563" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className={`text-sm font-semibold mb-1 ${T.heading}`}>
        {filter === "drafts" ? "No drafts saved" : "No circulars posted yet"}
      </p>
      <p className={`text-xs text-center mb-5 ${T.muted}`}>
        {filter === "drafts"
          ? "Save a circular as draft to find it here."
          : "Your published circulars will appear here."}
      </p>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onCompose}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" style={{ display: "block" }}>
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Compose Circular
      </motion.button>
    </motion.div>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ dark }) => (
  <div className={`border rounded-2xl p-4 ${dark ? "bg-[#121212] border-white/8" : "bg-white border-gray-200"}`}>
    {[["w-20 h-4", "w-16 h-4", "w-14 h-4"], ["w-3/4 h-4"], ["w-full h-3", "w-2/3 h-3"]].map((row, i) => (
      <div key={i} className={`flex gap-2 ${i > 0 ? "mt-2.5" : ""}`}>
        {row.map((cls, j) => (
          <div key={j} className={`${cls} rounded-lg animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
        ))}
      </div>
    ))}
  </div>
);

// ─── Main MyPostsMobile ───────────────────────────────────────────────────────
const MyPostsMobile = () => {
  const { user, stats }  = useAuth();
  const { theme }       = useContext(ThemeContext);
  const { notify }       = useNotify();
  const confirm          = useConfirm();
  const navigate         = useNavigate();
  const dark             = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const T                = tk(dark);

  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all"); // all | published | drafts

  // Fetch user's circulars
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, "circulars"),
            where("author_id", "==", user.uid || user.id),
            orderBy("created_at", "desc")
          )
        );
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("MyPosts fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Filter
  const filtered = useMemo(() => {
    if (filter === "published") return posts.filter((p) => !p.is_draft && p.status !== "draft");
    if (filter === "drafts")    return posts.filter((p) => p.is_draft  || p.status === "draft");
    return posts;
  }, [posts, filter]);

  // Stats
  const totalViews   = posts.reduce((s, p) => s + (p.view_count || 0), 0);
  const publishedCnt = posts.filter((p) => !p.is_draft && p.status !== "draft").length;
  const draftCnt     = posts.filter((p) => p.is_draft  || p.status === "draft").length;

  const handleDelete = async (circular) => {
    const ok = await confirm({
      title: 'Delete Circular?',
      message: 'Are you sure you want to permanently delete this circular? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Now',
      cancelText: 'Keep it'
    });
    
    if (!ok) return;
    
    // Optimistic UI — remove immediately
    const previousPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== circular.id));
    
    try {
        await deleteCircular(circular.id);
        notify('✅ Circular deleted successfully', 'success');
    } catch (err) {
        setPosts(previousPosts);
        notify('❌ Delete failed: ' + err.message, 'error');
    }
  };

  const FILTERS = [
    { id: "all",       label: `All (${posts.length})`       },
    { id: "published", label: `Published (${publishedCnt})` },
    { id: "drafts",    label: `Drafts (${draftCnt})`        },
  ];

  return (
    <>
      <motion.div
        initial="hidden" animate="show"
        variants={stagger}
        className={`min-h-screen px-5 pt-5 pb-8 transition-colors duration-300 ${T.page}`}
      >
        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`text-2xl font-bold leading-tight ${T.heading}`}>My Circulars</h1>
              <p className={`text-xs mt-0.5 ${T.sub}`}>Manage and review your broadcasts</p>
            </div>
            {/* Compose FAB */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate("/dashboard/create")}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-orange-500/20"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" style={{ display: "block" }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New
            </motion.button>
          </div>
        </motion.div>

      {/* ── Stats row ── */}
      {!loading && posts.length > 0 && (
        <motion.div variants={fadeUp} className="flex gap-3 mb-5">
          <StatCard value={publishedCnt} label="Published"   color="text-orange-500"   dark={dark} index={0} />
          <StatCard value={draftCnt}     label="Drafts"      color="text-blue-500"  dark={dark} index={1} />
          <StatCard value={totalViews}   label="Total views" color="text-green-500" dark={dark} index={2} />
        </motion.div>
      )}

      {/* ── Filter chips ── */}
      {!loading && posts.length > 0 && (
        <motion.div variants={fadeUp} className="flex gap-2 mb-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(({ id, label }) => (
            <Chip key={id} label={label} active={filter === id}
              onClick={() => setFilter(id)} dark={dark} />
          ))}
        </motion.div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <Skeleton key={i} dark={dark} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} dark={dark} onCompose={() => navigate("/dashboard/create")} />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {/* Section label */}
          <motion.p variants={fadeUp}
            className={`text-[10px] font-bold tracking-[1.2px] uppercase px-1 ${T.muted}`}>
            {filter === "drafts" ? "Saved drafts" : filter === "published" ? "Published circulars" : "All circulars"} · {filtered.length}
          </motion.p>

          <AnimatePresence>
            {filtered.map((circular, i) => (
              <PostCard
                key={circular.id}
                circular={circular}
                dark={dark}
                index={i}
                onView={(c) => navigate(`/dashboard/center/${c.id}`)}
                onEdit={(c) => navigate(`/dashboard/create?edit=${c.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Bottom Navigation ── */}
      <BottomNav notifCount={stats?.waitlist || 0} />
    </motion.div>
    </>
  );
};

export default MyPostsMobile;
