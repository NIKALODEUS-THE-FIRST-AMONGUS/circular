import { useState, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase-config";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../context/ThemeContext";

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  drop:       dark ? "bg-[#0a0b0f] border-white/8 shadow-2xl shadow-black/80 backdrop-blur-xl"
                   : "bg-white border-slate-200 shadow-xl",
  sheet:      dark ? "bg-[#0a0b0f] border-white/10 backdrop-blur-xl" : "bg-white border-slate-200",
  overlay:    dark ? "bg-black/80 backdrop-blur-sm"  : "bg-black/40 backdrop-blur-sm",
  drag:       dark ? "bg-white/15"                  : "bg-slate-300",
  header:     dark ? "border-white/8"               : "border-slate-100",
  heading:    dark ? "text-[#f1f3f9]"               : "text-slate-900",
  muted:      dark ? "text-[#94a3b8]"               : "text-slate-400",
  sub:        dark ? "text-slate-400"               : "text-slate-500",
  divider:    dark ? "divide-white/8"               : "divide-slate-100",
  tabActive:  dark ? "text-[#f1f3f9] border-blue-500" : "text-slate-900 border-orange-500",
  tabInact:   dark ? "text-slate-500 border-transparent" : "text-slate-400 border-transparent",
  unreadBg:   dark ? "bg-blue-500/5"                : "bg-orange-50/60",
  rowHov:     dark ? "hover:bg-white/5"             : "hover:bg-slate-50",
  sectionLbl: dark ? "text-slate-600"               : "text-slate-400",
  emptyIcon:  dark ? "bg-white/5 border-white/8"    : "bg-slate-100 border-slate-200",
  footer:     dark ? "bg-black/40 border-white/8"   : "bg-slate-50 border-slate-100",
  footerBtn:  dark ? "text-slate-400 hover:text-[#f1f3f9] hover:bg-white/8"
                   : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
  markAll:    dark ? "text-blue-400"                : "text-orange-500",
  roleBadge:  dark ? "bg-white/8 text-slate-500"    : "bg-slate-100 text-slate-400",
  hintBox:    dark ? "bg-blue-500/10 border-blue-500/20 text-blue-400/80"
                   : "bg-blue-50 border-blue-100 text-blue-500",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 15, children, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const fmtTime = (ts) => {
  try {
    const diff = Math.floor((Date.now() - (ts?.toDate?.() || new Date(ts))) / 1000);
    if (diff < 60)     return "just now";
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return (ts?.toDate?.() || new Date(ts)).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
};

const passesRoleFilter = (circular, profile) => {
  if (!profile) return false;
  if (circular.status === "draft") return false;

  const { role, department, year_of_study, section } = profile;

  if (role === "admin") return true;

  if (role === "dept_admin") {
    return (
      circular.department_target === "ALL" ||
      circular.department_target === department ||
      circular.author_role === "admin"
    );
  }

  if (role === "teacher") {
    const fromAdmin = circular.author_role === "admin" || circular.author_role === "dept_admin";
    const toAll     = circular.department_target === "ALL";
    return fromAdmin || toAll;
  }

  const deptOk    = circular.department_target === "ALL" || circular.department_target === department;
  const yearOk    = !circular.target_year    || circular.target_year    === "All" || circular.target_year    === year_of_study;
  const sectionOk = !circular.target_section || circular.target_section === "All" || circular.target_section === section;
  return deptOk && yearOk && sectionOk;
};

const ROLE_LABEL = { student: "STUDENT", teacher: "FACULTY", dept_admin: "DEPT ADMIN", admin: "ADMIN" };
const ROLE_HINT = {
  student:    "Circulars for your dept · year · section",
  teacher:    "Updates from Admin & Dept Admin",
  dept_admin: "Your department + all admin posts",
  admin:      "All institutional updates & reports",
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotifRow = ({ notif, dark, onClick }) => {
  const T = tk(dark);
  const isApproval  = notif._type === "approval";
  const isUrgent    = notif.priority === "urgent";
  const isImportant = notif.priority === "important";

  // Unused color variable removed

  const iconBgCls = isApproval
    ? dark ? "bg-green-500/12 border-green-500/20" : "bg-green-50 border-green-200"
    : (isUrgent || isImportant)
    ? dark ? "bg-red-500/12 border-red-500/20" : "bg-red-50 border-red-200"
    : dark ? "bg-orange-500/12 border-orange-500/20" : "bg-orange-50 border-orange-200";

  const typeLabel = isApproval ? "Approval" : isUrgent ? "Urgent" : isImportant ? "Important" : "Circular";
  const labelCls = isApproval ? "text-green-500" : (isUrgent || isImportant) ? "text-red-500" : "text-orange-500";

  return (
    <button onClick={() => onClick(notif)}
      className={`relative w-full flex items-start gap-4 px-5 py-4 text-left transition-all ${!notif.isRead ? T.unreadBg : ""} ${T.rowHov} active:scale-[0.98]`}>
      {!notif.isRead && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-orange-500" />}

      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBgCls}`}>
        {isApproval ? (
          <Ic size={16}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>
        ) : (isUrgent || isImportant) ? (
          <Ic size={16}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>
        ) : (
          <Ic size={16}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Ic>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${labelCls}`}>{typeLabel}</span>
          <span className={`text-[10px] shrink-0 font-medium ${T.muted}`}>{fmtTime(notif.created_at)}</span>
        </div>
        <p className={`text-sm font-bold leading-tight mb-0.5 truncate ${!notif.isRead ? T.heading : T.sub}`}>
          {notif.title}
        </p>
        <p className={`text-xs truncate font-medium ${T.muted}`}>
          {notif.author_name || "SxL System"} · {notif.department_target === "ALL" ? "All Targets" : notif.department_target || "Global"}
        </p>
      </div>

      {!notif.isRead && <span className="w-2 h-2 rounded-full shrink-0 mt-2 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />}
    </button>
  );
};

// ─── Inner Panel ──────────────────────────────────────────────────────────────
const Panel = ({ dark, role, notifs, unreadCount, onMarkAll, onItem, onLogs, maxH }) => {
  const T = tk(dark);
  const [tab, setTab] = useState("all");

  const tabs = role === "student"
    ? [{ id: "all", label: "Updates" }]
    : [
        { id: "all", label: "All" },
        { id: "circulars", label: "Circulars" },
        { id: "approvals", label: "Approvals" }
      ];

  const filtered = notifs.filter((n) => {
    if (tab === "circulars") return n._type === "circular";
    if (tab === "approvals") return n._type === "approval";
    return true;
  });

  const unread = filtered.filter(n => !n.isRead);
  const read = filtered.filter(n => n.isRead);

  // Sorting helper
  const sortByDate = (arr) => [...arr].sort((a,b) => {
    const tA = a.created_at?.toDate?.()?.getTime() || new Date(a.created_at).getTime() || 0;
    const tB = b.created_at?.toDate?.()?.getTime() || new Date(b.created_at).getTime() || 0;
    return tB - tA;
  });

  const sortedUnread = sortByDate(unread);
  const sortedRead = sortByDate(read);

  return (
    <>
      {/* Header */}
      <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${T.header}`}>
        <div className="flex items-center gap-2">
          <p className={`text-base font-bold ${T.heading}`}>Notifications</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white animate-pulse">
              {unreadCount} new
            </span>
          )}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${T.roleBadge}`}>
            {ROLE_LABEL[role] || role.toUpperCase()}
          </span>
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAll} className={`text-xs font-bold ${T.markAll} hover:opacity-80 transition-opacity`}>
            Mark all read
          </button>
        )}
      </div>

      {/* Role Hint */}
      <div className={`mx-4 mt-3 mb-1 px-3 py-2 rounded-xl border text-[10px] font-bold tracking-tight uppercase shrink-0 ${T.hintBox}`}>
        {ROLE_HINT[role] || "Recent updates"}
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className={`flex border-b px-5 pt-2 shrink-0 ${T.header}`}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-xs font-bold pb-3 mr-5 border-b-2 transition-all ${tab === t.id ? T.tabActive : T.tabInact}`}>
              {t.label}
              {filtered.filter(n => {
                if (t.id === "all") return true;
                if (t.id === "circulars") return n._type === "circular";
                if (t.id === "approvals") return n._type === "approval";
                return false;
              }).length > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t.id ? (dark ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600") : T.roleBadge}`}>
                  {filtered.filter(n => {
                    if (t.id === "all") return true;
                    if (t.id === "circulars") return n._type === "circular";
                    if (t.id === "approvals") return n._type === "approval";
                    return false;
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className={`overflow-y-auto ${maxH}`} style={{ overscrollBehavior: "contain" }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className={`w-14 h-14 rounded-3xl border mx-auto flex items-center justify-center mb-4 ${T.emptyIcon}`}>
              <Ic size={24} className={dark ? "text-white/10" : "text-gray-200"}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ic>
            </div>
            <p className={`text-sm font-bold ${T.heading}`}>All caught up!</p>
            <p className={`text-xs ${T.muted}`}>{ROLE_HINT[role]}</p>
          </div>
        ) : (
          <>
            {sortedUnread.length > 0 && (
              <>
                <p className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 ${T.sectionLbl}`}>Newest</p>
                <div className={`divide-y ${T.divider}`}>
                  {sortedUnread.map((n) => <NotifRow key={n.id} notif={n} dark={dark} onClick={onItem} />)}
                </div>
              </>
            )}
            {sortedRead.length > 0 && (
              <>
                <p className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 ${T.sectionLbl}`}>Earlier</p>
                <div className={`divide-y ${T.divider}`}>
                  {sortedRead.map((n) => <NotifRow key={n.id} notif={n} dark={dark} onClick={onItem} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t shrink-0 ${T.footer}`}>
        <button onClick={onLogs}
          className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all ${T.footerBtn} shadow-sm`}>
          <div className="flex items-center gap-2">
            <Ic size={14}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ic>
            Audit History
          </div>
          <Ic size={14}><polyline points="9 18 15 12 9 6"/></Ic>
        </button>
      </div>
    </>
  );
};

// ─── Main Dropship ────────────────────────────────────────────────────────────
const NotificationDropdown = ({
  isOpen, onClose, notifications: extNotifs, unreadCount: extUnread, onMarkAsRead: extMark, onMarkAllAsRead: extMarkAll, loading: extLoading
}) => {
  const { darkMode } = useContext(ThemeContext);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const dark = darkMode;
  const role = profile?.role || "student";

  const [notifs, setNotifs] = useState({ circulars: [], approvals: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !profile) return;
    // Initialize loading only if it's not already true (initial state is true)

    const readKey = `read_notifications_${profile.id || profile.uid}`;
    const getReadIds = () => JSON.parse(localStorage.getItem(readKey) || "[]");

    // 1. Circulars Listener
    const qC = query(collection(db, "circulars"), where("status", "==", "published"), limit(30));
    const unsubC = onSnapshot(qC, (snap) => {
      const reads = new Set(getReadIds());
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data(), _type: "circular" }))
        .filter(c => passesRoleFilter(c, profile))
        .map(c => ({ ...c, isRead: reads.has(c.id) }))
        .sort((a,b) => {
            const tA = (a.created_at?.seconds || 0) * 1000 || (a.created_at ? new Date(a.created_at).getTime() : 0);
            const tB = (b.created_at?.seconds || 0) * 1000 || (b.created_at ? new Date(b.created_at).getTime() : 0);
            return tB - tA;
        });
      setNotifs(p => ({ ...p, circulars: items }));
      setLoading(false);
    });

    // 2. Approvals Listener (Privileged roles only)
    let unsubA = null;
    if (role !== "student") {
      const qA = query(collection(db, "profiles"), where("status", "==", "pending"), limit(15));
      unsubA = onSnapshot(qA, (snap) => {
        const reads = new Set(getReadIds());
        const items = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, ...data, _type: "approval",
            title: `Approvals Queue: ${data.full_name || 'Verification Required'}`,
            created_at: data.created_at || new Date().toISOString(),
            isRead: reads.has(d.id)
          };
        });
        setNotifs(p => ({ ...p, approvals: items }));
      });
    }

    return () => { unsubC(); if(unsubA) unsubA(); };
  }, [isOpen, profile, role]);

  const displayNotifs = useMemo(() => {
    if (extNotifs?.length) return extNotifs;
    const combined = [...notifs.circulars, ...notifs.approvals];
    return combined.sort((a,b) => {
      const tA = a.created_at?.toDate?.()?.getTime() || new Date(a.created_at).getTime() || 0;
      const tB = b.created_at?.toDate?.()?.getTime() || new Date(b.created_at).getTime() || 0;
      return tB - tA;
    });
  }, [extNotifs, notifs]);

  const displayUnread = extUnread ?? displayNotifs.filter(n => !n.isRead).length;
  const displayLoading = extLoading ?? loading;

  const handleItem = (n) => {
    if (extMark) { extMark(n.id); } else {
      const key = `read_notifications_${profile.id || profile.uid}`;
      const ids = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      ids.add(n.id);
      localStorage.setItem(key, JSON.stringify([...ids]));
      setNotifs(p => ({
        circulars: p.circulars.map(i => i.id === n.id ? {...i, isRead: true} : i),
        approvals: p.approvals.map(i => i.id === n.id ? {...i, isRead: true} : i)
      }));
    }
    onClose?.();
    n._type === "approval" ? navigate("/dashboard/approvals") : navigate(`/dashboard/center/${n.id}`);
  };

  const markAll = () => {
    if (extMarkAll) { extMarkAll(); } else {
      const key = `read_notifications_${profile.id || profile.uid}`;
      localStorage.setItem(key, JSON.stringify(displayNotifs.map(n => n.id)));
      setNotifs(p => ({
        circulars: p.circulars.map(i => ({...i, isRead: true})),
        approvals: p.approvals.map(i => ({...i, isRead: true}))
      }));
    }
  };

  if (!isOpen) return null;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const content = isMobile ? (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[100] ${tk(dark).overlay}`} onClick={onClose} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`fixed bottom-0 left-0 right-0 z-[101] rounded-t-[32px] border-t overflow-hidden ${tk(dark).sheet}`} style={{ maxHeight: "88vh", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className={`w-10 h-1.5 rounded-full mx-auto mt-3 mb-2 shrink-0 ${tk(dark).drag}`} />
            {displayLoading ? <div className="py-20 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent" /></div> :
              <Panel dark={dark} role={role} notifs={displayNotifs} unreadCount={displayUnread} onMarkAll={markAll} onItem={handleItem} onLogs={() => { navigate("/dashboard/audit-logs"); onClose(); }} maxH="max-h-[60vh]" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  ) : (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`fixed top-16 right-6 w-[400px] border rounded-[32px] z-[101] overflow-hidden ${tk(dark).drop}`}>
        {displayLoading ? <div className="py-20 flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent" /></div> :
          <Panel dark={dark} role={role} notifs={displayNotifs} unreadCount={displayUnread} onMarkAll={markAll} onItem={handleItem} onLogs={() => { navigate("/dashboard/audit-logs"); onClose(); }} maxH="max-h-[460px]" />}
      </motion.div>
    </>
  );

  return createPortal(content, document.body);
};

export default NotificationDropdown;
