import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../../lib/firebase-config";
import {
  collection, getDocs, doc, updateDoc,
  deleteDoc, serverTimestamp, addDoc
} from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { ThemeContext } from "../../context/ThemeContext";
import BottomNav from "../../components/BottomNav";

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES    = ["student", "teacher", "dept_admin", "admin"];
const DEPTS    = ["ALL", "CSE", "AIDS", "AIML", "ECE", "EEE", "MECH", "CIVIL"];
const YEARS    = ["N/A", "1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["N/A", "A", "B", "C"];
const STATUSES = ["pending", "active", "rejected", "suspended"];

const ROLE_META = {
  admin:      { label: "Admin",      color: "orange" },
  dept_admin: { label: "Dept Admin", color: "purple" },
  teacher:    { label: "Faculty",    color: "green"  },
  student:    { label: "Student",    color: "blue"   },
};

const STATUS_META = {
  active:    { label: "Active",    dot: "bg-green-500",  cls: { dark: "bg-green-500/15 text-green-400 border-green-500/20",  light: "bg-green-50 text-green-700 border-green-200"  } },
  pending:   { label: "Pending",   dot: "bg-amber-400",  cls: { dark: "bg-amber-500/15 text-amber-400 border-amber-500/20",  light: "bg-amber-50 text-amber-700 border-amber-200"  } },
  rejected:  { label: "Rejected",  dot: "bg-red-500",    cls: { dark: "bg-red-500/15   text-red-400   border-red-500/20",    light: "bg-red-50   text-red-700   border-red-200"    } },
  suspended: { label: "Suspended", dot: "bg-gray-400",   cls: { dark: "bg-white/8      text-gray-400  border-white/10",      light: "bg-gray-100 text-gray-600  border-gray-200"   } },
};

// ─── Theme ────────────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:      dark ? "bg-[#0d1117]"                    : "bg-[#f4f6f9]",
  heading:   dark ? "text-white"                      : "text-gray-900",
  sub:       dark ? "text-gray-400"                   : "text-gray-500",
  muted:     dark ? "text-gray-500"                   : "text-gray-400",
  card:      dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  cardHov:   dark ? "hover:border-white/15 hover:bg-[#1c2333]" : "hover:border-gray-300 hover:shadow-sm",
  divider:   dark ? "border-white/6"                  : "border-gray-100",
  input:     dark ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-orange-500/50"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400",
  iconBtn:   dark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200",
  sheet:     dark ? "bg-[#161b22] border-white/10"    : "bg-white border-gray-200",
  overlay:   dark ? "bg-black/72"                     : "bg-black/50",
  drag:      dark ? "bg-white/20"                     : "bg-gray-300",
  sLabel:    dark ? "text-gray-600"                   : "text-gray-400",
  chipOff:   dark ? "bg-white/5 border-white/10 text-gray-400"
                  : "bg-gray-100 border-gray-200 text-gray-500",
  infoKey:   dark ? "text-gray-500"                   : "text-gray-400",
  infoVal:   dark ? "text-gray-200"                   : "text-gray-700",
  statBg:    dark ? "bg-[#161b22] border-white/8"     : "bg-white border-gray-200",
  selectBg:  dark ? "bg-white/5 border-white/10 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-900",
  pageBg:    dark ? "#161b22"                         : "#ffffff",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>
    {children}
  </svg>
);

const roleBadge = (role, dark) => {
  const m = ROLE_META[role] || { label: role, color: "gray" };
  const map = {
    orange: dark ? "bg-orange-500/15 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200",
    purple: dark ? "bg-purple-500/15 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-600 border-purple-200",
    green:  dark ? "bg-green-500/15  text-green-400  border-green-500/20"  : "bg-green-50  text-green-600  border-green-200",
    blue:   dark ? "bg-blue-500/15   text-blue-400   border-blue-500/20"   : "bg-blue-50   text-blue-600   border-blue-200",
    gray:   dark ? "bg-white/8       text-gray-400   border-white/10"      : "bg-gray-100  text-gray-600   border-gray-200",
  };
  return { label: m.label, cls: map[m.color] || map.gray };
};

