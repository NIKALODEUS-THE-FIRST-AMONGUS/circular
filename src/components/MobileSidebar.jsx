import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/FirebaseAuthContext";
import { ThemeContext } from "../context/ThemeContext";

// ─── Nav config ───────────────────────────────────────────────────────────────
const WORKSPACE = [
  { id: "center",    label: "Circular Center", path: "/dashboard/center",       icon: "radio_button_checked" },
  { id: "post",      label: "Post",            path: "/dashboard/create",       icon: "edit_note" },
  { id: "drafts",    label: "Drafts",          path: "/dashboard/drafts",       icon: "drafts" },
  { id: "hub",       label: "My Hub",          path: "/dashboard/my-posts",     icon: "hub" },
  { id: "approvals", label: "Approvals",       path: "/dashboard/approvals",    icon: "task_alt", badge: true },
  { id: "members",   label: "Members",         path: "/dashboard/manage-users", icon: "group" },
];
const MANAGEMENT = [
  { id: "logs",     label: "Logs",     path: "/dashboard/audit-logs", icon: "history" },
  { id: "feedback", label: "Feedback", path: "/dashboard/feedback",   icon: "chat" },
  { id: "settings", label: "Settings", path: "/dashboard/settings",   icon: "settings" },
];

// Role-specific nav — students don't see admin items
const filterNavByRole = (items, role) => {
  if (role === "admin" || role === "dept_admin") return items;
  if (role === "teacher") return items.filter((i) => i.id !== "members");
  // student — workspace only shows center; no management
  return items.filter((i) => ["center"].includes(i.id));
};
const filterMgmtByRole = (items, role) => {
  if (role === "admin" || role === "dept_admin") return items;
  if (role === "teacher") return items.filter((i) => ["feedback", "settings"].includes(i.id));
  return items.filter((i) => ["feedback", "settings"].includes(i.id)); // students see feedback & settings
};

// ─── Material Icon Component ──────────────────────────────────────────────────
const MaterialIcon = ({ icon, className = '', size = 20 }) => {
  return <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{icon}</span>;
};

// ─── Icons for theme toggle and close ─────────────────────────────────────────
const Ic = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const ICONS = {
  signout:   <Ic size={15}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>,
  close:     <Ic size={14}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>,
  moon:      <Ic size={14}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Ic>,
  sun:       <Ic size={14}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></Ic>,
};

// ─── Smart Avatar ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-orange-500 to-orange-700",
  "from-blue-500 to-blue-700",
  "from-green-500 to-green-700",
  "from-purple-500 to-purple-700",
  "from-red-500 to-red-700",
  "from-teal-500 to-teal-700",
];

const getAvatarGradient = (name = "") =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

const isValidPhotoURL = (url) => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  return false;
};

