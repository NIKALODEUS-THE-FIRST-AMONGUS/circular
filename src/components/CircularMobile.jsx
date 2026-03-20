/**
 * CircularMobile.jsx
 * Unified circular components optimized for mobile
 * Combines CircularCard, AdvancedFilters, useCircularFilters, and CircularSearchBar
 */
import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";

// ─────────────────────────────────────────────────────────────────────────────
// UI Tokens & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const tkCard = (dark) => ({
  card:       dark ? "bg-[#161b22] border-white/8"   : "bg-white border-gray-200",
  cardHover:  dark ? "hover:border-white/15 hover:bg-[#1c2333]" : "hover:border-gray-300 hover:shadow-sm",
  title:      dark ? "text-white"                    : "text-gray-900",
  body:       dark ? "text-gray-400"                 : "text-gray-500",
  meta:       dark ? "text-gray-500"                 : "text-gray-400",
  divider:    dark ? "border-white/5"                : "border-gray-100",
  attachBg:   dark ? "bg-white/5 border-white/8"     : "bg-gray-50 border-gray-200",
  attachText: dark ? "text-gray-300"                 : "text-gray-600",
  actionBtn:  dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                   : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  expandBtn:  dark ? "text-orange-400 hover:text-orange-300"
                   : "text-orange-500 hover:text-orange-600",
});

const tkSearch = (dark) => ({
  bar:       dark ? "bg-[#161b22] border-white/8"   : "bg-white border-gray-200",
  input:     dark ? "text-white placeholder-gray-500" : "text-gray-800 placeholder-gray-400",
  icon:      dark ? "text-gray-500"   : "text-gray-400",
  filterBtn: dark
    ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100",
  filterActive: dark
    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
    : "bg-orange-50 border-orange-300 text-orange-600",
  resetBtn:  dark
    ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100",
});

const PRIORITY = {
  urgent:    { label: "URGENT",    bg: "bg-red-500",    text: "text-white"       },
  important: { label: "IMPORTANT", bg: "bg-orange-500", text: "text-white"       },
  normal:    { label: "NORMAL",    bg: "bg-blue-500/15 border border-blue-500/30", text: "text-blue-400" },
};

const AttachIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CircularCard
// ─────────────────────────────────────────────────────────────────────────────