const statusBadge = (status, dark) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return { label: m.label, dot: m.dot, cls: m.cls[dark ? "dark" : "light"] };
};

const fmtDate = (ts) => {
  try {
    const d = ts?.toDate?.() || new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
};

const initials = (name) =>
  name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

const AVATAR_COLORS = [
  "from-orange-500 to-orange-700",
  "from-blue-500 to-blue-700",
  "from-green-500 to-green-700",
  "from-purple-500 to-purple-700",
  "from-red-500 to-red-700",
];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.34, ease: [0.22, 1, 0.36, 1] } }),
};
const _stagger = { show: { transition: { staggerChildren: 0.055 } } };
const springSheet = {
  initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" },
  transition: { type: "spring", damping: 30, stiffness: 320 },
};

// ─── Select field ─────────────────────────────────────────────────────────────
const SelectField = ({ label, value, onChange, options, dark }) => {
  const T = tk(dark);
  return (
    <div>
      <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.sLabel}`}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors appearance-none ${T.selectBg}`}
        style={{ fontSize: 15 }}>
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  );
};

// ─── Edit Member Sheet ────────────────────────────────────────────────────────
const EditMemberSheet = ({ user, onClose, onSave, dark }) => {
  const T = tk(dark);
  const userName = user.full_name || user.name || "Unknown";
  const [form, setForm] = useState({
    full_name:    userName,
    role:         user.role         || "student",
    department:   user.department   || "ALL",
    year_of_study: user.year_of_study || "N/A",
    section:      user.section      || "N/A",
    status:       user.status       || "pending",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await onSave(user.id, form); onClose(); }
    catch { setSaving(false); }
  };

  const rb = roleBadge(form.role, dark);
  const sb = statusBadge(form.status, dark);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-end justify-center`}
      onClick={onClose}>
      <motion.div {...springSheet} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl flex flex-col`}
        style={{ maxHeight: "92vh", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-3 shrink-0 ${T.drag}`} />

        {/* Header */}
        <div className={`flex items-center gap-3 px-5 pb-4 border-b shrink-0 ${T.divider}`}>
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(userName)} flex items-center justify-center shrink-0`}>
            <span className="text-sm font-bold text-white">{initials(userName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${T.heading}`}>{userName}</p>
            <p className={`text-xs truncate ${T.muted}`}>{user.email}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rb.cls}`}>{rb.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sb.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />{sb.label}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Section: Institutional */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ic size={13}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${T.sLabel}`}>Institutional Mapping</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <SelectField label="Privilege Level" value={form.role}
                  onChange={set("role")} dark={dark}
                  options={ROLES.map((r) => ({ value: r, label: ROLE_META[r]?.label || r }))} />
              </div>
              <SelectField label="Department Hub" value={form.department}
                onChange={set("department")} dark={dark} options={DEPTS} />
              <SelectField label="Year" value={form.year_of_study}
                onChange={set("year_of_study")} dark={dark} options={YEARS} />
              <div className="col-span-2">
                <SelectField label="Section" value={form.section}
                  onChange={set("section")} dark={dark} options={SECTIONS} />
              </div>
            </div>
          </div>

          {/* Section: Personal */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ic size={13}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ic>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${T.sLabel}`}>Personal Registry Details</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.sLabel}`}>Full Name</label>
                <input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors ${T.input}`}
                  style={{ fontSize: 15 }} />
              </div>
              <SelectField label="Access Status" value={form.status}
                onChange={set("status")} dark={dark}
                options={STATUSES.map((s) => ({ value: s, label: STATUS_META[s]?.label || s }))} />
            </div>
          </div>

          {/* Info row */}
          <div className={`border rounded-xl p-3 ${dark ? "bg-white/3 border-white/6" : "bg-gray-50 border-gray-100"}`}>
            <div className="grid grid-cols-2 gap-y-2">
              {[
                { k: "Joined",  v: fmtDate(user.created_at) },
                { k: "Email",   v: user.email || "—"         },
              ].map(({ k, v }) => (
                <div key={k}>
                  <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${T.infoKey}`}>{k}</p>
                  <p className={`text-xs font-medium truncate ${T.infoVal}`}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`px-5 py-4 border-t shrink-0 ${T.divider}`}>
          {/* Suspend / Activate quick toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => set("status")(form.status === "suspended" ? "active" : "suspended")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-colors
                ${form.status === "suspended"
                  ? dark ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-600"
                  : dark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
                }`}>
              <Ic size={13}>{form.status === "suspended"
                ? <><path d="M5 13l4 4L19 7"/></>
                : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
              }</Ic>
              {form.status === "suspended" ? "Restore Access" : "Suspend Access"}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className={`px-5 py-3 rounded-xl border text-sm font-semibold transition-colors ${T.iconBtn}`}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98]">
              {saving ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
              ) : (
                <Ic size={14}><polyline points="20 6 9 17 4 12"/></Ic>
              )}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Add Member Sheet ─────────────────────────────────────────────────────────
