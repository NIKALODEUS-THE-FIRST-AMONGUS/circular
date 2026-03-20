import { useState, useEffect, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { deleteDocument } from "../../lib/firebase-db";
import { useNotify } from "../../components/Toaster";
import {
  collection, query, orderBy, limit,
  onSnapshot, doc, setDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase-config";
import BottomNav from "../../components/BottomNav";
import { ThemeContext } from "../../context/ThemeContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTO_DELETE_DAYS = 90;

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:       dark ? "bg-[#0d1117]"                    : "bg-[#f4f6f9]",
  heading:    dark ? "text-white"                      : "text-gray-900",
  sub:        dark ? "text-gray-400"                   : "text-gray-500",
  muted:      dark ? "text-gray-500"                   : "text-gray-400",
  card:       dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  cardHov:    dark ? "hover:border-white/15"           : "hover:border-gray-300 hover:shadow-sm",
  divider:    dark ? "border-white/6"                  : "border-gray-100",
  input:      dark
    ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-orange-500/50"
    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400",
  iconBtn:    dark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                   : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200",
  tabActive:  dark ? "text-white border-orange-500"    : "text-gray-900 border-orange-500",
  tabInact:   dark ? "text-gray-500 border-transparent" : "text-gray-400 border-transparent",
  sLabel:     dark ? "text-gray-600"                   : "text-gray-400",
  restore:    dark ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500"
                   : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white",
  delBtn:     dark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
                   : "bg-red-50 border-red-200 text-red-600 hover:bg-red-500 hover:text-white",
  overlay:    dark ? "bg-black/70"                     : "bg-black/50",
  sheet:      dark ? "bg-[#161b22] border-white/10"    : "bg-white border-gray-200",
  drag:       dark ? "bg-white/20"                     : "bg-gray-300",
  checkOff:   dark ? "border-white/15 bg-white/5"      : "border-gray-300 bg-white",
  checkOn:    "border-orange-500 bg-orange-500",
  warningBg:  dark ? "bg-amber-500/8 border-amber-500/20"  : "bg-amber-50 border-amber-200",
  dangerBg:   dark ? "bg-red-500/8   border-red-500/20"    : "bg-red-50   border-red-200",
  settingsBg: dark ? "bg-[#161b22] border-white/8"         : "bg-white border-gray-200",
  togOn:      "bg-orange-500 border-orange-500",
  togOff:     dark ? "bg-white/10 border-white/15"         : "bg-gray-200 border-gray-300",
  logIcon:    {
    CREATE: dark ? "bg-green-500/12 text-green-400"  : "bg-green-50 text-green-600",
    UPDATE: dark ? "bg-blue-500/12  text-blue-400"   : "bg-blue-50  text-blue-600",
    DELETE: dark ? "bg-red-500/12   text-red-400"    : "bg-red-50   text-red-600",
    LOGIN:  dark ? "bg-purple-500/12 text-purple-400": "bg-purple-50 text-purple-600",
    APPROVE: dark ? "bg-green-500/12 text-green-400" : "bg-green-50 text-green-600",
    REJECT:  dark ? "bg-red-500/12  text-red-400"    : "bg-red-50   text-red-600",
    DEFAULT: dark ? "bg-white/5 text-gray-400"       : "bg-gray-100 text-gray-500",
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

const fmtDate = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
};

const fmtDateTime = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

// Days since deletion
const daysSince = (ts) => {
  try {
    return Math.floor((Date.now() - new Date(ts)) / 86400000);
  } catch { return 0; }
};

const daysRemaining = (ts) => Math.max(0, AUTO_DELETE_DAYS - daysSince(ts));

// Initials from name
const initials = (name = "") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  }),
};
const stagger = { show: { transition: { staggerChildren: 0.055 } } };

