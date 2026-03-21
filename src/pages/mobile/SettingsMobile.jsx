import { useState, useContext, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../lib/firebase-config";
import { doc, updateDoc } from "firebase/firestore";
import {
  updatePassword, EmailAuthProvider,
  reauthenticateWithCredential, deleteUser, updateProfile,
} from "firebase/auth";
import { useAuth } from "../../hooks/useAuth";
import { useTutorial } from "../../hooks/useTutorial";
import { ThemeContext } from "../../context/ThemeContext";
 // useNavigate and useLocation removed
import BottomNav from "../../components/BottomNav";

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: "en", label: "English", native: "English", flag: "🇬🇧" },
  { id: "hi", label: "Hindi",   native: "हिंदी",    flag: "🇮🇳" },
  { id: "te", label: "Telugu",  native: "తెలుగు",   flag: "🇮🇳" },
  { id: "ta", label: "Tamil",   native: "தமிழ்",    flag: "🇮🇳" },
  { id: "kn", label: "Kannada", native: "ಕನ್ನಡ",    flag: "🇮🇳" },
  { id: "mr", label: "Marathi", native: "मराठी",    flag: "🇮🇳" },
];
const INTRO_OPTIONS = [
  { id: "daily",  label: "Once a day",  sub: "Show intro on first login each day" },
  { id: "always", label: "Every login", sub: "Show intro every time you sign in"  },
  { id: "never",  label: "Never",       sub: "Skip intro entirely"                },
];
const DEPTS    = ["CSE","AIDS","AIML","ECE","EEE","MECH","CIVIL"];
const YEARS    = ["1st Year","2nd Year","3rd Year","4th Year"];
const SECTIONS = ["A","B","C","D"];
const CLOUDINARY_CLOUD  = "dzw0mxfzq";
const CLOUDINARY_PRESET = "circular-attachments";

// ─── Theme ────────────────────────────────────────────────────────────────────
const tk = (dark) => ({
  page:      dark ? "bg-[#0a0b0f]"                 : "bg-[#f4f6f9]",
  heading:   dark ? "text-[#f1f3f9]"               : "text-gray-900",
  sub:       dark ? "text-[#94a3b8]"               : "text-gray-500",
  muted:     dark ? "text-slate-500"               : "text-gray-400",
  card:      dark ? "bg-[#11141b] border-white/8"  : "bg-white border-gray-200",
  border:    dark ? "border-white/5"               : "border-gray-100",
  rowHov:    dark ? "active:bg-white/8"            : "active:bg-gray-50",
  iconBg:    dark ? "bg-white/10"                   : "bg-gray-100",
  sLabel:    dark ? "text-slate-600 font-black tracking-widest" : "text-gray-400",
  togOn:     dark ? "bg-blue-500 border-blue-500"  : "bg-orange-500 border-orange-500",
  togOff:    dark ? "bg-white/10 border-white/15"  : "bg-gray-200 border-gray-300",
  // inline card — slightly elevated from page, distinct from row
  inCard:    dark ? "bg-[#161b22] border-white/10" : "bg-orange-50/60 border-orange-200/60",
  overlay:   dark ? "bg-black/80 backdrop-blur-sm" : "bg-black/50",
  drag:      dark ? "bg-white/20"                  : "bg-gray-300",
  input:     dark
    ? "bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-blue-500/60"
    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-400",
  select:    dark
    ? "bg-white/5 border-white/10 text-white"
    : "bg-white border-gray-200 text-gray-900",
  infoVal:   dark ? "text-gray-200"                : "text-gray-700",
  pageBg:    dark ? "#0a0b0f"                      : "#f4f6f9",
  navBg:     dark ? "bg-[#0d1117] border-white/8"  : "bg-white border-gray-200",
  navItem:   dark ? "text-gray-500"                : "text-gray-400",
  navAct:    dark ? "text-blue-500"                : "text-orange-500",
  sheet:     dark ? "bg-[#11141b] border-white/10" : "bg-white border-gray-200",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Ic = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}>{children}</svg>
);