export const CircularCard = ({ circular, onView, onEdit, onDelete, dark: darkProp }) => {
  const { theme } = useContext(ThemeContext);
  const { isStudent } = useAuth();
  const dark = darkProp ?? (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const T = tkCard(dark);
  const [expanded, setExpanded] = useState(false);

  const priority = PRIORITY[circular.priority] || PRIORITY.normal;
  const isUrgent = circular.priority === "urgent";

  // Format date
  const date = circular.created_at?.toDate?.() || new Date(circular.created_at);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  // Truncate content for preview
  const PREVIEW_LEN = 100;
  const hasMore = circular.content?.length > PREVIEW_LEN;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer
        ${T.card} ${T.cardHover}`}
      onClick={() => onView?.(circular)}
    >
      {/* Urgent left accent bar */}
      {isUrgent && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500 rounded-l-2xl" />
      )}

      <div className="p-4" style={{ paddingLeft: isUrgent ? "18px" : undefined }}>

        {/* ── Row 1: Priority + Target + Date ── */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
          <span className={`text-[11px] font-medium ${T.meta}`}>
            TO: {circular.department_target?.toUpperCase() || "ALL"}
            {circular.target_year ? ` · ${circular.target_year}` : ""}
            {circular.target_section ? ` · SEC ${circular.target_section.toUpperCase()}` : ""}
          </span>
          <span className={`ml-auto text-[11px] shrink-0 ${T.meta}`}>{dateStr}</span>
        </div>

        {/* ── Row 2: Title ── */}
        <h3 className={`text-sm font-semibold leading-snug mb-1.5 ${T.title}`}
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {circular.title}
        </h3>

        {/* ── Row 3: Content preview ── */}
        <AnimatePresence initial={false}>
          <motion.p
            className={`text-xs leading-relaxed ${T.body}`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: expanded ? 999 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {circular.content}
          </motion.p>
        </AnimatePresence>

        {/* Expand/collapse */}
        {hasMore && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
            className={`text-[11px] font-semibold mt-1 ${T.expandBtn}`}
          >
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        )}

        {/* ── Row 4: Attachments (if any) ── */}
        {circular.attachments?.length > 0 && (
          <div className="mt-3.5 space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Image Preview Thumbnail */}
            {circular.attachments.find(a => a.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)) && (
              <div className="w-full h-32 rounded-xl overflow-hidden border border-white/5 relative bg-black/10">
                <img 
                  src={circular.attachments.find(a => a.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.name)).url} 
                  alt="attachment" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            )}
            
            {/* Attachment Bar */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${T.attachBg} ${T.attachText}`}>
              <AttachIcon />
              <span className="font-medium truncate flex-1">{circular.attachments[0].name}</span>
              <span className={`shrink-0 ${T.meta}`}>
                {circular.attachments[0].type?.toUpperCase()?.split("/")[1] || "DOC"}
                {circular.attachments[0].size
                  ? ` · ${(circular.attachments[0].size / 1024).toFixed(0)}KB`
                  : ""}
              </span>
              {circular.attachments.length > 1 && (
                <span className={`shrink-0 font-semibold ${T.meta}`}>
                  +{circular.attachments.length - 1}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Row 5: Footer ── */}
        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${T.divider}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-orange-500">
                {circular.author_name?.charAt(0) || "?"}
              </span>
            </div>
            <span className={`text-[11px] ${T.meta}`}>
              {circular.author_name}
            </span>
          </div>

          {/* View count + actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!isStudent && (
              <span className={`text-[11px] mr-2 flex items-center gap-1 ${T.meta}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {circular.view_count || 0}
              </span>
            )}
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit?.(circular); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${T.actionBtn}`}
                aria-label="Edit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete?.(circular); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${T.actionBtn} hover:text-red-400`}
                aria-label="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdvancedFilters
// ─────────────────────────────────────────────────────────────────────────────

const YEARS    = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const BRANCHES = ["CSE", "AIML", "AIDS", "EEE", "ECE", "MECH", "CIVIL"];
const SECTIONS = ["A", "B", "C"];
const PRIORITY_OPTS = ["All", "Urgent", "Important", "Normal"];
const SORT_OPTS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Most viewed",  value: "views"  },
];

const Chip = ({ label, active, onClick, dark, color = "orange" }) => {
  const colors = {
    orange: active
      ? "bg-orange-500 text-white border-orange-500"
      : dark
        ? "bg-white/5 text-gray-400 border-white/10 hover:border-orange-500/40 hover:text-orange-400"
        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500",
    red: active
      ? "bg-red-500 text-white border-red-500"
      : dark
        ? "bg-white/5 text-gray-400 border-white/10 hover:border-red-500/40 hover:text-red-400"
        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-500",
  };
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-150 whitespace-nowrap ${colors[color]}`}
    >
      {label}
    </button>
  );
};

const FilterSection = ({ title, children, dark }) => (
  <div className="mb-4">
    <p className={`text-[10px] font-bold tracking-widest uppercase mb-2
      ${dark ? "text-gray-500" : "text-gray-400"}`}>
      {title}
    </p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const AdvancedFilters = ({ filters, onChange, onReset, dark: darkProp, isStudent = false }) => {
  const { darkMode } = useContext(ThemeContext);
  const dark = darkProp ?? darkMode;

  const toggle = (key, value) => {
    onChange({
      ...filters,
      [key]: filters[key] === value ? null : value,
    });
  };

  const hasFilters = Object.values(filters).some((v) => v !== null && v !== "All");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className={`rounded-2xl border p-4 mt-2
        ${dark ? "bg-[#161b22] border-white/8" : "bg-white border-gray-200"}`}>

        {/* Year */}
        <FilterSection title="Year" dark={dark}>
          {YEARS.map((y) => (
            <Chip key={y} label={y} dark={dark}
              active={filters.year === y}
              onClick={() => toggle("year", y)} />
          ))}
        </FilterSection>

        {/* Branch */}
        <FilterSection title="Branch" dark={dark}>
          {BRANCHES.map((b) => (
            <Chip key={b} label={b} dark={dark}
              active={filters.branch === b}
              onClick={() => toggle("branch", b)} />
          ))}
        </FilterSection>

        {/* Section */}
        <FilterSection title="Section" dark={dark}>
          {SECTIONS.map((s) => (
            <Chip key={s} label={`Section ${s}`} dark={dark}
              active={filters.section === s}
              onClick={() => toggle("section", s)} />
          ))}
        </FilterSection>

        {/* Priority */}
        <FilterSection title="Priority" dark={dark}>
          {PRIORITY_OPTS.map((p) => (
            <Chip key={p} label={p} dark={dark}
              color={p === "Urgent" ? "red" : "orange"}
              active={filters.priority === p}
              onClick={() => toggle("priority", p)} />
          ))}
        </FilterSection>

        {/* Sort */}
        <FilterSection title="Sort By" dark={dark}>
          {SORT_OPTS.filter(opt => !isStudent || opt.value !== "views").map(({ label, value }) => (
            <Chip key={value} label={label} dark={dark}
              active={filters.sort === value}
              onClick={() => toggle("sort", value)} />
          ))}
        </FilterSection>

        {/* Active filter summary + reset */}
        <div className={`flex items-center justify-between pt-3 border-t
          ${dark ? "border-white/5" : "border-gray-100"}`}>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(filters).map(([key, val]) =>
              val && val !== "All" ? (
                <span key={key}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                    ${dark ? "bg-orange-500/15 text-orange-400" : "bg-orange-50 text-orange-600"}`}>
                  {val}
                  <button onClick={() => onChange({ ...filters, [key]: null })}
                    className="ml-1 opacity-60 hover:opacity-100">×</button>
                </span>
              ) : null
            )}
            {!hasFilters && (
              <span className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
                No filters applied
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={onReset}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors
                ${dark
                  ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}>
              Reset all
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// useCircularFilters Hook
// ─────────────────────────────────────────────────────────────────────────────

// Hook moved to ../hooks/useCircularFilters.js

// ─────────────────────────────────────────────────────────────────────────────
// CircularSearchBar
// ─────────────────────────────────────────────────────────────────────────────

export const CircularSearchBar = ({
  query,
  onQueryChange,
  showFilters,
  onToggleFilters,
  filters,
  onFiltersChange,
  onFiltersReset,
  activeFilterCount = 0,
  onClearSearch,
}) => {
  const { theme } = useContext(ThemeContext);
  const { isStudent } = useAuth();
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const T = tkSearch(dark);

  return (
    <div className="mb-3">
      {/* Search row */}
      <div className="flex gap-2">
        {/* Search input */}
        <div className={`flex-1 flex items-center gap-2.5 border rounded-2xl px-4 py-3 transition-colors ${T.bar}`}>
          <svg className={T.icon} width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search broadcasts, topics…"
            className={`flex-1 bg-transparent outline-none text-sm ${T.input}`}
            style={{ fontSize: 16 }}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={onClearSearch}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${T.icon}`}
              >
                ×
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filter toggle */}
        <button
          onClick={onToggleFilters}
          className={`relative flex items-center gap-2 px-3.5 py-3 border rounded-2xl text-sm font-medium transition-all
            ${showFilters || activeFilterCount > 0 ? T.filterActive : T.filterBtn}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          <span className="hidden xs:block">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Reset — only shown when filters active */}
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.button
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              onClick={onFiltersReset}
              className={`flex items-center px-3 border rounded-2xl text-sm transition-all overflow-hidden whitespace-nowrap ${T.resetBtn}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.49"/>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {showFilters && (
          <AdvancedFilters
            filters={filters}
            onChange={onFiltersChange}
            onReset={onFiltersReset}
            dark={dark}
            isStudent={isStudent}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