// ─── Countdown badge ──────────────────────────────────────────────────────────
const CountdownBadge = ({ deletedAt, dark }) => {
  const days = daysRemaining(deletedAt);
  const urgent = days <= 7;
  const cls = urgent
    ? dark ? "bg-red-500/15 text-red-400 border-red-500/25"    : "bg-red-50 text-red-600 border-red-200"
    : days <= 30
    ? dark ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-50 text-amber-700 border-amber-200"
    : dark ? "bg-white/8 text-gray-400 border-white/10"         : "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cls}`}>
      {urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />}
      {days === 0 ? "Deletes today" : `${days}d left`}
    </span>
  );
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────
const DeleteConfirm = ({ count, onConfirm, onCancel, dark, permanent }) => {
  const T   = tk(dark);
  const [typed, setTyped] = useState("");
  const WORD = "delete";
  const needsConfirm = permanent;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-center justify-center px-6`}
      onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm ${T.sheet} border rounded-3xl p-6 shadow-2xl`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4
          ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
          <Ic size={26}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </Ic>
        </div>
        <h3 className={`text-base font-bold text-center mb-1 ${T.heading}`}>
          {permanent ? "Permanent Delete" : `Delete ${count} item${count > 1 ? "s" : ""}?`}
        </h3>
        <p className={`text-sm text-center mb-5 ${T.muted}`}>
          {permanent
            ? "This action cannot be undone. The circular will be gone forever."
            : `${count} circular${count > 1 ? "s" : ""} will be permanently deleted.`}
        </p>

        {needsConfirm && (
          <div className="mb-4">
            <p className={`text-xs mb-1.5 ${T.muted}`}>
              Type <span className={`font-mono font-bold px-1 rounded ${dark ? "bg-white/10 text-red-400" : "bg-red-50 text-red-600"}`}>{WORD}</span> to confirm
            </p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)}
              placeholder={`Type "${WORD}"`} autoCapitalize="none" style={{ fontSize: 16 }}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${T.input}`} />
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${T.iconBtn}`}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={needsConfirm && typed !== WORD}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ dark }) => (
  <div className={`border rounded-2xl p-4 space-y-3 ${dark ? "bg-[#161b22] border-white/8" : "bg-white border-gray-200"}`}>
    <div className={`h-4 rounded-lg w-3/4 animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
    <div className={`h-3 rounded-lg w-full animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
    <div className={`h-3 rounded-lg w-1/2 animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ActivityCloudMobile = () => {
  const { profile }          = useAuth();
  const { darkMode }         = useContext(ThemeContext);
  const navigate             = useNavigate();
  const notify               = useNotify();
  const dark                 = darkMode;
  const T                    = tk(dark);

  const [tab,      setTab]      = useState("deleted");
  const [deleted,  setDeleted]  = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirm,  setConfirm]  = useState(null); // {type:'single'|'bulk'|'permanent', id?}
  const [autoDelete, setAutoDelete] = useState(true);
  const [logFilter, setLogFilter]   = useState("ALL");

  // ── Permissions ──
  useEffect(() => {
    if (profile && profile.role !== "admin" && profile.role !== "dept_admin") {
      notify("Access denied", "error");
      navigate("/dashboard");
    }
  }, [profile, navigate, notify]);

  // ── Real-time: deleted circulars ──
  useEffect(() => {
    if (!profile || tab !== "deleted") return;
    setLoading(true);
    const q = query(collection(db, "deleted_circulars"), orderBy("deleted_at", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setDeleted(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          deleted_at: data.deleted_at?.toDate?.()?.toISOString() || data.deleted_at,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        };
      }));
      setLoading(false);
    }, (err) => {
      console.error(err);
      notify("Failed to load deleted items", "error");
      setLoading(false);
    });
    return () => unsub();
  }, [profile, tab, notify]);

  // ── Real-time: audit logs ──
  useEffect(() => {
    if (!profile || tab !== "activity") return;
    setLoading(true);
    const q = query(collection(db, "audit_logs"), orderBy("created_at", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        };
      }));
      setLoading(false);
    }, (err) => {
      console.error(err);
      notify("Failed to load activity logs", "error");
      setLoading(false);
    });
    return () => unsub();
  }, [profile, tab, notify]);

  // ── Restore ──
  const handleRestore = async (id) => {
    setRestoring(id);
    try {
      const item = deleted.find((c) => c.id === id);
      if (!item) throw new Error("Not found");
      const { deleted_at: _deleted_at, deleted_by: _deleted_by, ...data } = item;
      await setDoc(doc(db, "circulars", id), { ...data, updated_at: new Date().toISOString() });
      await deleteDocument("deleted_circulars", id);
      notify("✓ Circular restored", "success");
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch (e) {
      notify("Restore failed: " + e.message, "error");
    } finally { setRestoring(null); }
  };

  // ── Permanent delete ──
  const handlePermanentDelete = async (id) => {
    try {
      await deleteDocument("deleted_circulars", id);
      notify("Permanently deleted", "success");
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch (e) {
      notify("Delete failed: " + e.message, "error");
    }
    setConfirm(null);
  };

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map((id) => deleteDocument("deleted_circulars", id)));
      notify(`${selected.size} items permanently deleted`, "success");
      setSelected(new Set());
    } catch {
      notify("Bulk delete failed", "error");
    }
    setConfirm(null);
  };

  // ── Bulk restore ──
  const handleBulkRestore = async () => {
    let success = 0;
    for (const id of selected) {
      try {
        const item = deleted.find((c) => c.id === id);
        if (!item) continue;
        const { deleted_at: _deleted_at, deleted_by: _deleted_by, ...data } = item;
        await setDoc(doc(db, "circulars", id), { ...data, updated_at: new Date().toISOString() });
        await deleteDocument("deleted_circulars", id);
        success++;
      } catch { /* ignored */ }
    }
    notify(`${success} circular${success > 1 ? "s" : ""} restored`, "success");
    setSelected(new Set());
  };

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));

  // ── Filtered lists ──
  const filtered = useMemo(() =>
    deleted.filter((c) =>
      !search.trim() ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.author_name?.toLowerCase().includes(search.toLowerCase())
    ), [deleted, search]);

  const filteredLogs = useMemo(() =>
    logs.filter((l) => logFilter === "ALL" || l.action === logFilter),
    [logs, logFilter]);

  // ── Warning counts ──
  const urgentCount = deleted.filter((c) => daysRemaining(c.deleted_at) <= 7).length;

  const LOG_ACTIONS = ["ALL", "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "LOGIN"];

  return (
    <>
      <motion.div
        initial="hidden" animate="show" variants={stagger}
        className={`min-h-screen pb-28 transition-colors duration-300 ${T.page}`}>

        <div className="px-5 pt-5 pb-4 max-w-lg mx-auto">

          {/* India strip */}
          <motion.div variants={fadeUp}
            className="h-0.5 rounded-full mb-4 opacity-50"
            style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

          {/* Header */}
          <motion.div variants={fadeUp} className="mb-5">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${dark ? "text-blue-400" : "text-blue-600"}`}>
              System Management
            </p>
            <h1 className={`text-2xl font-bold ${T.heading}`}>Activity Cloud</h1>
            <p className={`text-xs mt-0.5 ${T.sub}`}>Audit logs and deleted items</p>
          </motion.div>

          {/* Urgent warning banner */}
          <AnimatePresence>
            {urgentCount > 0 && tab === "deleted" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-start gap-3 p-3.5 border rounded-2xl mb-4 ${T.dangerBg}`}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1" />
                <div>
                  <p className={`text-xs font-bold ${dark ? "text-red-400" : "text-red-600"}`}>
                    {urgentCount} item{urgentCount > 1 ? "s" : ""} deleting within 7 days
                  </p>
                  <p className={`text-[11px] mt-0.5 ${dark ? "text-red-400/70" : "text-red-500"}`}>
                    Restore them before they're gone permanently.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <motion.div variants={fadeUp} className={`flex border-b mb-4 ${T.divider}`}>
            {[
              { id: "deleted",  label: "Deleted Items",  count: deleted.length  },
              { id: "activity", label: "Activity Log",   count: logs.length     },
              { id: "settings", label: "Settings",       count: null            },
            ].map(({ id, label, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`text-xs font-semibold pb-3 mr-5 border-b-2 transition-all ${tab === id ? T.tabActive : T.tabInact}`}>
                {label}
                {count !== null && count > 0 && (
                  <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                    ${tab === id
                      ? dark ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-600"
                      : dark ? "bg-white/8 text-gray-500" : "bg-gray-200 text-gray-500"
                    }`}>{count}</span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ══════════════════════════════════════════ */}
          {/* TAB: DELETED ITEMS                        */}
          {/* ══════════════════════════════════════════ */}
          {tab === "deleted" && (
            <motion.div initial="hidden" animate="show" variants={stagger}>

              {/* Search + select all */}
              <motion.div variants={fadeUp} className="mb-3">
                <div className={`flex items-center gap-2.5 border rounded-2xl px-4 py-3 mb-2 transition-colors ${T.card}`}>
                  <Ic size={15}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ic>
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search deleted circulars…" style={{ fontSize: 16 }}
                    className={`flex-1 bg-transparent outline-none text-sm ${dark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`} />
                  <AnimatePresence>
                    {search && (
                      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={() => setSearch("")}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${dark ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                        ×
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bulk toolbar */}
                <AnimatePresence>
                  {filtered.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2">
                      {/* Select all checkbox */}
                      <button onClick={toggleAll}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected.size === filtered.length && filtered.length > 0 ? T.checkOn : T.checkOff
                        }`}>
                        {selected.size === filtered.length && filtered.length > 0 && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                      <span className={`text-xs ${T.muted}`}>
                        {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                      </span>

                      {selected.size > 0 && (
                        <>
                          <button onClick={handleBulkRestore}
                            className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${T.restore}`}>
                            <Ic size={12}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></Ic>
                            Restore all
                          </button>
                          <button onClick={() => setConfirm({ type: "bulk" })}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${T.delBtn}`}>
                            <Ic size={12}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>
                            Delete all
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* List */}
              {loading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} dark={dark} />)}</div>
              ) : filtered.length === 0 ? (
                <motion.div variants={fadeUp}
                  className={`flex flex-col items-center py-14 border rounded-2xl ${T.card}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                    <Ic size={24}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${T.heading}`}>No deleted circulars</p>
                  <p className={`text-xs ${T.muted}`}>
                    {search ? "Try a different search" : "Deleted circulars appear here"}
                  </p>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                  <AnimatePresence>
                    {filtered.map((c, i) => {
                      const days    = daysRemaining(c.deleted_at);
                      const isUrgent = days <= 7;
                      const isSelected = selected.has(c.id);

                      return (
                        <motion.div key={c.id} variants={fadeUp} custom={i} layout
                          className={`border rounded-2xl overflow-hidden transition-all duration-200
                            ${isSelected
                              ? dark ? "border-orange-500/40 bg-orange-500/5" : "border-orange-400 bg-orange-50/30"
                              : `${T.card} ${T.cardHov}`
                            }
                            ${isUrgent && !isSelected ? dark ? "border-red-500/30" : "border-red-200" : ""}
                          `}>
                          <div className="p-4">
                            {/* Row 1: checkbox + countdown */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2.5">
                                <button onClick={() => toggleSelect(c.id)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? T.checkOn : T.checkOff}`}>
                                  {isSelected && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  )}
                                </button>
                                <CountdownBadge deletedAt={c.deleted_at} dark={dark} />
                              </div>
                              <span className={`text-[11px] shrink-0 ${T.muted}`}>{fmtDate(c.deleted_at)}</span>
                            </div>

                            {/* Title */}
                            <h3 className={`text-sm font-semibold leading-snug mb-1 ${T.heading}`}
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {c.title || "Untitled"}
                            </h3>

                            {/* Preview */}
                            {c.content && (
                              <p className={`text-xs leading-relaxed mb-3 ${T.sub}`}
                                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {c.content}
                              </p>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center`}>
                                  <span className="text-[8px] font-bold text-orange-500">
                                    {(c.author_name || "?").charAt(0)}
                                  </span>
                                </div>
                                <span className={`text-[11px] ${T.muted}`}>{c.author_name || "Unknown"}</span>
                              </div>
                              {c.department_target && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-lg ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                  {c.department_target?.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className={`flex gap-2 pt-3 border-t ${T.divider}`}>
                              <button
                                onClick={() => handleRestore(c.id)}
                                disabled={restoring === c.id}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${T.restore}`}>
                                {restoring === c.id ? (
                                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
                                ) : (
                                  <Ic size={13}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></Ic>
                                )}
                                Restore
                              </button>
                              <button
                                onClick={() => setConfirm({ type: "permanent", id: c.id })}
                                className={`px-4 flex items-center justify-center rounded-xl border text-xs font-semibold transition-all ${T.delBtn}`}>
                                <Ic size={13}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB: ACTIVITY LOG                         */}
          {/* ══════════════════════════════════════════ */}
          {tab === "activity" && (
            <motion.div initial="hidden" animate="show" variants={stagger}>

              {/* Filter chips */}
              <motion.div variants={fadeUp}
                className="flex gap-2 mb-4 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}>
                {LOG_ACTIONS.map((a) => (
                  <motion.button key={a} whileTap={{ scale: 0.93 }}
                    onClick={() => setLogFilter(a)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap
                      ${logFilter === a
                        ? "bg-orange-500 border-orange-500 text-white"
                        : dark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"
                      }`}>
                    {a}
                  </motion.button>
                ))}
              </motion.div>

              {loading ? (
                <div className="space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} dark={dark} />)}</div>
              ) : filteredLogs.length === 0 ? (
                <motion.div variants={fadeUp}
                  className={`flex flex-col items-center py-14 border rounded-2xl ${T.card}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                    <Ic size={24}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ic>
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${T.heading}`}>No activity logs</p>
                  <p className={`text-xs ${T.muted}`}>System actions will appear here</p>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
                  {filteredLogs.map((log, i) => {
                    const action    = log.action?.toUpperCase() || "DEFAULT";
                    const iconCls   = T.logIcon[action] || T.logIcon.DEFAULT;
                    const init      = initials(log.user_name || log.performed_by || "");

                    return (
                      <motion.div key={log.id} variants={fadeUp} custom={i}
                        className={`border rounded-2xl p-3.5 ${T.card}`}>
                        <div className="flex items-start gap-3">
                          {/* Action icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
                            {action === "DELETE"  ? <Ic size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>
                            : action === "CREATE" ? <Ic size={14}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ic>
                            : action === "UPDATE" ? <Ic size={14}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ic>
                            : action === "APPROVE"? <Ic size={14}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>
                            : action === "LOGIN"  ? <Ic size={14}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></Ic>
                            : <Ic size={14}><circle cx="12" cy="12" r="10"/></Ic>}
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className={`text-xs font-bold ${T.heading}`}>{action}</span>
                              <span className={`text-[10px] shrink-0 ${T.muted}`}>{fmtDateTime(log.created_at)}</span>
                            </div>
                            <p className={`text-xs leading-relaxed mb-1 ${T.sub}`}
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {typeof log.details === "string" ? log.details : JSON.stringify(log.details) || log.resource_type || "—"}
                            </p>
                            {/* User */}
                            {(log.user_name || log.performed_by) && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                  <span className="text-[7px] font-bold text-orange-500">{init}</span>
                                </div>
                                <span className={`text-[10px] ${T.muted}`}>
                                  {log.user_name || log.performed_by}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB: SETTINGS                             */}
          {/* ══════════════════════════════════════════ */}
          {tab === "settings" && (
            <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-3">

              {/* 90-day auto-delete */}
              <motion.div variants={fadeUp} className={`border rounded-2xl overflow-hidden ${T.settingsBg}`}>
                <div className={`flex items-center justify-between px-4 py-4 border-b ${T.divider}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-red-500/10" : "bg-red-50"}`}>
                      <Ic size={15}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ic>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${T.heading}`}>90-Day Auto-Delete</p>
                      <p className={`text-xs ${T.muted}`}>Auto-purge deleted items after 90 days</p>
                    </div>
                  </div>
                  <button onClick={() => setAutoDelete((p) => !p)} role="switch" aria-checked={autoDelete}
                    className={`relative rounded-full border transition-colors duration-200 shrink-0 ${autoDelete ? T.togOn : T.togOff}`}
                    style={{ width: 40, height: 22, minWidth: 40 }}>
                    <motion.span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm"
                      style={{ width: 18, height: 18 }}
                      animate={{ x: autoDelete ? 18 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  </button>
                </div>

                {autoDelete && (
                  <div className={`px-4 py-3 ${T.warningBg}`}>
                    <p className={`text-xs font-medium ${dark ? "text-amber-400" : "text-amber-700"}`}>
                      ⚠ Items deleted more than 90 days ago are permanently removed. This cannot be undone.
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Stats */}
              <motion.div variants={fadeUp} className="flex gap-3">
                {[
                  { val: deleted.length,                                          label: "In trash",      col: "text-orange-500" },
                  { val: deleted.filter((c) => daysRemaining(c.deleted_at) <= 7).length, label: "Expiring soon", col: "text-red-500"    },
                  { val: logs.length,                                             label: "Log entries",   col: "text-blue-500"   },
                ].map(({ val, label, col }) => (
                  <div key={label} className={`flex-1 border rounded-2xl p-3.5 ${T.card}`}>
                    <p className={`text-xl font-bold mb-0.5 ${col}`}>{val}</p>
                    <p className={`text-[11px] ${T.muted}`}>{label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Danger: empty trash */}
              <motion.div variants={fadeUp}
                className={`border rounded-2xl p-4 ${T.dangerBg}`}>
                <p className={`text-sm font-bold mb-0.5 text-red-500`}>Empty Trash</p>
                <p className={`text-xs mb-3 ${T.muted}`}>
                  Permanently delete all {deleted.length} item{deleted.length !== 1 ? "s" : ""} in trash. Cannot be undone.
                </p>
                <button
                  onClick={() => setConfirm({ type: "bulk-all" })}
                  disabled={deleted.length === 0}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-30">
                  <Ic size={13}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>
                  Empty Trash ({deleted.length})
                </button>
              </motion.div>
            </motion.div>
          )}

        </div>
      </motion.div>

      <BottomNav notifCount={0} />

      {/* ── Confirm modals ── */}
      <AnimatePresence>
        {confirm?.type === "permanent" && (
          <DeleteConfirm key="perm" dark={dark} count={1} permanent
            onConfirm={() => handlePermanentDelete(confirm.id)}
            onCancel={() => setConfirm(null)} />
        )}
        {confirm?.type === "bulk" && (
          <DeleteConfirm key="bulk" dark={dark} count={selected.size} permanent={false}
            onConfirm={handleBulkDelete}
            onCancel={() => setConfirm(null)} />
        )}
        {confirm?.type === "bulk-all" && (
          <DeleteConfirm key="all" dark={dark} count={deleted.length} permanent
            onConfirm={async () => {
              try {
                await Promise.all(deleted.map((c) => deleteDocument("deleted_circulars", c.id)));
                notify("Trash emptied", "success");
              } catch { notify("Failed to empty trash", "error"); }
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default ActivityCloudMobile;