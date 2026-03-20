import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";

// ─── Time formatter ───────────────────────────────────────────────────────────
const fmtTime = (date) => {
  try {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)   return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return "Recently"; }
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  // Desktop dropdown
  drop:      dark ? "bg-[#161b22] border-white/10 shadow-2xl shadow-black/60"
                  : "bg-white border-gray-200 shadow-2xl shadow-black/10",
  // Mobile sheet
  sheet:     dark ? "bg-[#161b22] border-white/10"  : "bg-white border-gray-200",
  overlay:   dark ? "bg-black/65"                   : "bg-black/40",
  drag:      dark ? "bg-white/20"                   : "bg-gray-300",
  // Shared
  header:    dark ? "border-white/6"                : "border-gray-100",
  heading:   dark ? "text-white"                    : "text-gray-900",
  muted:     dark ? "text-gray-500"                 : "text-gray-400",
  sub:       dark ? "text-gray-400"                 : "text-gray-500",
  divider:   dark ? "border-white/5"                : "border-gray-100",
  tabActive: dark ? "text-white border-orange-500"  : "text-gray-900 border-orange-500",
  tabInact:  dark ? "text-gray-500"                 : "text-gray-400",
  unreadBg:  dark ? "bg-orange-500/6"               : "bg-orange-50/60",
  readBg:    "transparent",
  rowHov:    dark ? "hover:bg-white/4"              : "hover:bg-gray-50",
  iconBg:    {
    circular: dark ? "bg-orange-500/12 border-orange-500/20" : "bg-orange-50 border-orange-200",
    urgent:   dark ? "bg-red-500/12    border-red-500/20"    : "bg-red-50    border-red-200",
    approval: dark ? "bg-green-500/12  border-green-500/20"  : "bg-green-50  border-green-200",
    member:   dark ? "bg-blue-500/12   border-blue-500/20"   : "bg-blue-50   border-blue-200",
    system:   dark ? "bg-white/5       border-white/10"      : "bg-gray-100  border-gray-200",
  },
  iconColor: {
    circular: dark ? "#f97316" : "#ea580c",
    urgent:   dark ? "#ef4444" : "#dc2626",
    approval: dark ? "#22c55e" : "#16a34a",
    member:   dark ? "#60a5fa" : "#2563eb",
    system:   dark ? "#9ca3af" : "#6b7280",
  },
  footer:    dark ? "bg-[#0d1117] border-white/6"   : "bg-gray-50 border-gray-100",
  footerBtn: dark ? "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  emptyIcon: dark ? "bg-white/5 border-white/8"     : "bg-gray-100 border-gray-200",
  sectionLbl: dark ? "text-gray-600"                : "text-gray-400",
  markAll:   dark ? "text-orange-400"               : "text-orange-500",
  unreadDot: "bg-orange-500",
  unreadBar: "bg-orange-500",
});