const AddMemberSheet = ({ onClose, onAdd, dark }) => {
  const T = tk(dark);
  const [step,    setStep]    = useState(1); // 1=email+method, 2=details
  const [method,  setMethod]  = useState("invite");
  const [email,   setEmail]   = useState("");
  const [form,    setForm]    = useState({ name: "", role: "student", department: "CSE", year_of_study: "1st Year", section: "A" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (!email.trim() || !email.includes("@")) return setError("Enter a valid email");
    setError("");
    if (method === "invite") { handleInvite(); } else { setStep(2); }
  };

  const handleInvite = async () => {
    setLoading(true);
    try {
      // Create a pre-approval record
      await addDoc(collection(db, "profile_pre_approvals"), {
        email:      email.trim(),
        invited_by: auth.currentUser?.uid,
        invited_at: serverTimestamp(),
        status:     "pending",
      });
      onAdd?.();
      onClose();
    } catch { setError("Failed to send invite. Try again."); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "profile_pre_approvals"), {
        email:      email.trim(),
        ...form,
        invited_by: auth.currentUser?.uid,
        invited_at: serverTimestamp(),
        status:     "pre_approved",
      });
      onAdd?.();
      onClose();
    } catch { setError("Failed to create. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 ${T.overlay} flex items-end justify-center`}
      onClick={onClose}>
      <motion.div {...springSheet} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${T.sheet} border rounded-t-3xl flex flex-col`}
        style={{ maxHeight: "90vh", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-3 shrink-0 ${T.drag}`} />

        {/* Step indicator */}
        <div className="px-5 mb-4 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            {step === 2 && (
              <button onClick={() => setStep(1)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                <Ic size={13}><polyline points="15 18 9 12 15 6"/></Ic>
              </button>
            )}
            <div>
              <h2 className={`text-base font-bold ${T.heading}`}>Add Member</h2>
              <p className={`text-xs ${T.muted}`}>Step {step} of {method === "instant" ? 2 : 1}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors duration-300
                ${s <= step ? "bg-orange-500" : dark ? "bg-white/10" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div>
                <p className={`text-xs font-semibold mb-3 ${T.heading}`}>
                  <span className={dark ? "text-blue-400" : "text-blue-600"}>📧 1.</span> Member Email
                </p>
                <p className={`text-xs mb-4 ${T.muted}`}>Choose how to onboard and enter their institutional email.</p>

                {/* Method selector */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: "invite",  icon: <Ic size={18}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Ic>, label: "Invite Link",       sub: "Send email invite" },
                    { id: "instant", icon: <Ic size={18}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ic>,                                                                                                                                    label: "Instant Account", sub: "Create right now" },
                  ].map(({ id, icon, label, sub }) => (
                    <button key={id} onClick={() => setMethod(id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all
                        ${method === id
                          ? dark ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-orange-50 border-orange-400 text-orange-600"
                          : dark ? "bg-white/3 border-white/8 text-gray-400 hover:bg-white/6" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                        }`}>
                      {icon}
                      <div className="text-center">
                        <p className="text-xs font-bold">{label}</p>
                        <p className={`text-[10px] ${T.muted}`}>{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.sLabel}`}>Email Address</label>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="name@college.edu"
                  type="email" style={{ fontSize: 16 }}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${T.input}`} />
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              </div>
            </>
          )}

          {/* Step 2 — Instant account details */}
          {step === 2 && (
            <>
              <p className={`text-xs font-semibold ${T.heading}`}>
                <span className={dark ? "text-blue-400" : "text-blue-600"}>👤 2.</span> Member Details
              </p>
              <div className="space-y-3">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.sLabel}`}>Full Name</label>
                  <input value={form.name} onChange={(e) => set("name")(e.target.value)}
                    placeholder="Full name" style={{ fontSize: 16 }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${T.input}`} />
                </div>
                <SelectField label="Role" value={form.role} onChange={set("role")} dark={dark}
                  options={ROLES.map((r) => ({ value: r, label: ROLE_META[r]?.label || r }))} />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Department" value={form.department} onChange={set("department")} dark={dark} options={DEPTS.filter((d) => d !== "ALL")} />
                  <SelectField label="Year" value={form.year_of_study} onChange={set("year_of_study")} dark={dark} options={YEARS.filter((y) => y !== "N/A")} />
                </div>
                <SelectField label="Section" value={form.section} onChange={set("section")} dark={dark} options={SECTIONS.filter((s) => s !== "N/A")} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t shrink-0 ${T.divider}`}>
          <button
            onClick={step === 1 ? (method === "instant" ? () => next() : () => next()) : handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all disabled:opacity-50 active:scale-[0.98]">
            {loading ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
            ) : step === 1 ? (
              method === "invite" ? "Send Invite →" : "Next: Member Details →"
            ) : (
              "Create Account ✓"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Member card ──────────────────────────────────────────────────────────────
const MemberCard = ({ user, dark, onEdit, onDelete, index }) => {
  const T  = tk(dark);
  const userName = user.full_name || user.name || "Unknown";
  const rb = roleBadge(user.role, dark);
  const sb = statusBadge(user.status, dark);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
      transition={{ delay: index * 0.02 }}
      className={`border rounded-2xl p-4 transition-all duration-200 cursor-pointer ${T.card} ${T.cardHov}`}
      onClick={() => onEdit(user)}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(userName)} flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-sm font-bold text-white">{initials(userName)}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className={`text-sm font-semibold truncate ${T.heading}`}>{userName}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${sb.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />{sb.label}
            </span>
          </div>
          <p className={`text-xs truncate mb-2 ${T.muted}`}>{user.email || "—"}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${rb.cls}`}>{rb.label}</span>
            {user.department && user.department !== "ALL" && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {user.department}
              </span>
            )}
            {user.year_of_study && user.year_of_study !== "N/A" && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {user.year_of_study}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(user); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0
            ${dark ? "text-gray-600 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}
          aria-label="Delete member">
          <Ic size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
        </button>
      </div>
    </motion.div>
  );
};

// ─── Delete Confirm ───────────────────────────────────────────────────────────
const DeleteConfirm = ({ user, onConfirm, onCancel, dark }) => {
  const T = tk(dark);
  const userName = user?.full_name || user?.name || "Member";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] ${T.overlay} flex items-center justify-center px-6`}
      onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xs ${T.sheet} border rounded-3xl p-6 text-center shadow-2xl`}>
        <div className={`w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4`}>
          <Ic size={24}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></Ic>
        </div>
        <h3 className={`text-base font-bold mb-1 ${T.heading}`}>Remove {userName.split(" ")[0]}?</h3>
        <p className={`text-sm mb-5 ${T.muted}`}>This will remove their access to Suchna X Link.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${T.iconBtn}`}>Cancel</button>
          <button onClick={() => onConfirm(user)}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">Remove</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ dark }) => (
  <div className={`border rounded-2xl p-4 ${dark ? "bg-[#161b22] border-white/8" : "bg-white border-gray-200"}`}>
    <div className="flex gap-3">
      <div className={`w-11 h-11 rounded-xl shrink-0 animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3.5 w-28 rounded-lg animate-pulse ${dark ? "bg-white/8" : "bg-gray-100"}`} />
        <div className={`h-3 w-40 rounded-lg animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
        <div className="flex gap-2">
          <div className={`h-5 w-14 rounded-full animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
          <div className={`h-5 w-10 rounded-full animate-pulse ${dark ? "bg-white/5" : "bg-gray-50"}`} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ManageUsersMobile = () => {
  const { profile: _profile, stats } = useAuth();
  const { theme }        = useContext(ThemeContext);
  const dark             = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const T                = tk(dark);

  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, "profiles"));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch { showToast("Failed to load members", "error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (id, data) => {
    await updateDoc(doc(db, "profiles", id), { ...data, updated_at: serverTimestamp() });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data } : u));
    showToast("Member updated ✓");
  };

  const handleDelete = async (user) => {
    await deleteDoc(doc(db, "profiles", user.id));
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setDeleting(null);
    showToast(`${(user.full_name || user.name || "Member").split(" ")[0]} removed`);
  };

  const filtered = useMemo(() => {
    let list = [...users];

    // 1. Apply status/role filters from chips
    if (filter !== "all") {
      list = list.filter((u) => u.status === filter || u.role === filter);
    }

    // 2. Apply "Smart" Search
    const term = search.trim().toLowerCase();
    if (term) {
      const tokens = term.split(/\s+/).filter(Boolean);
      list = list.filter((u) => {
        const docStr = [
          u.full_name,
          u.name,
          u.email,
          u.department,
          u.role,
          u.status,
          u.year_of_study
        ].filter(Boolean).join(" ").toLowerCase();

        // Must match ALL tokens for "AND" behavior (smarter search)
        return tokens.every((tok) => docStr.includes(tok));
      });

      // 3. Optional: Sort by relevance (e.g., name starts with term)
      list.sort((a, b) => {
        const aName = (a.full_name || a.name || "").toLowerCase();
        const bName = (b.full_name || b.name || "").toLowerCase();
        const aStarts = aName.startsWith(term);
        const bStarts = bName.startsWith(term);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        return 0;
      });
    }

    return list;
  }, [users, filter, search]);

  const total   = users.length;
  const active  = users.filter((u) => u.status === "active").length;
  const pending = users.filter((u) => u.status === "pending").length;

  const FILTERS = [
    { id: "all",     label: `All (${total})`         },
    { id: "active",  label: `Active (${active})`     },
    { id: "pending", label: `Pending (${pending})`   },
    { id: "teacher", label: "Faculty"                },
    { id: "student", label: "Students"               },
  ];

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          show: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
        className={`min-h-screen px-5 pt-20 pb-24 transition-colors duration-300 ${T.page}`}>

        {/* India strip */}
        <motion.div variants={fadeUp}
          className="h-0.5 rounded-full mb-4 opacity-50"
          style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

        {/* ── Header ── */}
        <motion.div variants={fadeUp} className="mb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-1
                ${dark ? "text-blue-400" : "text-blue-600"}`}>
                <Ic size={11}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ic>
                Members Registry
              </div>
              <h1 className={`text-2xl font-bold ${T.heading}`}>Member Directory</h1>
              <p className={`text-xs mt-0.5 ${T.sub}`}>Manage access, roles, and profiles</p>
            </div>
            {/* Refresh */}
            <button onClick={() => fetchUsers(true)} disabled={refreshing}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${T.iconBtn}`}>
              <motion.span
                animate={{ rotate: refreshing ? 360 : 0 }}
                transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}>
                <Ic size={16}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></Ic>
              </motion.span>
            </button>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        {!loading && (
          <motion.div variants={fadeUp} className="flex gap-3 mb-4">
            {[
              { val: total,   label: "Total",   col: dark ? "text-white"       : "text-gray-900" },
              { val: active,  label: "Active",  col: "text-green-500"                            },
              { val: pending, label: "Pending", col: "text-amber-500"                            },
            ].map(({ val, label, col }) => (
              <div key={label} className={`flex-1 border rounded-2xl p-3.5 ${T.statBg}`}>
                <p className={`text-xl font-bold mb-0.5 ${col}`}>{val}</p>
                <p className={`text-[11px] ${T.muted}`}>{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Add member button ── */}
        <motion.div variants={fadeUp} className="mb-4">
          <button onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-md shadow-orange-500/20 active:scale-[0.98]">
            <Ic size={16}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></Ic>
            Add Member
          </button>
        </motion.div>

        {/* ── Search ── */}
        <motion.div variants={fadeUp} className="mb-3">
          <div className={`flex items-center gap-2.5 border rounded-2xl px-4 py-3 transition-colors ${T.card}`}>
            <Ic size={15}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ic>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role…"
              className={`flex-1 bg-transparent outline-none text-sm ${dark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`}
              style={{ fontSize: 16 }} />
            <AnimatePresence>
              {search && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  onClick={() => setSearch("")}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${dark ? "bg-white/10 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                  ×
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Filter chips ── */}
        {!loading && (
          <motion.div variants={fadeUp}
            className="flex gap-2 mb-4 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}>
            {FILTERS.map(({ id, label }) => (
              <motion.button key={id} whileTap={{ scale: 0.93 }}
                onClick={() => setFilter(id)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap
                  ${filter === id ? "bg-orange-500 border-orange-500 text-white" : T.chipOff}`}>
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── Results label ── */}
        {!loading && (
          <motion.p variants={fadeUp} className={`text-[10px] font-bold tracking-[1.2px] uppercase px-1 mb-3 ${T.muted}`}>
            {search ? `Results for "${search}" · ${filtered.length}` : `${FILTERS.find((f) => f.id === filter)?.label || "All"} · ${filtered.length}`}
          </motion.p>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} dark={dark} />)}</div>
        ) : filtered.length === 0 ? (
          <motion.div variants={fadeUp}
            className={`flex flex-col items-center py-14 border rounded-2xl ${T.card}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
              <Ic size={24}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></Ic>
            </div>
            <p className={`text-sm font-semibold mb-1 ${T.heading}`}>No members found</p>
            <p className={`text-xs mb-4 ${T.muted}`}>{search ? "Try a different search term" : "Add your first member"}</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="px-6 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20 active:scale-95 transition-all">
                Clear Search
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((user, i) => (
                <MemberCard key={user.id} user={user} dark={dark} index={i}
                  onEdit={setEditing} onDelete={setDeleting} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Bottom Navigation ── */}
        <BottomNav notifCount={stats?.pendingApprovals || 0} />
      </motion.div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5
              px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium whitespace-nowrap
              ${dark ? "bg-[#1c2333] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <span className={toast.type === "success" ? "text-green-500" : "text-red-400"}>
              {toast.type === "success" ? "✓" : "✕"}
            </span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sheets ── */}
      <AnimatePresence>
        {editing && (
          <EditMemberSheet key="edit" user={editing} dark={dark}
            onClose={() => setEditing(null)} onSave={handleSave} />
        )}
        {showAdd && (
          <AddMemberSheet key="add" dark={dark}
            onClose={() => setShowAdd(false)} onAdd={() => fetchUsers(true)} />
        )}
        {deleting && (
          <DeleteConfirm key="del" user={deleting} dark={dark}
            onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default ManageUsersMobile;
