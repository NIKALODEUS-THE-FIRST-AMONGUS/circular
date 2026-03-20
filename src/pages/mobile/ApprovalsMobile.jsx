import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/firebase-config";
import {
  collection, query, onSnapshot,
  doc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { ThemeContext } from "../../context/ThemeContext";
import BottomNav from "../../components/BottomNav";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:      dark ? "bg-[#0d1117]"                    : "bg-[#f4f6f9]",
  heading:   dark ? "text-white"                      : "text-gray-900",
  sub:       dark ? "text-gray-400"                   : "text-gray-500",
  muted:     dark ? "text-gray-500"                   : "text-gray-400",
  card:      dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  cardHov:   dark ? "hover:border-white/15"           : "hover:border-gray-300 hover:shadow-sm",
  divider:   dark ? "border-white/6"                  : "border-gray-100",
  chipOff:   dark ? "bg-white/5 border-white/10 text-gray-400"
                  : "bg-gray-100 border-gray-200 text-gray-500",
  chipOn:    "bg-orange-500 border-orange-500 text-white",
  iconBtn:   dark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200",
  statBg:    dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  emptyBg:   dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  roleBadge: {
    admin:      dark ? "bg-orange-500/15 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200",
    dept_admin: dark ? "bg-purple-500/15 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-600 border-purple-200",
    teacher:    dark ? "bg-green-500/15  text-green-400  border-green-500/20"  : "bg-green-50  text-green-600  border-green-200",
    student:    dark ? "bg-blue-500/15   text-blue-400   border-blue-500/20"   : "bg-blue-50   text-blue-600   border-blue-200",
  },
  approve:   "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20",
  reject:    dark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100",
  sheet:     dark ? "bg-[#161b22] border-white/10"    : "bg-white border-gray-200",
  overlay:   dark ? "bg-black/70"                     : "bg-black/50",
  drag:      dark ? "bg-white/20"                     : "bg-gray-300",
  inputBg:   dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400",
  pageBg:    dark ? "#0d1117"                         : "#f4f6f9",
});

// ─── Ic ───────────────────────────────────────────────────────────────────────
const Ic = ({ size = 15, children, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.055, duration: 0.36, ease: [0.22, 1, 0.36, 1] },
  }),
};
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const springSheet = {
  initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" },
  transition: { type: "spring", damping: 30, stiffness: 320 },
};

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ status, dark }) => {
  const map = {
    pending:  { cls: dark ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200",  dot: "bg-amber-400",  label: "Pending"  },
    approved: { cls: dark ? "bg-green-500/15 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200",  dot: "bg-green-500",  label: "Approved" },
    rejected: { cls: dark ? "bg-red-500/15   text-red-400   border-red-500/20"   : "bg-red-50   text-red-600   border-red-200",    dot: "bg-red-500",    label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}>
      {status === 'approved' && <Ic size={10} className="text-green-500"><polyline points="20 6 9 17 4 12"/></Ic>}
      {status === 'rejected' && <Ic size={10} className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>}
      {status === 'pending' && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />}
      {s.label}
    </span>
  );
};

// ─── Reject reason sheet ──────────────────────────────────────────────────────
const RejectSheet = ({ user, onConfirm, onClose, dark }) => {
  const T = tk(dark);
  const [reason, setReason] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] ${T.overlay} flex items-end justify-center`}
      onClick={onClose}>
      <motion.div {...springSheet} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl p-5`}
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mb-5 ${T.drag}`} />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Ic size={16}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></Ic>
          </div>
          <div>
            <p className={`text-sm font-bold ${T.heading}`}>Reject Request</p>
            <p className={`text-xs ${T.muted}`}>{user?.name || "Unknown User"}</p>
          </div>
        </div>

        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.muted}`}>
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Incomplete information, duplicate request…"
          rows={3}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4
            focus:border-red-400 transition-colors ${T.inputBg}`}
          style={{ fontSize: 16 }}
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${T.iconBtn}`}>
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
            Confirm Reject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── User detail sheet ────────────────────────────────────────────────────────
