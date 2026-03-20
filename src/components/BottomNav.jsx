import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";

const tk = (dark) => ({
  bar:      dark
    ? "bg-black/95 border-white/8 backdrop-blur-xl"
    : "bg-white/95 border-gray-200/80 backdrop-blur-xl",
  item:     dark ? "text-gray-500"    : "text-gray-400",
  active:   "text-orange-500",
  label:    dark ? "text-gray-500"    : "text-gray-400",
  labelAct: "text-orange-500",
  fab:      "bg-orange-500 text-white shadow-lg shadow-orange-500/30",
  fabRing:  dark ? "ring-black"       : "ring-white",
});

// ─── Nav items ─────────────────────────────────────────────────────────────────
const HOME_ITEM = {
  id: "home",
  path: "/dashboard/center",
  label: "Home",
  icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};

const SEARCH_ITEM = {
  id: "search",
  path: "/dashboard/search-members",
  label: "Search",
  icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

const ALERTS_ITEM = {
  id: "alerts",
  path: "/dashboard/alerts",
  label: "Alerts",
  icon: (active, badge) => (
    <div className="relative">
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full border border-white text-[8px] font-bold text-white flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  ),
};

const FEEDBACK_ITEM = {
  id: "feedback",
  path: "/dashboard/feedback",
  label: "Feedback",
  icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const PROFILE_ITEM = {
  id: "settings",
  path: "/dashboard/settings",
  label: "Profile",
  icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const FAB_ITEM = {
  id: "fab",
  path: "/dashboard/create",
  label: "Post",
  icon: null,
};

// ─── BottomNav ─────────────────────────────────────────────────────────────────
const BottomNav = ({ notifCount = 0 }) => {
  const { theme }           = useContext(ThemeContext);
  const { profile, isStudent } = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();

  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const T    = tk(dark);

  const isActive = (path) =>
    location.pathname === path ||
    (path === "/dashboard/center" && location.pathname === "/dashboard");

  const role = profile?.role || "student";
  const showFab = !isStudent && role !== "student";
  const isAdmin = role === "admin" || role === "dept_admin";

  const navItems = showFab
    ? isAdmin 
      ? [HOME_ITEM, SEARCH_ITEM, FAB_ITEM, ALERTS_ITEM, PROFILE_ITEM]
      : [HOME_ITEM, SEARCH_ITEM, FAB_ITEM, FEEDBACK_ITEM, PROFILE_ITEM]
    : [HOME_ITEM, SEARCH_ITEM, FEEDBACK_ITEM, PROFILE_ITEM];

  return (
    <>
      {/* Spacer so page content isn't hidden under fixed bar */}
      <div className="h-20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />

      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 border-t transition-colors duration-300 ${T.bar}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
          {navItems.map(({ id, path, label, icon }) => {
            // FAB (center create button — admin/teacher only)
            if (id === "fab") {
              return (
                <button
                  key="fab"
                  onClick={() => navigate(path)}
                  aria-label="Create circular"
                  className={`relative -mt-6 rounded-2xl ring-4 flex items-center justify-center transition-transform active:scale-90 ${T.fab} ${T.fabRing}`}
                  style={{ width: 52, height: 52 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5"  y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              );
            }

            const active = isActive(path);
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                aria-label={label}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[44px] min-h-[44px] justify-center transition-all active:scale-90 ${
                  active ? T.active : T.item
                }`}
              >
                {icon(active, id === "alerts" ? notifCount : 0)}
                <span className={`text-[10px] font-semibold tracking-wide mt-0.5 ${
                  active ? T.labelAct : T.label
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