const SmartAvatar = ({ name, photoURL, size = 52, radius = 16, dark }) => {
  const init    = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const gradient = getAvatarGradient(name);
  const showPhoto = isValidPhotoURL(photoURL);
  const borderColor = dark ? "#161b22" : "#f9fafb";

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      {/* Orange ring */}
      <div style={{
        width: size, height: size,
        borderRadius: radius + 2,
        border: "2px solid #f97316",
        padding: 2,
        boxSizing: "border-box",
      }}>
        {showPhoto ? (
          <img
            src={photoURL}
            alt={name}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            style={{ width: "100%", height: "100%", borderRadius: radius - 2, objectFit: "cover", display: "block" }}
          />
        ) : null}
        <div style={{
          width: "100%", height: "100%",
          borderRadius: radius - 2,
          display: showPhoto ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, var(--from), var(--to))`,
        }}
          className={`bg-gradient-to-br ${gradient}`}>
          <span style={{
            fontSize: size > 44 ? 16 : 12,
            fontWeight: 700,
            color: "white",
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}>{init}</span>
        </div>
      </div>
      {/* Online dot */}
      <span style={{
        position: "absolute",
        bottom: -1, right: -1,
        width: 12, height: 12,
        background: "#22c55e",
        borderRadius: "50%",
        border: `2px solid ${borderColor}`,
      }} />
    </div>
  );
};

const MiniAvatar = ({ name, photoURL, size = 30 }) => {
  const init     = name ? name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  const gradient = getAvatarGradient(name);
  const showPhoto = isValidPhotoURL(photoURL);

  return (
    <div style={{ width: size, height: size, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
      {showPhoto ? (
        <img src={photoURL} alt={name}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      <div style={{ width: "100%", height: "100%", display: showPhoto ? "none" : "flex", alignItems: "center", justifyContent: "center" }}
        className={`bg-gradient-to-br ${gradient}`}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "white", lineHeight: 1 }}>{init}</span>
      </div>
    </div>
  );
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  drawer:     dark ? "bg-[#0f172a] border-white/10 shadow-2xl"    : "bg-white border-slate-200 shadow-xl",
  overlay:    dark ? "bg-black/80 backdrop-blur-sm"               : "bg-black/40 backdrop-blur-sm",
  profileBg:  dark ? "bg-[#0f172a]"                               : "bg-slate-50",
  name:       dark ? "text-white"                                 : "text-slate-900",
  meta:       dark ? "text-slate-400"                             : "text-slate-500",
  live:       dark ? "bg-green-500/10 border-green-500/20 text-green-400"
                   : "bg-green-50 border-green-200 text-green-700",
  sLbl:       dark ? "text-slate-500 font-bold tracking-widest"   : "text-slate-400 font-bold tracking-widest",
  item:       dark ? "text-slate-400 hover:bg-white/5 hover:text-white"
                   : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
  iconBg:     dark ? "bg-white/5 group-hover:bg-[#ec5b13]/10 group-hover:text-[#ec5b13]"
                   : "bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-500",
  actBg:      dark ? "border-l-4 border-[#ec5b13] bg-white/5 text-white"
                   : "bg-orange-50 text-orange-600",
  actIcon:    dark ? "bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/30"
                   : "bg-orange-500 text-white shadow-lg shadow-orange-500/30",
  footerBg:   dark ? "bg-[#0f172a] border-white/10"               : "bg-slate-50 border-slate-200",
  footerTxt:  dark ? "text-white"                                 : "text-slate-700",
  footerSub:  dark ? "text-slate-500"                             : "text-slate-400",
  togOn:      dark ? "bg-[#ec5b13] border-[#ec5b13]"              : "bg-orange-500 border-orange-500",
  togOff:     dark ? "bg-white/10 border-white/15"                : "bg-slate-200 border-slate-300",
  togRow:     dark ? "bg-white/5"                                 : "bg-white border border-slate-200",
  signout:    dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                   : "bg-red-50 text-red-500 hover:bg-red-100",
  divider:    dark ? "border-white/10"                            : "border-slate-200",
  closeBtn:   dark ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                   : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
});

// ─── Nav row ──────────────────────────────────────────────────────────────────
const NavRow = ({ _id, label, _path, icon, badge, active, dark, approvalCount, onClick }) => {
  const T = tk(dark);
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5
        text-sm font-medium text-left transition-all duration-150 outline-none group
        ${active ? T.actBg : T.item}`}>
      {active && (
        <motion.span layoutId="sidebarBar"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-orange-500"
          transition={{ type: "spring", stiffness: 500, damping: 35 }} />
      )}
      <span className={`rounded-lg flex items-center justify-center transition-all duration-150 shrink-0
        ${active ? T.actIcon : T.iconBg}`}
        style={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}>
        <MaterialIcon icon={icon} size={20} />
      </span>
      <span className="flex-1 truncate leading-none">{label}</span>
      {badge && approvalCount > 0 && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
          {approvalCount > 9 ? "9+" : approvalCount}
        </motion.span>
      )}
      {!active && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
          style={{ display: "block" }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </motion.button>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const MobileSidebar = ({ open, onClose, approvalCount = 0 }) => {
  const { profile, signOut }         = useContext(AuthContext);
  const { theme, toggleTheme }       = useContext(ThemeContext);
  const navigate                     = useNavigate();
  const location                     = useLocation();

  const dark = theme === 'dark';
  const T    = tk(dark);

  const role      = profile?.role || "student";
  const roleLabel = { admin: "System Admin", dept_admin: "Dept Admin", teacher: "Faculty", student: "Student" }[role] || role;

  const workspaceItems  = filterNavByRole(WORKSPACE, role);
  const managementItems = filterMgmtByRole(MANAGEMENT, role);
  const showManagement  = managementItems.length > 0;

  const go       = (path) => { navigate(path); onClose(); };
  const isActive = (path) => location.pathname === path || (path === "/dashboard/center" && location.pathname === "/dashboard");

  const navVariants = {
    show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
  };
  const navItem = {
    hidden: { opacity: 0, x: -12 },
    show:   { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 32 } },
  };

  const photoURL = profile?.photoURL || profile?.avatar_url;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 ${T.overlay}`}
            onClick={onClose} />

          <motion.aside key="drawer"
            initial={{ x: "-100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.9 }}
            className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r ${T.drawer}`}
            style={{ width: 272, paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className={`px-4 pt-4 pb-4 shrink-0 ${T.profileBg}`}>
              <div className="flex items-start justify-between mb-3">
                <SmartAvatar
                  name={profile?.full_name}
                  photoURL={photoURL}
                  size={52}
                  radius={15}
                  dark={dark}
                />
                <button onClick={onClose}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${T.closeBtn}`}>
                  {ICONS.close}
                </button>
              </div>

              <p className={`text-[15px] font-bold leading-tight mb-0.5 ${T.name}`}>
                {profile?.full_name || "Loading…"}
              </p>
              <p className={`text-xs mb-3 ${T.meta}`}>
                {[profile?.department?.toUpperCase?.() === "ALL" ? null : profile?.department, roleLabel]
                  .filter(Boolean).join(" · ") || roleLabel}
              </p>

              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${T.live}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                System Live
              </span>
            </div>

            <div className="h-[2px] opacity-50 shrink-0"
              style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

            <motion.nav
              variants={navVariants} initial="hidden" animate="show"
              className="flex-1 overflow-y-auto px-3 py-3"
              style={{ overscrollBehavior: "contain" }}>

              <p className={`text-[10px] font-bold tracking-[1.3px] uppercase px-2 mb-2 ${T.sLbl}`}>
                Workspace
              </p>
              {workspaceItems.map((item) => (
                <motion.div key={item.id} variants={navItem}>
                  <NavRow {...item} active={isActive(item.path)} dark={dark}
                    approvalCount={approvalCount} onClick={() => go(item.path)} />
                </motion.div>
              ))}

              {showManagement && (
                <div className="mt-4">
                  <p className={`text-[10px] font-bold tracking-[1.3px] uppercase px-2 mb-2 ${T.sLbl}`}>
                    Management
                  </p>
                  {managementItems.map((item) => (
                    <motion.div key={item.id} variants={navItem}>
                      <NavRow {...item} active={isActive(item.path)} dark={dark}
                        approvalCount={0} onClick={() => go(item.path)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.nav>

            <div className={`px-4 py-3 border-t shrink-0 ${T.footerBg} ${T.divider}`}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>

              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 ${T.togRow}`}>
                <div className="flex items-center gap-2.5">
                  <span className={dark ? "text-gray-300" : "text-amber-500"}>
                    {dark ? ICONS.moon : ICONS.sun}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${T.footerTxt}`}>
                      {dark ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p className={`text-[10px] leading-tight ${T.footerSub}`}>
                      {dark ? "Easy on the eyes" : "Bright and clear"}
                    </p>
                  </div>
                </div>
                <button onClick={toggleTheme} role="switch" aria-checked={dark}
                  className={`relative rounded-full border transition-colors duration-200 shrink-0 focus:outline-none ${dark ? T.togOn : T.togOff}`}
                  style={{ width: 40, height: 22, minWidth: 40 }}>
                  <motion.span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm"
                    style={{ width: 18, height: 18 }}
                    animate={{ x: dark ? 18 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                </button>
              </div>

              <div className="flex items-center gap-2.5 px-1">
                <MiniAvatar name={profile?.full_name} photoURL={photoURL} size={30} />

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate leading-tight ${T.footerTxt}`}>
                    {profile?.full_name || "—"}
                  </p>
                  <p className={`text-[10px] truncate leading-tight ${T.footerSub}`}>
                    {profile?.email || "—"}
                  </p>
                </div>

                <button onClick={signOut} aria-label="Sign out"
                  className={`flex items-center justify-center rounded-lg transition-colors shrink-0 ${T.signout}`}
                  style={{ width: 32, height: 32, minWidth: 32 }}>
                  {ICONS.signout}
                </button>
              </div>

              <p className={`text-[10px] text-center mt-3 ${T.footerSub}`}>
                Proudly Built for India 🇮🇳 · v2.0
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;
