import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { ThemeContext } from "../../context/ThemeContext";

// ─── All icons as clean inline SVGs with explicit shrink-0 ───────────────────
const Icon = ({ children, size = 16 }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, display: "block" }}
  >
    {children}
  </svg>
);

const ICONS = {
  center: (
    <Icon>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </Icon>
  ),
  post: (
    <Icon>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </Icon>
  ),
  drafts: (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </Icon>
  ),
  hub: (
    <Icon>
      <rect x="2" y="3" width="7" height="7" rx="1"/>
      <rect x="15" y="3" width="7" height="7" rx="1"/>
      <rect x="2" y="14" width="7" height="7" rx="1"/>
      <rect x="15" y="14" width="7" height="7" rx="1"/>
    </Icon>
  ),
  approvals: (
    <Icon>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </Icon>
  ),
  members: (
    <Icon>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </Icon>
  ),
  logs: (
    <Icon>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </Icon>
  ),
  feedback: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </Icon>
  ),
  signout: (
    <Icon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </Icon>
  ),
  close: (
    <Icon size={14}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </Icon>
  ),
  moon: (
    <Icon size={15}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </Icon>
  ),
  sun: (
    <Icon size={15}>
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </Icon>
  ),
};

// ─── Nav config ───────────────────────────────────────────────────────────────
const WORKSPACE = [
  { id: "center",    label: "Circular Center", path: "/dashboard/center"       },
  { id: "post",      label: "Post",            path: "/dashboard/create"       },
  { id: "drafts",    label: "Drafts",          path: "/dashboard/drafts"       },
  { id: "hub",       label: "My Hub",          path: "/dashboard/my-posts"     },
  { id: "approvals", label: "Approvals",       path: "/dashboard/approvals", badge: true },
  { id: "members",   label: "Members",         path: "/dashboard/manage-users" },
];

const filterNavByRole = (items, role) => {
  if (role === "admin" || role === "dept_admin") return items;
  if (role === "teacher") return items.filter((i) => i.id !== "members");
  return items.filter((i) => ["center"].includes(i.id));
};

const filterMgmtByRole = (items, role) => {
  if (role === "admin" || role === "dept_admin") return items;
  if (role === "teacher") return items.filter((i) => ["feedback", "settings"].includes(i.id));
  return items.filter((i) => ["feedback", "settings"].includes(i.id));
};

const MANAGEMENT = [
  { id: "logs",     label: "Logs",     path: "/dashboard/audit-logs" },
  { id: "feedback", label: "Feedback", path: "/dashboard/feedback"   },
  { id: "settings", label: "Settings", path: "/dashboard/settings"   },
];

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tk = (dark) => ({
  drawer:       dark ? "bg-black"                         : "bg-white",
  border:       dark ? "border-white/6"                   : "border-gray-200",
  overlay:      dark ? "bg-black/65"                      : "bg-black/40",
  profileBg:    dark ? "bg-[#121212]"                     : "bg-gray-50",
  name:         dark ? "text-white"                       : "text-gray-900",
  meta:         dark ? "text-gray-400"                    : "text-gray-500",
  liveBg:       dark
    ? "bg-green-500/10 border-green-500/20 text-green-400"
    : "bg-green-50 border-green-200 text-green-700",
  sectionLbl:   dark ? "text-gray-600"                    : "text-gray-400",
  itemDef:      dark ? "text-gray-400"                    : "text-gray-500",
  itemHover:    dark
    ? "hover:bg-white/5 hover:text-gray-100"
    : "hover:bg-gray-50 hover:text-gray-800",
  iconDefBg:    dark ? "bg-white/5"                       : "bg-gray-100",
  iconHover:    dark
    ? "group-hover:bg-orange-500/10 group-hover:text-orange-400"
    : "group-hover:bg-orange-50 group-hover:text-orange-500",
  itemActBg:    dark ? "bg-[#1c2333]"                     : "bg-orange-50",
  itemActText:  dark ? "text-white"                       : "text-orange-600",
  itemActIcon:  dark
    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
    : "bg-orange-500 text-white shadow-sm shadow-orange-500/20",
  chevron:      dark ? "text-gray-600 group-hover:text-gray-400" : "text-gray-300 group-hover:text-gray-500",
  footerBg:     dark ? "bg-[#121212]"                     : "bg-gray-50",
  footerText:   dark ? "text-gray-200"                    : "text-gray-700",
  footerSub:    dark ? "text-gray-500"                    : "text-gray-400",
  togOn:        "bg-orange-500 border-orange-500",
  togOff:       dark ? "bg-white/10 border-white/15"      : "bg-gray-200 border-gray-300",
  togModeBg:    dark ? "bg-white/5"                       : "bg-white border border-gray-200",
  userRowBg:    dark ? ""                                 : "",
  signoutBg:    dark
    ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
    : "bg-orange-50 text-orange-500 hover:bg-orange-100",
  avatarRing:   dark ? "ring-orange-500/40"               : "ring-orange-400/50",
  drag:         dark ? "bg-white/15"                      : "bg-gray-200",
});