// ─── Notification type detector ───────────────────────────────────────────────
const getType = (notif) => {
  if (notif.type === "approval" || notif.status === "pending") return "approval";
  if (notif.priority === "important" || notif.priority === "urgent") return "urgent";
  if (notif.type === "member") return "member";
  if (notif.type === "system") return "system";
  return "circular";
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, color, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const ICONS = {
  circular: (c) => <Ic color={c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Ic>,
  urgent:   (c) => <Ic color={c}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>,
  approval: (c) => <Ic color={c}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>,
  member:   (c) => <Ic color={c}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></Ic>,
  system:   (c) => <Ic color={c}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ic>,
  bell:     (c) => <Ic size={15} color={c}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ic>,
  check:    (c) => <Ic size={14} color={c}><polyline points="20 6 9 17 4 12"/></Ic>,
  logs:     (c) => <Ic size={14} color={c}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ic>,
  chevron:  (c) => <Ic size={14} color={c}><polyline points="9 18 15 12 9 6"/></Ic>,
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotifRow = ({ notif, dark, onClick }) => {
  const T    = tk(dark);
  const type = getType(notif);
  const bg   = T.iconBg[type];
  const col  = T.iconColor[type];

  return (
    <button
      onClick={() => onClick(notif)}
      className={`relative w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors
        ${notif.isRead ? `${T.readBg} ${T.rowHov}` : `${T.unreadBg} ${T.rowHov}`}`}
    >
      {/* Unread left bar */}
      {!notif.isRead && (
        <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${T.unreadBar}`} />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
        {ICONS[type]?.(col)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider
            ${type === "urgent"   ? dark ? "text-red-400"    : "text-red-600"    :
              type === "approval" ? dark ? "text-green-400"  : "text-green-600"  :
              type === "member"   ? dark ? "text-blue-400"   : "text-blue-600"   :
                                    dark ? "text-orange-400" : "text-orange-600" }`}>
            {type === "urgent"   ? "Urgent" :
             type === "approval" ? "Approval" :
             type === "member"   ? "Member" :
             type === "system"   ? "System" : "Circular"}
          </span>
          <span className={`text-[10px] shrink-0 ${T.muted}`}>{fmtTime(notif.created_at)}</span>
        </div>

        <p className={`text-sm font-semibold leading-tight mb-0.5 truncate
          ${notif.isRead ? T.sub : T.heading}`}>
          {notif.title}
        </p>

        <p className={`text-xs truncate ${T.muted}`}>
          {notif.priority === "important" && (
            <span className={dark ? "text-red-400" : "text-red-500"}>! </span>
          )}
          {notif.department_target === "ALL" ? "All members" : notif.department_target}
          {notif.author_name ? ` · ${notif.author_name}` : ""}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${T.unreadDot}`} />
      )}
    </button>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ dark, tab }) => {
  const T = tk(dark);
  return (
    <div className="flex flex-col items-center py-12 px-6 text-center">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${T.emptyIcon}`}>
        {ICONS.bell(dark ? "rgba(255,255,255,0.15)" : "#d1d5db")}
      </div>
      <p className={`text-sm font-bold mb-1 ${T.heading}`}>You're all caught up!</p>
      <p className={`text-xs ${T.muted}`}>
        {tab === "circulars" ? "No new circulars yet" :
         tab === "approvals" ? "No pending approvals" :
         "No new notifications"}
      </p>
    </div>
  );
};

// ─── Shared inner content ─────────────────────────────────────────────────────
const NotifContent = ({ dark, notifications, unreadCount, loading, onMarkAllAsRead, onMarkAsRead, onClose, maxH }) => {
  const T        = tk(dark);
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");

  const filtered = notifications.filter((n) => {
    if (tab === "circulars") return getType(n) !== "approval" && getType(n) !== "member";
    if (tab === "approvals") return getType(n) === "approval";
    return true;
  });

  const unread = filtered.filter((n) => !n.isRead);
  const read   = filtered.filter((n) =>  n.isRead);

  const handleClick = (notif) => {
    onMarkAsRead?.(notif.id);
    onClose?.();
    if (getType(notif) === "approval") navigate("/dashboard/approvals");
    else navigate(`/dashboard/center/${notif.id}`);
  };

  const TABS = [
    { id: "all",       label: "All",       count: notifications.length            },
    { id: "circulars", label: "Circulars", count: notifications.filter((n) => getType(n) !== "approval").length },
    { id: "approvals", label: "Approvals", count: notifications.filter((n) => getType(n) === "approval").length },
  ];

  return (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${T.header}`}>
        <div className="flex items-center gap-2.5">
          <p className={`text-base font-bold ${T.heading}`}>Notifications</p>
          {unreadCount > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${dark ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                     : "bg-orange-50 text-orange-600 border border-orange-200"}`}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllAsRead}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${T.markAll}`}>
            {ICONS.check(dark ? "#f97316" : "#ea580c")}
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${T.header} px-5`}>
        {TABS.map(({ id, label, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 text-xs font-semibold pb-3 mr-5 pt-3 border-b-2 transition-all
              ${tab === id ? T.tabActive : `${T.tabInact} border-transparent`}`}>
            {label}
            {count > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                ${tab === id
                  ? dark ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-600"
                  : dark ? "bg-white/8 text-gray-500" : "bg-gray-100 text-gray-400"
                }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={`overflow-y-auto ${maxH || "max-h-[420px]"}`}
        style={{ overscrollBehavior: "contain" }}>
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              {ICONS.bell(dark ? "rgba(255,255,255,0.2)" : "#d1d5db")}
            </motion.div>
            <p className={`text-xs ${T.muted}`}>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState dark={dark} tab={tab} />
        ) : (
          <>
            {/* Unread */}
            {unread.length > 0 && (
              <>
                {read.length > 0 && (
                  <p className={`text-[10px] font-bold uppercase tracking-[1.2px] px-5 py-2 ${T.sectionLbl}`}>
                    New
                  </p>
                )}
                <div className={`divide-y ${T.divider}`}>
                  {unread.map((n) => (
                    <NotifRow key={n.id} notif={n} dark={dark} onClick={handleClick} />
                  ))}
                </div>
              </>
            )}

            {/* Read */}
            {read.length > 0 && (
              <>
                <p className={`text-[10px] font-bold uppercase tracking-[1.2px] px-5 py-2 ${T.sectionLbl}`}>
                  Earlier
                </p>
                <div className={`divide-y ${T.divider}`}>
                  {read.map((n) => (
                    <NotifRow key={n.id} notif={n} dark={dark} onClick={handleClick} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t ${T.header} px-5 py-3`}>
        <button
          onClick={() => { navigate("/dashboard/audit-logs"); onClose?.(); }}
          className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${T.footerBtn}`}>
          <div className="flex items-center gap-2">
            {ICONS.logs(dark ? "#6b7280" : "#9ca3af")}
            System Activity Logs
          </div>
          {ICONS.chevron(dark ? "#6b7280" : "#9ca3af")}
        </button>
      </div>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const NotificationDropdown = ({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  loading = false,
}) => {
  const { theme } = useContext(ThemeContext);
  
  // Support system theme detection
  const isSystemDark = typeof window !== "undefined" && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && isSystemDark);
  const T    = tk(dark);

  // Detect mobile (≤640px) — same breakpoint as Tailwind sm:
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  if (!isOpen) return null;

  // ── Desktop dropdown ──
  if (!isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1  }}
          exit={{    opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 340 }}
          className={`absolute right-0 mt-2 w-[380px] border rounded-3xl z-50 overflow-hidden ${T.drop}`}
        >
          <NotifContent
            dark={dark} notifications={notifications} unreadCount={unreadCount}
            loading={loading} onMarkAllAsRead={onMarkAllAsRead}
            onMarkAsRead={onMarkAsRead} onClose={onClose}
            maxH="max-h-[400px]"
          />
        </motion.div>
      </>
    );
  }

  // ── Mobile bottom sheet ──
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 ${T.overlay}`}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`fixed bottom-0 left-0 right-0 z-50 border-t rounded-t-3xl flex flex-col ${T.sheet}`}
            style={{
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-1 shrink-0 ${T.drag}`} />

            <NotifContent
              dark={dark} notifications={notifications} unreadCount={unreadCount}
              loading={loading} onMarkAllAsRead={onMarkAllAsRead}
              onMarkAsRead={onMarkAsRead} onClose={onClose}
              maxH="max-h-[55vh]"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
