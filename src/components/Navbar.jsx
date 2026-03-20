import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

/* ── Design tokens ───────────────────────────────────────── */
const tk = (dark) => ({
  bar: dark
    ? "bg-[#0d1117]/95 border-white/8 backdrop-blur-xl"
    : "bg-white/95 border-gray-200/60 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.06)]",

  logo: dark ? "text-white" : "text-gray-900",
  muted: dark ? "text-gray-500" : "text-gray-400",

  btn: dark
    ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
    : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-800",

  notif: dark
    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
    : "bg-orange-50 border-orange-200 text-orange-500",

  divider: dark ? "border-white/8" : "border-gray-200",
});

/* ── Translations ───────────────────────────────────────── */
const LOGO_TEXT = {
  en: { s: "Suchna", x: "X", l: "Link" },
  hi: { s: "सूचना", x: "एक्स", l: "लिंक" },
  te: { s: "సూచనా", x: "ఎక్స్", l: "లింక్" },
  ta: { s: "சுச்னா", x: "எக்ஸ்", l: "லிங்க்" },
  kn: { s: "ಸೂಚನಾ", x: "ಎక్స్", l: "ಲಿಂಕ್" },
  mr: { s: "सूचना", x: "एक्स", l: "लिंक" },
};

/* ── Flag ───────────────────────────────────────────────── */
const Flag = ({ dark }) => (
  <svg
    width="20"
    height="14"
    viewBox="0 0 900 600"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      borderRadius: 2,
      flexShrink: 0,
      boxShadow: dark
        ? "0 0 0 1px rgba(255,255,255,0.1)"
        : "0 0 0 1px rgba(0,0,0,0.1)",
    }}
  >
    <rect width="900" height="200" y="0" fill="#FF9933" />
    <rect width="900" height="200" y="200" fill="#FFFFFF" />
    <rect width="900" height="200" y="400" fill="#138808" />

    <circle
      cx="450"
      cy="300"
      r="80"
      fill="none"
      stroke="#000080"
      strokeWidth="8"
    />
    <circle cx="450" cy="300" r="10" fill="#000080" />

    <g stroke="#000080" strokeWidth="3">
      <line x1="450" y1="220" x2="450" y2="380" />
      <line x1="370" y1="300" x2="530" y2="300" />
      <line x1="393" y1="243" x2="507" y2="357" />
      <line x1="507" y1="243" x2="393" y2="357" />
      <line x1="373" y1="277" x2="527" y2="323" />
      <line x1="527" y1="277" x2="373" y2="323" />
    </g>
  </svg>
);

/* ── Role chip ──────────────────────────────────────────── */
const ROLE_CHIP = {
  admin:
    "text-red-500 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20",
  teacher:
    "text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",
  student:
    "text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20",
};

const ROLE_LABEL = {
  admin: "Admin",
  teacher: "Faculty",
  student: "Student",
};

/* ── Burger ─────────────────────────────────────────────── */
const Burger = ({ dark }) => (
  <span className="flex flex-col gap-[5px]" style={{ width: 16 }}>
    <span
      className={`block h-[1.5px] w-full rounded-full ${
        dark ? "bg-gray-300" : "bg-gray-600"
      }`}
    />
    <span
      className={`block h-[1.5px] rounded-full ${
        dark ? "bg-gray-300" : "bg-gray-600"
      }`}
      style={{ width: 10 }}
    />
    <span
      className={`block h-[1.5px] w-full rounded-full ${
        dark ? "bg-gray-300" : "bg-gray-600"
      }`}
    />
  </span>
);

/* ── Bell ──────────────────────────────────────────────── */
const Bell = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

/* ── Navbar ─────────────────────────────────────────────── */
const Navbar = ({
  onMenuClick,
  approvalCount: _approvalCount = 0,
  notifCount = 0,
}) => {
  const { profile } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const T = tk(dark);

  const photoURL = profile?.photoURL;

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const role = profile?.role;
  const chipColor = ROLE_CHIP[role] || "";
  const chipLabel = ROLE_LABEL[role] || "Member";
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const lang = profile?.greeting_language || "en";
  const lt = LOGO_TEXT[lang] || LOGO_TEXT.en;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 border-b transition-colors duration-300 ${T.bar}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={`flex items-center justify-between h-14 gap-2 w-full ${
          isMobile ? "pl-3 pr-5 max-w-lg mx-auto" : "px-6 max-w-7xl mx-auto"
        }`}
      >
        {/* LEFT */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Hamburger */}
          <button
            onClick={onMenuClick}
            className={`w-9 h-9 min-w-[36px] rounded-xl border flex items-center justify-center transition-colors shrink-0 ${T.btn}`}
          >
            <Burger dark={dark} />
          </button>

          {/* Logo */}
          <button
            onClick={() => navigate("/dashboard/center")}
            className="flex items-center gap-1.5 shrink-0 outline-none"
          >
            <div className="w-5 h-5 min-w-[20px] rounded-md bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
              <span className="text-[8.5px] font-black text-white tracking-widest pl-0.5">SX</span>
            </div>
            <span
              className={`text-[14px] sm:text-[15.5px] font-black tracking-tight whitespace-nowrap ${T.logo}`}
            >
              {lt.s}<span className="text-orange-500">{lt.x}</span>{" "}
              <span className="text-[#138808]">{lt.l}</span>
            </span>

            <div className="shrink-0 ml-0.5 mt-0.5">
              <Flag dark={dark} />
            </div>
          </button>

          {/* Desktop Info */}
          {!isMobile && profile && (
            <div
              className={`hidden lg:flex items-center gap-2.5 pl-4 ml-1 border-l shrink-0 ${T.divider}`}
            >
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${chipColor}`}
              >
                {chipLabel}
              </span>

              {firstName && (
                <span
                  className={`text-xs font-medium truncate max-w-[140px] ${T.muted}`}
                >
                  {firstName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bell */}
          <button
            onClick={() => navigate("/dashboard/alerts")}
            className={`relative w-9 h-9 min-w-[36px] rounded-xl border flex items-center justify-center shrink-0 ${
              notifCount > 0 ? T.notif : T.btn
            }`}
          >
            <Bell />

            {notifCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${
                    dark ? "#0d1117" : "#ffffff"
                  }`,
                }}
              >
                {notifCount > 9 ? "9+" : notifCount}
              </motion.span>
            )}
          </button>

          {/* Avatar */}
          <button
            onClick={() => navigate("/dashboard/profile")}
            className={`w-9 h-9 min-w-[36px] rounded-xl border overflow-hidden shrink-0 ${
              dark
                ? "border-white/10 hover:border-white/20"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={profile?.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {initials}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;