const Toggle = ({ on, onToggle, dark }) => {
  const T = tk(dark);
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      className={`relative rounded-full border transition-colors duration-200 shrink-0 ${on ? T.togOn : T.togOff}`}
      style={{ width: 40, height: 22, minWidth: 40 }}>
      <motion.span className="absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm"
        style={{ width: 18, height: 18 }}
        animate={{ x: on ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }} />
    </button>
  );
};

const SL = ({ children, dark }) => (
  <p className={`text-[10px] font-bold tracking-[1.3px] uppercase mt-6 mb-2 px-1 ${tk(dark).sLabel}`}>
    {children}
  </p>
);

const SR = ({ icon, iconBg, title, sub, right, onClick, dark, noBorder, danger, active }) => {
  const T = tk(dark);
  return (
    <motion.div whileTap={onClick ? { scale: 0.985 } : {}} onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors
        ${noBorder ? "" : `border-b ${T.border}`}
        ${onClick ? `cursor-pointer ${T.rowHov}` : ""}
        ${active ? dark ? "bg-orange-500/5" : "bg-orange-50/40" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg || T.iconBg}`}
        style={{ minWidth: 36 }}>
        <span className={danger ? "text-red-500" : active ? "text-orange-500" : dark ? "text-gray-300" : "text-gray-600"}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? "text-red-500" : active ? "text-orange-500" : T.heading}`}>{title}</p>
        {sub && <p className={`text-xs mt-0.5 ${T.muted}`}>{sub}</p>}
      </div>
      {right && <div className="shrink-0 ml-3">{right}</div>}
    </motion.div>
  );
};

const SelectField = ({ label, value, onChange, options, dark }) => {
  const T = tk(dark);
  return (
    <div>
      <label className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${T.muted}`}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none appearance-none ${T.select}`}
        style={{ fontSize: 15 }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
};

// ─── Inline expanding card ────────────────────────────────────────────────────
// No scroll lock. Just expands in-place inside the section card.
const InlineCard = ({ dark, children }) => {
  const T = tk(dark);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="overflow-hidden"
    >
      <div className={`mx-4 my-3 rounded-2xl border p-4 ${T.inCard}`}>
        {children}
      </div>
    </motion.div>
  );
};

// ─── Inline action buttons ────────────────────────────────────────────────────
const InlineActions = ({ onCancel, onSave, saveLabel = "Save", saving, dark, saveDisabled }) => {
  const T = tk(dark);
  return (
    <div className="flex gap-2 mt-4">
      <button onClick={onCancel}
        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors
          ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
        Cancel
      </button>
      <button onClick={onSave} disabled={saving || saveDisabled}
        className="flex-[2] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm shadow-orange-500/20">
        {saving
          ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
          : saveLabel
        }
      </button>
    </div>
  );
};

// ─── INLINE EDIT PROFILE ──────────────────────────────────────────────────────
const InlineEditProfile = ({ profile, onSave, onCancel, dark }) => {
  const T = tk(dark);
  const [name,    setName]    = useState(profile?.full_name     || "");
  const [dept,    setDept]    = useState(profile?.department    || "CSE");
  const [year,    setYear]    = useState(profile?.year_of_study || "1st Year");
  const [section, setSection] = useState(profile?.section      || "A");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const save = async () => {
    if (!name.trim()) return setError("Name is required");
    setSaving(true); setError("");
    try { await onSave({ full_name: name.trim(), department: dept, year_of_study: year, section }); onCancel(); }
    catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <InlineCard dark={dark} onCancel={onCancel}>
      <p className={`text-xs font-bold mb-3 ${T.heading}`}>Edit Profile</p>
      <div className="space-y-3">
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${T.muted}`}>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your full name" style={{ fontSize: 16 }}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${T.input}`} />
        </div>
        <SelectField label="Department" value={dept} onChange={setDept} dark={dark} options={DEPTS} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Year"    value={year}    onChange={setYear}    dark={dark} options={YEARS}    />
          <SelectField label="Section" value={section} onChange={setSection} dark={dark} options={SECTIONS} />
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <InlineActions onCancel={onCancel} onSave={save} saving={saving} dark={dark} saveLabel="Save Changes" />
    </InlineCard>
  );
};