const UserSheet = ({ user, onApprove, onReject, onClose, dark, processing }) => {
  const T = tk(dark);
  if (!user) return null;
  const initials = user.full_name
    ? user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const roleCls = T.roleBadge[user.role] || T.roleBadge.student;
  const roleLabel = { admin: "Admin", dept_admin: "Dept Admin", teacher: "Faculty", student: "Student" }[user.role] || user.role;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] ${T.overlay} flex items-end justify-center`}
      onClick={onClose}>
      <motion.div {...springSheet} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-4 ${T.drag}`} />

        {/* Profile */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold leading-tight truncate ${T.heading}`}>{user.full_name || "Unknown"}</p>
              <p className={`text-xs truncate mt-0.5 ${T.muted}`}>{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${roleCls}`}>{roleLabel}</span>
                <StatusPill status={user.status} dark={dark} />
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className={`border rounded-2xl divide-y ${T.card} ${dark ? "divide-white/5" : "divide-gray-100"}`}>
            {[
              { label: "Department", value: user.department || "—" },
              { label: "Year",       value: user.year_of_study || "—" },
              { label: "Section",    value: user.section || "—" },
              { label: "Joined",     value: user.created_at
                ? new Date(user.created_at?.toDate?.() || user.created_at)
                    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className={`text-xs ${T.muted}`}>{label}</span>
                <span className={`text-sm font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {user.status === "pending" && (
          <div className={`px-5 py-4 border-t ${T.divider} flex gap-3`}>
            <button onClick={() => onReject(user)} disabled={processing}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${T.reject}`}>
              <Ic size={14}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
              Reject
            </button>
            <button onClick={() => onApprove(user)} disabled={processing}
              className={`flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${T.approve}`}>
              {processing ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
              ) : (
                <Ic size={14}><polyline points="20 6 9 17 4 12"/></Ic>
              )}
              Approve Access
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Approval card ────────────────────────────────────────────────────────────
const ApprovalCard = ({ user, dark, onTap, onApprove, onReject, index }) => {
  const T        = tk(dark);
  const initials = user.full_name
    ? user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const roleCls   = T.roleBadge[user.role] || T.roleBadge.student;
  const roleLabel = { admin: "Admin", dept_admin: "Dept Admin", teacher: "Faculty", student: "Student" }[user.role] || user.role;
  const date = user.created_at
    ? new Date(user.created_at?.toDate?.() || user.created_at)
        .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "—";

  return (
    <motion.div
      variants={fadeUp} custom={index} layout
      onClick={() => onTap(user)}
      className={`border rounded-2xl p-4 cursor-pointer transition-all duration-200 ${T.card} ${T.cardHov}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/15">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-semibold leading-tight truncate ${T.heading}`}>{user.full_name || "Unknown"}</p>
            <span className={`text-[10px] shrink-0 ${T.muted}`}>{date}</span>
          </div>
          <p className={`text-xs truncate mb-2 ${T.muted}`}>{user.email}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${roleCls}`}>{roleLabel}</span>
            {user.department && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {user.department}
              </span>
            )}
            {user.year_of_study && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {user.year_of_study}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions — only for pending */}
      {user.status === "pending" && (
        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: dark ? "rgba(255,255,255,0.05)" : "#f3f4f6" }}
          onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onReject(user); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all ${T.reject}`}>
            <Ic size={12}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>
            Reject
          </button>
          <button onClick={(e) => { e.stopPropagation(); onApprove(user); }}
            className={`flex-[1.4] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${T.approve}`}>
            <Ic size={12}><polyline points="20 6 9 17 4 12"/></Ic>
            Approve
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ filter, dark }) => {
  const T = tk(dark);
  const isAllClear = filter === "pending";
  return (
    <motion.div variants={fadeUp}
      className={`flex flex-col items-center py-14 px-6 border rounded-2xl ${T.emptyBg}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4
        ${isAllClear
          ? dark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-100"
          : dark ? "bg-white/5" : "bg-gray-100"
        }`}>
        {isAllClear ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={dark ? "#22c55e" : "#16a34a"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={dark ? "#4b5563" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        )}
      </div>
      <p className={`text-sm font-bold mb-1 ${T.heading}`}>
        {isAllClear ? "All Clear!" : "Nothing here"}
      </p>
      <p className={`text-xs text-center ${T.muted}`}>
        {isAllClear
          ? "No pending identity requests in the queue."
          : filter === "approved" ? "No approved users yet."
          : "No rejected requests."}
      </p>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ dark }) => (
  <div className={`border rounded-2xl p-4 ${dark ? "bg-[#161b22] border-white/8" : "bg-white border-gray-200"}`}>
    <div className="flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl animate-pulse shrink-0 ${dark ? "bg-white/8" : "bg-gray-100"}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3.5 rounded-lg w-32 animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
        <div className={`h-3 rounded-lg w-44 animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
        <div className="flex gap-2">
          <div className={`h-5 w-16 rounded-full animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
          <div className={`h-5 w-12 rounded-full animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ApprovalsMobile = () => {
  const { user: currentUser, stats } = useAuth();
  const { theme }            = useContext(ThemeContext);
  const dark                 = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const T                    = tk(dark);

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("pending");
  const [selected,   setSelected]   = useState(null);
  const [rejectUser, setRejectUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Real-time listener for profiles
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "profiles"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error("Fetch error:", err);
      showToast("Failed to sync data", "error");
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsubscribe();
  }, []);

  // Approve
  const handleApprove = async (user) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "profiles", user.id), {
        status: "active",
        approved_by: currentUser?.uid,
        approved_at: serverTimestamp(),
      });
      // UI updates via onSnapshot
      setSelected(null);
      showToast(`✓ ${user.full_name || "User"} approved`, "success");
    } catch {
      showToast("Approval failed. Try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Reject
  const handleReject = (user) => {
    setSelected(null);
    setTimeout(() => setRejectUser(user), 150);
  };

  const confirmReject = async (reason) => {
    if (!rejectUser) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "profiles", rejectUser.id), {
        status: "rejected",
        rejected_by: currentUser?.uid,
        rejected_at: serverTimestamp(),
        rejection_reason: reason || null,
      });
      // UI updates via onSnapshot
      setRejectUser(null);
      showToast(`Rejected ${rejectUser.full_name || "user"}`, "error");
    } catch {
      showToast("Rejection failed. Try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // Filter
  const statusMap = { pending: "pending", approved: "active", rejected: "rejected" };
  const filtered  = users.filter((u) => u.status === statusMap[filter]);
  const pendingCnt  = users.filter((u) => u.status === "pending").length;
  const approvedCnt = users.filter((u) => u.status === "active").length;
  const rejectedCnt = users.filter((u) => u.status === "rejected").length;

  const FILTERS = [
    { id: "pending",  label: "Pending",  count: pendingCnt  },
    { id: "approved", label: "Approved", count: approvedCnt },
    { id: "rejected", label: "Rejected", count: rejectedCnt },
  ];

  return (
    <>
      <motion.div
        initial="hidden" animate="show" variants={stagger}
        className={`min-h-screen px-5 pt-5 pb-8 transition-colors duration-300 ${T.page}`}
      >
        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="flex items-start justify-between mb-5">
          <div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-1 ${
              dark ? "text-blue-400" : "text-blue-600"
            }`}>
              <Ic size={11}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>
              Access Control Node
            </div>
            <h1 className={`text-2xl font-bold leading-tight ${T.heading}`}>
              Identity Queue
              {pendingCnt > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="inline-flex w-2 h-2 bg-orange-500 rounded-full ml-1.5 mb-2 align-middle"
                />
              )}
            </h1>
            <p className={`text-xs ${T.sub}`}>
              {pendingCnt === 0
                ? "Queue is clear — no pending requests"
                : `${pendingCnt} request${pendingCnt > 1 ? "s" : ""} awaiting your review`}
            </p>
          </div>

          {/* Refresh indicator */}
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${T.iconBtn} ${refreshing ? "opacity-100" : "opacity-0"}`}
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            >
              <Ic size={16}>
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.49"/>
              </Ic>
            </motion.span>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        {!loading && (
          <motion.div variants={fadeUp} className="flex gap-3 mb-5">
            {[
              { val: pendingCnt,  label: "Pending",  col: "text-amber-500"  },
              { val: approvedCnt, label: "Approved", col: "text-green-500"  },
              { val: rejectedCnt, label: "Rejected", col: "text-red-500"    },
            ].map(({ val, label, col }) => (
              <div key={label} className={`flex-1 border rounded-2xl p-4 ${T.statBg}`}>
                <p className={`text-2xl font-bold mb-0.5 ${col}`}>{val}</p>
                <p className={`text-xs ${T.muted}`}>{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Filter chips ── */}
        {!loading && (
          <motion.div variants={fadeUp} className="flex gap-2 mb-4">
            {FILTERS.map(({ id, label, count }) => (
              <motion.button
                key={id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setFilter(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all
                  ${filter === id ? T.chipOn : T.chipOff}`}
              >
                {label}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === id ? "bg-white/20 text-white" : dark ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-500"
                }`}>{count}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <Skeleton key={i} dark={dark} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} dark={dark} />
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
            <motion.p variants={fadeUp}
              className={`text-[10px] font-bold tracking-[1.2px] uppercase px-1 ${T.muted}`}>
              {filter} · {filtered.length} user{filtered.length > 1 ? "s" : ""}
            </motion.p>
            <AnimatePresence>
              {filtered.map((user, i) => (
                <ApprovalCard
                  key={user.id}
                  user={user}
                  dark={dark}
                  index={i}
                  onTap={setSelected}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]
              flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl
              text-sm font-medium whitespace-nowrap
              ${dark ? "bg-[#1c2333] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
          >
            <span className={toast.type === "success" ? "text-green-500" : "text-red-400"}>
              {toast.type === "success" ? "✓" : "✕"}
            </span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User detail sheet ── */}
      <AnimatePresence>
        {selected && (
          <UserSheet
            key="user-sheet"
            user={selected}
            dark={dark}
            processing={processing}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Reject reason sheet ── */}
      <AnimatePresence>
        {rejectUser && (
          <RejectSheet
            key="reject-sheet"
            user={rejectUser}
            dark={dark}
            onConfirm={confirmReject}
            onClose={() => setRejectUser(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav notifCount={stats?.pendingApprovals || 0} />
    </>
  );
};

export default ApprovalsMobile;