// ─── Nav row ──────────────────────────────────────────────────────────────────
const NavRow = ({ id, label, badge, active, dark, approvalCount, onClick }) => {
  const T = tk(dark);
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5
        text-sm font-medium text-left transition-colors duration-150 group
        ${active ? `${T.itemActBg} ${T.itemActText}` : `${T.itemDef} ${T.itemHover}`}
      `}
    >
      {/* Active bar */}
      {active && (
        <motion.span
          layoutId="sidebarActiveBar"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-orange-500"
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
        />
      )}

      {/* Icon box — fixed 32x32, never grows */}
      <span
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          transition-colors duration-150 shrink-0
          ${active ? T.itemActIcon : `${T.iconDefBg} ${T.iconHover}`}
        `}
        style={{ minWidth: 32, minHeight: 32 }}
      >
        {ICONS[id]}
      </span>

      {/* Label */}
      <span className="flex-1 truncate leading-none">{label}</span>

      {/* Badge */}
      {badge && approvalCount > 0 && (
        <motion.span
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-5 h-5 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0"
        >
          {approvalCount > 9 ? "9+" : approvalCount}
        </motion.span>
      )}

      {/* Chevron */}
      {!active && (
        <span className={`shrink-0 transition-opacity opacity-0 group-hover:opacity-100 ${T.chevron}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: "block" }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      )}
    </motion.button>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const ProfilePageMobile = ({ open, onClose, approvalCount = 0 }) => {  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate                         = useNavigate();
  const location                         = useLocation();

  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const T    = tk(dark);

  const photoURL  = profile?.photoURL;
  const initials  = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const roleLabel = {
    admin:      "System Admin",
    dept_admin: "Dept Admin",
    teacher:    "Faculty",
    student:    "Student",
  }[profile?.role] || profile?.role || "Member";

  const go = (path) => { navigate(path); onClose(); };
  const isActive = (path) => location.pathname === path;

  const workspaceItems  = filterNavByRole(WORKSPACE, profile?.role || "student");
  const managementItems = filterMgmtByRole(MANAGEMENT, profile?.role || "student");
  const showManagement  = managementItems.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-50 ${T.overlay}`}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="sidebar"
            initial={{ x: "-100%", opacity: 0.6 }}
            animate={{ x: 0,       opacity: 1   }}
            exit={{    x: "-100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={`
              fixed top-0 left-0 bottom-0 z-50 w-[272px]
              flex flex-col border-r
              ${T.drawer} ${T.border}
            `}
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >

            {/* ── Profile header ── */}
            <div className={`px-4 pt-4 pb-4 ${T.profileBg}`}>

              {/* Top row: avatar + close */}
              <div className="flex items-start justify-between mb-3">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-13 h-13 rounded-2xl border-2 border-orange-500 p-0.5 ring-2 ${T.avatarRing}`}
                    style={{ width: 52, height: 52 }}>
                    {photoURL ? (
                      <img src={photoURL} alt={profile?.name}
                        className="w-full h-full rounded-[14px] object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-orange-500 to-orange-700
                        flex items-center justify-center">
                        <span className="text-base font-bold text-white leading-none">{initials}</span>
                      </div>
                    )}
                  </div>
                  {/* Online dot */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2"
                    style={{ borderColor: dark ? "#161b22" : "#f9fafb" }}
                  />
                </div>

                {/* Close btn */}
                <button
                  onClick={onClose}
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center mt-0.5
                    transition-colors shrink-0
                    ${dark
                      ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                    }
                  `}
                >
                  {ICONS.close}
                </button>
              </div>

              {/* Name + role */}
              <p className={`text-[15px] font-bold leading-tight mb-0.5 ${T.name}`}>
                {profile?.name || "Loading…"}
              </p>
              <p className={`text-xs mb-3 ${T.meta}`}>
                {[profile?.department, roleLabel].filter(Boolean).join(" · ")}
              </p>

              {/* Live pill */}
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${T.liveBg}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                System Live
              </span>
            </div>

            {/* India strip */}
            <div
              className="h-[2px] shrink-0 opacity-50"
              style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }}
            />

            {/* ── Nav ── */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-3"
              style={{ overscrollBehavior: "contain" }}
            >
              {/* Workspace */}
              <p className={`text-[10px] font-bold tracking-[1.3px] uppercase px-2 mb-2 ${T.sectionLbl}`}>
                Workspace
              </p>
              {workspaceItems.map((item) => (
                <NavRow
                  key={item.id}
                  {...item}
                  active={isActive(item.path)}
                  dark={dark}
                  approvalCount={approvalCount}
                  onClick={() => go(item.path)}
                />
              ))}

              {/* Management */}
              {showManagement && (
                <div className="mt-4">
                  <p className={`text-[10px] font-bold tracking-[1.3px] uppercase px-2 mb-2 ${T.sectionLbl}`}>
                    Management
                  </p>
                  {managementItems.map((item) => (
                    <NavRow
                      key={item.id}
                      {...item}
                      active={isActive(item.path)}
                      dark={dark}
                      approvalCount={0}
                      onClick={() => go(item.path)}
                    />
                  ))}
                </div>
              )}
            </nav>

            {/* ── Footer ── */}
            <div
              className={`px-4 py-3 border-t shrink-0 ${T.footerBg} ${T.border}`}
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              {/* Dark mode row */}
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 ${T.togModeBg}`}>
                <div className="flex items-center gap-2.5">
                  <span className={dark ? "text-gray-300" : "text-gray-500"}>
                    {dark ? ICONS.moon : ICONS.sun}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold leading-none mb-0.5 ${T.footerText}`}>
                      {dark ? "Dark Mode" : "Light Mode"}
                    </p>
                    <p className={`text-[10px] leading-none ${T.footerSub}`}>
                      {dark ? "Easy on the eyes" : "Bright and clear"}
                    </p>
                  </div>
                </div>

                {/* Toggle — fixed size, no overflow */}
                <button
                  onClick={toggleTheme}
                  className={`
                    relative rounded-full border transition-all duration-200 shrink-0
                    focus:outline-none focus:ring-2 focus:ring-red-500/30
                    ${dark ? T.togOn : T.togOff}
                  `}
                  style={{ width: 40, height: 22, minWidth: 40 }}
                  role="switch"
                  aria-checked={dark}
                >
                  <span
                    className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform duration-200"
                    style={{
                      width: 18,
                      height: 18,
                      transform: dark ? "translateX(18px)" : "translateX(0px)",
                    }}
                  />
                </button>
              </div>

              {/* User row */}
              <div className="flex items-center gap-2.5 px-1">
                {/* Mini avatar */}
                <div
                  className="rounded-lg overflow-hidden shrink-0"
                  style={{ width: 32, height: 32, minWidth: 32 }}
                >
                  {photoURL ? (
                    <img src={photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
                    </div>
                  )}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate leading-none mb-0.5 ${T.footerText}`}>
                    {profile?.name || "—"}
                  </p>
                  <p className={`text-[10px] truncate leading-none ${T.footerSub}`}>
                    {profile?.email || "—"}
                  </p>
                </div>

                {/* Sign out */}
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  className={`
                    flex items-center justify-center rounded-lg transition-colors shrink-0
                    ${T.signoutBg}
                  `}
                  style={{ width: 32, height: 32, minWidth: 32 }}
                >
                  {ICONS.signout}
                </button>
              </div>

              {/* Footer note */}
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

export default ProfilePageMobile;