// ─── INLINE CHANGE PASSWORD ───────────────────────────────────────────────────
const InlinePassword = ({ onCancel, dark }) => {
  const T = tk(dark);
  const [f,      setF]      = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [ok,     setOk]     = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (f.next.length < 6)    return setError("Minimum 6 characters");
    if (f.next !== f.confirm) return setError("Passwords don't match");
    setSaving(true); setError("");
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, f.current));
      await updatePassword(u, f.next);
      setOk(true); setTimeout(onCancel, 1500);
    } catch (e) { setError(e.code === "auth/wrong-password" ? "Wrong current password" : "Update failed."); }
    finally { setSaving(false); }
  };

  return (
    <InlineCard dark={dark} onCancel={onCancel}>
      <p className={`text-xs font-bold mb-3 ${T.heading}`}>Change Password</p>
      {[
        { label: "Current password", k: "current", type: "password" },
        { label: "New password",     k: "next",    type: "password" },
        { label: "Confirm new",      k: "confirm", type: "password" },
      ].map(({ label, k, type }) => (
        <div key={k} className="mb-2.5">
          <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${T.muted}`}>{label}</label>
          <input type={type} value={f[k]} onChange={set(k)} style={{ fontSize: 16 }}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${T.input}`} />
        </div>
      ))}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {ok    && <p className="text-xs text-green-500 mt-1">✓ Password updated!</p>}
      <InlineActions onCancel={onCancel} onSave={save} saving={saving} dark={dark} saveLabel="Update Password" />
    </InlineCard>
  );
};

// ─── INLINE LANGUAGE PICKER ───────────────────────────────────────────────────
const InlineLanguage = ({ current, onSelect, onCancel, dark }) => {
  const T = tk(dark);
  return (
    <InlineCard dark={dark} onCancel={onCancel}>
      <p className={`text-xs font-bold mb-3 ${T.heading}`}>App Language</p>
      <div className="space-y-1.5">
        {LANGUAGES.map((lang) => {
          const sel = current === lang.id;
          return (
            <motion.button key={lang.id} whileTap={{ scale: 0.97 }}
              onClick={() => { onSelect(lang.id); onCancel(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all
                ${sel
                  ? dark ? "bg-orange-500/15 border-orange-500/30" : "bg-orange-100 border-orange-300"
                  : dark ? "bg-white/3 border-white/8 active:bg-white/8" : "bg-white border-gray-200 active:bg-gray-50"
                }`}>
              <span className="text-lg leading-none">{lang.flag}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold leading-tight ${sel ? dark ? "text-orange-400" : "text-orange-600" : T.heading}`}>{lang.label}</p>
                <p className={`text-[10px] ${T.muted}`}>{lang.native}</p>
              </div>
              {sel && (
                <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                  <Ic size={10}><polyline points="20 6 9 17 4 12"/></Ic>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3">
        <button onClick={onCancel}
          className={`w-full py-2.5 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
          Cancel
        </button>
      </div>
    </InlineCard>
  );
};

// ─── INLINE INTRO PICKER ──────────────────────────────────────────────────────
const InlineIntro = ({ current, onSelect, onCancel, dark }) => {
  const T = tk(dark);
  return (
    <InlineCard dark={dark} onCancel={onCancel}>
      <p className={`text-xs font-bold mb-3 ${T.heading}`}>✨ App Intro Frequency</p>
      <div className="space-y-1.5">
        {INTRO_OPTIONS.map((opt) => {
          const sel = current === opt.id;
          return (
            <motion.button key={opt.id} whileTap={{ scale: 0.97 }}
              onClick={() => { onSelect(opt.id); onCancel(); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all
                ${sel
                  ? dark ? "bg-orange-500/15 border-orange-500/30" : "bg-orange-100 border-orange-300"
                  : dark ? "bg-white/3 border-white/8 active:bg-white/8" : "bg-white border-gray-200 active:bg-gray-50"
                }`}>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${sel ? dark ? "text-orange-400" : "text-orange-600" : T.heading}`}>{opt.label}</p>
                <p className={`text-[10px] mt-0.5 ${T.muted}`}>{opt.sub}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${sel ? "bg-orange-500 border-orange-500" : dark ? "border-white/20" : "border-gray-300"}`}>
                {sel && <span className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3">
        <button onClick={onCancel}
          className={`w-full py-2.5 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
          Cancel
        </button>
      </div>
    </InlineCard>
  );
};

// ─── INLINE PHOTO UPLOAD ──────────────────────────────────────────────────────
const InlinePhoto = ({ profile, onUploaded, onCancel, dark }) => {
  const T       = tk(dark);
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(profile?.photoURL || profile?.avatar_url || null);
  const [error,     setError]     = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Max 5MB");
    const reader = new FileReader();
    reader.onload = (r) => setPreview(r.target.result);
    reader.readAsDataURL(file);
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_PRESET);
      form.append("folder", "profile_photos");
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload failed");
      await updateProfile(auth.currentUser, { photoURL: data.secure_url });
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL: data.secure_url, avatar_url: data.secure_url });
      onUploaded?.(data.secure_url);
      onCancel();
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: null });
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL: null, avatar_url: null });
      onUploaded?.(null);
      onCancel();
    } catch { setError("Failed to remove"); }
    finally { setUploading(false); }
  };

  return (
    <InlineCard dark={dark} onCancel={onCancel}>
      <p className={`text-xs font-bold mb-3 ${T.heading}`}>Profile Photo</p>

      {/* Preview thumbnail */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl border-2 border-orange-500 overflow-hidden shrink-0">
          {preview
            ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{(profile?.full_name || "?").charAt(0).toUpperCase()}</span>
              </div>
          }
        </div>
        <div>
          <p className={`text-sm font-medium ${T.heading}`}>{preview ? "Current photo" : "No photo set"}</p>
          <p className={`text-xs ${T.muted}`}>JPG, PNG — max 5MB</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98]">
          {uploading
            ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
            : <Ic size={13}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Ic>
          }
          {uploading ? "Uploading…" : "Upload Photo"}
        </button>
        {preview?.startsWith("http") && (
          <button onClick={handleRemove} disabled={uploading}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50 transition-colors
              ${dark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
            Remove
          </button>
        )}
        <button onClick={onCancel} disabled={uploading}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>
          Cancel
        </button>
      </div>
    </InlineCard>
  );
};

// ─── SIGN OUT modal (destructive — keeps modal) ───────────────────────────────
const SignOutConfirm = ({ onConfirm, onCancel, dark }) => {
  const T = tk(dark);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] ${T.overlay} flex items-center justify-center px-6`}
      onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xs ${T.sheet} border rounded-3xl p-6 text-center shadow-2xl`}>
        <div className="text-4xl mb-3">👋</div>
        <h3 className={`text-base font-bold mb-1 ${T.heading}`}>Sign out?</h3>
        <p className={`text-sm mb-6 ${T.muted}`}>You'll need to sign in again to access Suchna X Link.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm">Sign Out</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── DELETE ACCOUNT modal (destructive — keeps modal) ─────────────────────────
const DeleteModal = ({ onClose, dark }) => {
  const T = tk(dark);
  const [step,        setStep]        = useState(1);
  const [password,    setPassword]    = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState("");
  const WORD     = "circular";
  const isGoogle = auth.currentUser?.providerData?.some((p) => p.providerId === "google.com");

  const del = async () => {
    if (isGoogle && confirmText.toLowerCase() !== WORD) return setError(`Type "${WORD}" to confirm`);
    if (!isGoogle && !password) return setError("Password required");
    setDeleting(true); setError("");
    try {
      const u = auth.currentUser;
      if (!isGoogle) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      await updateDoc(doc(db, "profiles", u.uid), { status: "deleted", deleted_at: new Date() });
      await deleteUser(u);
      window.location.href = "/";
    } catch (e) { setError(e.message || "Failed"); setDeleting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] ${T.overlay} flex items-center justify-center px-6`}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm ${T.sheet} border rounded-3xl p-6 shadow-2xl`}>

        {step === 1 && (
          <>
            <div className="flex flex-col items-center text-center mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-100"}`}>
                <Ic size={26}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Ic>
              </div>
              <h2 className={`text-base font-bold mb-1 ${T.heading}`}>Delete Account</h2>
              <p className={`text-sm leading-relaxed ${T.muted}`}>
                Permanently deletes your account. <span className="text-red-400 font-semibold">Cannot be undone.</span>
              </p>
            </div>
            <div className={`rounded-xl border p-3 mb-4 ${dark ? "bg-red-500/5 border-red-500/15" : "bg-red-50 border-red-100"}`}>
              {["Your profile and account","All circulars and drafts","Your access to Suchna X Link"].map((i) => (
                <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <p className={`text-xs ${dark ? "text-red-300" : "text-red-700"}`}>{i}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className={`flex-1 py-3 rounded-xl border text-sm font-semibold ${dark ? "bg-white/5 border-white/10 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}>Cancel</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(1)} className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                <Ic size={14}><polyline points="15 18 9 12 15 6"/></Ic>
              </button>
              <div>
                <p className={`text-base font-bold ${T.heading}`}>Confirm Deletion</p>
                <p className={`text-xs ${T.muted}`}>{isGoogle ? "Type to confirm" : "Verify your identity"}</p>
              </div>
            </div>
            <div className={`p-3 rounded-xl border mb-3 ${dark ? "bg-[#1a0000] border-red-500/20" : "bg-red-50 border-red-200"}`}>
              {isGoogle ? (
                <>
                  <p className={`text-xs mb-1.5 ${T.muted}`}>
                    Type <span className={`font-mono font-bold px-1 rounded ${dark ? "bg-white/10 text-red-400" : "bg-red-100 text-red-700"}`}>{WORD}</span> to confirm
                  </p>
                  <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={WORD} autoCapitalize="none" style={{ fontSize: 16 }}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${T.input}`} />
                </>
              ) : (
                <>
                  <p className={`text-xs mb-1.5 ${T.muted}`}>Enter your password</p>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password" style={{ fontSize: 16 }}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none ${T.input}`} />
                </>
              )}
            </div>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <button onClick={del} disabled={deleting || (isGoogle ? confirmText.toLowerCase() !== WORD : !password)}
              className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-30 active:scale-[0.98] transition-all">
              {deleting ? "Deleting…" : "🗑 Permanently Delete Account"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const SettingsMobile = () => {
  const { profile, stats, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme }                       = useContext(ThemeContext);
  const { startTutorial } = useTutorial();

  const dark = theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const T = tk(dark);

  const role      = profile?.role || "student";
  const isStudent = role === "student";
  const isGoogle  = auth.currentUser?.providerData?.some((p) => p.providerId === "google.com");

  const [notifications, setNotifications] = useState(true);
  const [language,      setLanguage]      = useState(profile?.greeting_language || "en");
  const [introMode,     setIntroMode]     = useState(profile?.intro_frequency   || "daily");
  const [photoURL,      setPhotoURL]      = useState(profile?.photoURL || profile?.avatar_url || null);

  // active inline panel: null | 'edit' | 'photo' | 'password' | 'language' | 'intro'
  const [active, setActive]   = useState(null);
  // modals (destructive only): null | 'signout' | 'delete'
  const [modal,  setModal]    = useState(null);

  const toggle = (key) => setActive((prev) => prev === key ? null : key);
  const close  = ()    => setActive(null);

  const handleSaveProfile = async (data) => {
    await updateDoc(doc(db, "profiles", auth.currentUser.uid), data);
    await refreshProfile();
  };

  const initials     = profile?.full_name ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "??";
  const roleLabel    = { admin: "System Admin", dept_admin: "Dept Admin", teacher: "Faculty", student: "Student" }[role] || role;
  const currentLang  = LANGUAGES.find((l)    => l.id === language)  || LANGUAGES[0];
  const currentIntro = INTRO_OPTIONS.find((o) => o.id === introMode) || INTRO_OPTIONS[0];
  const chevron      = (open) => (
    <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
      <Ic size={15}><polyline points="9 18 15 12 9 6"/></Ic>
    </motion.span>
  );

  const statItems = [
    { val: stats?.circularsPosted ?? "—", label: "Circulars", col: "text-orange-500" },
    ...(!isStudent ? [{ val: stats?.membersManaged ?? "—", label: "Members", col: "text-green-500" }] : []),
    { val: stats?.totalViews ?? "—", label: "Views", col: "text-blue-500" },
  ];

  const fadeUp = { hidden: { opacity: 0, y: 14 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.055, duration: 0.36, ease: [0.22, 1, 0.36, 1] } }) };
  const stagger = { show: { transition: { staggerChildren: 0.06 } } };

  return (
    <>
      <motion.div initial="hidden" animate="show" variants={stagger}
        className={`min-h-screen pt-20 pb-28 transition-colors duration-300 ${T.page}`}>

        {/* India strip */}
        <motion.div variants={fadeUp}
          className="h-0.5 rounded-full mx-5 mb-5 opacity-50"
          style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)" }} />

        {profile?.status === "skipped" && (
          <motion.div variants={fadeUp} className="mx-5 mb-5 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs font-bold text-orange-500 mb-1">Temporary Access</p>
            <p className="text-[11px] text-orange-500/80">You're in guest mode. Complete your profile to access all features.</p>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="px-5 mb-5">
          <h1 className={`text-2xl font-bold ${T.heading}`}>Settings</h1>
          <p className={`text-xs mt-0.5 ${T.sub}`}>Manage your preferences and account</p>
        </motion.div>

        {/* Profile hero */}
        <motion.div variants={fadeUp} className="mx-5 mb-3">
          <div className={`border rounded-2xl p-4 flex items-center gap-4 ${T.card}`}>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => toggle("photo")} className="relative shrink-0">
              <div className="rounded-[18px] border-2 border-orange-500 p-0.5 shadow-md shadow-orange-500/10"
                style={{ width: 58, height: 58 }}>
                {photoURL
                  ? <img src={photoURL} alt={profile?.full_name} className="w-full h-full rounded-[14px] object-cover" />
                  : <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                      <span className="text-lg font-bold text-white leading-none">{initials}</span>
                    </div>
                }
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${dark ? "bg-[#121212] border-[#121212]" : "bg-white border-white"}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={dark ? "#d1d5db" : "#6b7280"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2" style={{ borderColor: T.pageBg }} />
            </motion.button>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold leading-tight truncate ${T.heading}`}>{profile?.full_name || "—"}</p>
              <p className={`text-xs truncate mt-0.5 ${T.muted}`}>{profile?.email || "—"}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${dark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200"}`}>{roleLabel}</span>
                {profile?.status === "active" && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${dark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200"}`}>Verified ✓</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="flex gap-3 px-5 mb-2">
          {statItems.map(({ val, label, col }) => (
            <div key={label} className={`flex-1 border rounded-2xl p-3.5 ${T.card}`}>
              <p className={`text-xl font-bold mb-0.5 ${col}`}>{val}</p>
              <p className={`text-[11px] ${T.muted}`}>{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ACCOUNT */}
        <motion.div variants={fadeUp} className="px-5">
          <SL dark={dark}>Account</SL>
          <div className={`border rounded-2xl overflow-hidden ${T.card}`}>
            <SR dark={dark}
              icon={<Ic><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ic>}
              title="Edit Profile" sub="Name, branch, year, section"
              right={chevron(active === "edit")} active={active === "edit"}
              onClick={() => toggle("edit")} />
            <AnimatePresence>
              {active === "edit" && (
                <InlineEditProfile key="ep" profile={profile} onSave={handleSaveProfile} onCancel={close} dark={dark} />
              )}
            </AnimatePresence>

            <SR dark={dark}
              icon={<Ic><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Ic>}
              title="Profile Photo" sub="Change or remove your photo"
              right={chevron(active === "photo")} active={active === "photo"}
              onClick={() => toggle("photo")} />
            <AnimatePresence>
              {active === "photo" && (
                <InlinePhoto key="ph" profile={profile} onUploaded={(url) => setPhotoURL(url)} onCancel={close} dark={dark} />
              )}
            </AnimatePresence>

            {!isGoogle && (
              <>
                <SR dark={dark}
                  icon={<Ic><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Ic>}
                  title="Change Password" sub="Update security credentials"
                  right={chevron(active === "password")} active={active === "password"}
                  onClick={() => toggle("password")} noBorder />
                <AnimatePresence>
                  {active === "password" && (
                    <InlinePassword key="pw" onCancel={close} dark={dark} />
                  )}
                </AnimatePresence>
              </>
            )}

            {isGoogle && <div className={`h-px mx-4 ${T.border}`} />}
          </div>
        </motion.div>

        {/* PREFERENCES */}
        <motion.div variants={fadeUp} className="px-5">
          <SL dark={dark}>Preferences</SL>
          <div className={`border rounded-2xl overflow-hidden ${T.card}`}>
            <SR dark={dark}
              icon={dark ? <Ic><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Ic>
                        : <Ic><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></Ic>}
              iconBg={dark ? "bg-indigo-500/10" : "bg-amber-50"}
              title="Dark Mode" sub={dark ? "Currently dark" : "Currently light"}
              right={<Toggle on={dark} onToggle={toggleTheme} dark={dark} />} />

            <SR dark={dark}
              icon={<Ic><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Ic>}
              iconBg={dark ? "bg-blue-500/10" : "bg-blue-50"}
              title="Push Notifications" sub={notifications ? "Receiving alerts" : "Alerts disabled"}
              right={<Toggle on={notifications} onToggle={() => setNotifications((p) => !p)} dark={dark} />} />

            <SR dark={dark}
              icon={<Ic><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Ic>}
              iconBg={dark ? "bg-green-500/10" : "bg-green-50"}
              title="Language" sub={`${currentLang.flag} ${currentLang.label} · ${currentLang.native}`}
              right={chevron(active === "language")} active={active === "language"}
              onClick={() => toggle("language")} />
            <AnimatePresence>
              {active === "language" && (
                <InlineLanguage key="lg" current={language}
                  onSelect={async (l) => {
                    setLanguage(l);
                    try {
                      await updateDoc(doc(db, "profiles", auth.currentUser?.uid), { greeting_language: l });
                      await refreshProfile();
                    } catch (err) {
                      console.error("Failed to update language:", err);
                    }
                  }}
                  onCancel={close} dark={dark} />
              )}
            </AnimatePresence>

            <SR dark={dark}
              icon={<Ic><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ic>}
              iconBg={dark ? "bg-purple-500/10" : "bg-purple-50"}
              title="App Intro" sub={currentIntro.label}
              right={chevron(active === "intro")} active={active === "intro"}
              onClick={() => toggle("intro")} noBorder />
            <AnimatePresence>
              {active === "intro" && (
                <InlineIntro key="in" current={introMode}
                  onSelect={(m) => { setIntroMode(m); updateDoc(doc(db, "profiles", auth.currentUser?.uid), { intro_frequency: m }).catch(() => {}); }}
                  onCancel={close} dark={dark} />
              )}
            </AnimatePresence>

            <SR dark={dark}
              icon={<Ic><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></Ic>}
              iconBg={dark ? "bg-amber-500/10" : "bg-amber-50"}
              title="Replay Tutorial" sub="Walkthrough key features"
              onClick={() => {
                startTutorial();
                // We should navigate to dashboard to show it if needed, 
                // but since Dashboard renders it, we just need to set the state.
                // Redirecting to home just in case they are deep in settings
                window.location.href = "/dashboard";
              }} noBorder />
          </div>
        </motion.div>

        {/* INFO */}
        <motion.div variants={fadeUp} className="px-5">
          <SL dark={dark}>Info</SL>
          <div className={`border rounded-2xl overflow-hidden ${T.card}`}>
            {[
              { label: "Email",      value: profile?.email          || "—" },
              { label: "Role",       value: roleLabel                || "—" },
              { label: "Department", value: profile?.department      || "—" },
              { label: "Year",       value: profile?.year_of_study   || "—" },
              { label: "Section",    value: profile?.section         || "—" },
              { label: "Status",     value: profile?.status          || "—" },
              { label: "Version",    value: "v2.0 · Suchna X Link"        },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? `border-b ${T.border}` : ""}`}>
                <span className={`text-xs ${T.muted}`}>{label}</span>
                <span className={`text-sm font-medium ${T.infoVal}`}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SESSION */}
        <motion.div variants={fadeUp} className="px-5">
          <SL dark={dark}>Session</SL>
          <div className={`border rounded-2xl overflow-hidden ${T.card}`}>
            <SR dark={dark}
              icon={<Ic><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>}
              iconBg={dark ? "bg-red-500/10" : "bg-red-50"}
              title="Sign Out" sub="End current session" danger
              right={<span className="text-red-400"><Ic size={15}><polyline points="9 18 15 12 9 6"/></Ic></span>}
              onClick={() => setModal("signout")} noBorder />
          </div>
        </motion.div>

        {/* DANGER ZONE */}
        <motion.div variants={fadeUp} className="px-5">
          <SL dark={dark}>Danger Zone</SL>
          <div className={`border rounded-2xl overflow-hidden ${dark ? "bg-[#1a0000] border-red-500/20" : "bg-red-50 border-red-200"}`}>
            <div className="px-4 py-3 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${dark ? "bg-red-500/10" : "bg-red-100"}`}>
                <Ic size={16}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-500">Delete Account</p>
                <p className={`text-xs mt-0.5 ${T.muted}`}>Permanently remove all your data.</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => setModal("delete")}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold active:scale-[0.98] transition-colors">
                Delete My Account
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className={`text-center text-[11px] mt-8 px-5 pb-4 ${T.muted}`}>
          <p>Proudly Built for India 🇮🇳</p>
          <p className="mt-0.5">Developed by <span className="text-orange-500 font-semibold">5xL Labs</span> · SuchnaXLink · v2.0</p>
        </motion.div>
      </motion.div>

      <BottomNav />

      {/* Only destructive modals use overlays */}
      <AnimatePresence>
        {modal === "signout" && <SignOutConfirm key="so"  dark={dark} onConfirm={signOut}      onCancel={() => setModal(null)} />}
        {modal === "delete"  && <DeleteModal    key="del" dark={dark} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  );
};

export default SettingsMobile;