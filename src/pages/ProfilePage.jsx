import { useState, useRef, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../lib/firebase-config";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../context/ThemeContext";

const LANGUAGES = [
  { id: "en",    label: "English",    native: "English",    flag: "🇬🇧" },
  { id: "hi",    label: "Hindi",      native: "हिंदी",        flag: "🇮🇳" },
  { id: "te",    label: "Telugu",     native: "తెలుగు",       flag: "🇮🇳" },
  { id: "ta",    label: "Tamil",      native: "தமிழ்",        flag: "🇮🇳" },
  { id: "kn",    label: "Kannada",    native: "ಕನ್ನಡ",        flag: "🇮🇳" },
];

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
const uploadToCloudinary = async (file, onProgress) => {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file",           file);
    formData.append("upload_preset",  uploadPreset);
    formData.append("folder",         "suchna_x/avatars");
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 70));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      data.secure_url ? resolve(data.secure_url) : reject(new Error("Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);
  });
};

// ─── Theme token map — single source of truth for both modes ─────────────────
const t = (dark) => ({
  page:      dark ? "bg-black"                               : "bg-white",
  card:      dark ? "bg-[#121212] border-white/8"            : "bg-white border-gray-200",
  cardInner: dark ? "bg-white/5  border-white/8"             : "bg-gray-100 border-gray-200",
  input:     dark ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-red-500/60"
                  : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-red-500",
  sheet:     dark ? "bg-[#121212] border-white/10"           : "bg-white border-gray-200",
  divider:   dark ? "divide-white/5"                         : "divide-gray-100",
  rowBorder: dark ? "border-white/5"                         : "border-gray-100",
  primary:   dark ? "text-gray-100"                          : "text-gray-900",
  secondary: dark ? "text-gray-400"                          : "text-gray-500",
  muted:     dark ? "text-gray-600"                          : "text-gray-400",
  danger:    dark ? "bg-red-500/6 border-red-500/15"         : "bg-red-50 border-red-200",
  iconBg:    dark ? "bg-white/5 border-white/8"              : "bg-gray-100 border-gray-200",
  avatarBorder: dark ? "border-[#0d1117]"                    : "border-white",
  strip:     "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)",
});

// ─── Variants ─────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:  (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.065, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Micro components ─────────────────────────────────────────────────────────
const Badge = ({ children, color = "red" }) => {
  const map = {
    red:    "bg-red-500/10 text-red-500 border-red-500/25",
    green:  "bg-green-500/10  text-green-500  border-green-500/25",
    blue:   "bg-blue-500/10   text-blue-500   border-blue-500/25",
    muted:  "bg-gray-500/10   text-gray-400   border-gray-400/20",
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${map[color] || map.muted}`}>
      {children}
    </span>
  );
};

const Toggle = ({ on, onToggle }) => (
  <button onClick={onToggle} role="switch" aria-checked={on}
    className={`relative w-11 h-6 rounded-full border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-red-500/40
      ${on ? "bg-red-500 border-red-500" : "bg-gray-200 border-gray-300"}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? "translate-x-5" : ""}`} />
  </button>
);

const SectionLabel = ({ children, theme }) => (
  <p className={`text-[11px] font-bold tracking-widest uppercase ${theme.muted} mt-6 mb-2.5`}>{children}</p>
);

const SettingRow = ({ icon, title, subtitle, right, onClick, theme }) => (
  <motion.div variants={fadeUp} onClick={onClick}
    className={`flex items-center justify-between py-3.5 border-b ${theme.rowBorder} ${onClick ? "cursor-pointer active:opacity-60" : ""}`}>
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl border ${theme.iconBg} flex items-center justify-center text-[15px] shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${theme.primary} truncate`}>{title}</p>
        {subtitle && <p className={`text-xs ${theme.secondary} mt-0.5 truncate`}>{subtitle}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{right}</div>
  </motion.div>
);

const UploadProgress = ({ progress }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed top-0 left-0 right-0 z-[70] h-1 bg-gray-200/50">
    <motion.div className="h-full bg-red-500 rounded-full"
      initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.25 }} />
  </motion.div>
);

// ─── Full-screen Photo Viewer ─────────────────────────────────────────────────
const PhotoViewer = ({ url, name, onClose, onRemove, onChangePhoto }) => {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex flex-col select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white text-xl">
          ←
        </button>
        <p className="text-white font-semibold text-sm truncate max-w-[55%]">{name}</p>
        <button onClick={() => setConfirmRemove(true)}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white text-base">
          🗑
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center">
        <motion.img
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ type: "spring", damping: 22, stiffness: 250 }}
          src={url} alt={name}
          className="max-w-full object-contain rounded-2xl"
          style={{ maxHeight: "72vh", maxWidth: "92vw" }}
        />
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-14 pt-4 space-y-3">
        <button onClick={onChangePhoto}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all">
          Change Photo
        </button>
        <button onClick={onClose}
          className="w-full bg-white/10 text-white font-semibold py-3.5 rounded-2xl text-sm">
          Close
        </button>
      </div>

      {/* Remove confirm overlay */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center px-8 z-20">
            <motion.div
              initial={{ scale: 0.88 }} animate={{ scale: 1 }} exit={{ scale: 0.88 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="bg-[#1c2333] border border-white/10 rounded-3xl p-6 w-full max-w-xs text-center">
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="text-white font-bold text-base mb-1">Remove photo?</h3>
              <p className="text-gray-400 text-sm mb-6">Your profile will show initials instead.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRemove(false)}
                  className="flex-1 bg-white/8 border border-white/10 text-gray-300 font-semibold py-3 rounded-xl text-sm">
                  Cancel
                </button>
                <button onClick={() => { onRemove(); onClose(); }}
                  className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl text-sm">
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Photo Action Sheet ───────────────────────────────────────────────────────
const PhotoActionSheet = ({ hasPhoto, onClose, onPickFile, onRemove, theme }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-w-sm border rounded-t-3xl p-5 pb-12 ${theme.sheet}`}>
      <div className={`w-10 h-1 rounded-full mx-auto mb-5 ${theme.muted} bg-current opacity-30`} />
      <h2 className={`text-base font-bold ${theme.primary} mb-4`}>Profile Photo</h2>

      <button onClick={onPickFile}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 text-sm font-medium border transition-all active:scale-[0.98] ${theme.cardInner} ${theme.primary}`}>
        <span className="text-xl w-8 text-center">📷</span>
        Upload new photo
      </button>

      {hasPhoto && (
        <button onClick={onRemove}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl mb-2 text-sm font-medium border bg-red-500/8 text-red-500 border-red-500/15 active:scale-[0.98] transition-all">
          <span className="text-xl w-8 text-center">🗑️</span>
          Remove photo
        </button>
      )}

      <button onClick={onClose}
        className={`w-full py-3 rounded-2xl text-sm font-semibold ${theme.secondary} mt-1`}>
        Cancel
      </button>
    </motion.div>
  </motion.div>
);

// ─── Edit Profile Sheet ───────────────────────────────────────────────────────
const EditSheet = ({ profile, onClose, onSave, theme }) => {
  const [name,   setName]   = useState(profile?.full_name  || "");
  const [dept,   setDept]   = useState(profile?.department || "");
  const [year,   setYear]   = useState(profile?.year_of_study || "");
  const [section, setSection] = useState(profile?.section || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    if (!name.trim()) return setError("Name cannot be empty");
    setSaving(true); setError("");
    try { 
      await onSave({ 
        full_name: name.trim(), 
        department: dept.trim(),
        year_of_study: year.trim(),
        section: section.trim()
      }); 
      onClose(); 
    }
    catch { setError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm border rounded-t-3xl p-6 pb-12 ${theme.sheet}`}>
        <div className={`w-10 h-1 rounded-full mx-auto mb-6 ${theme.muted} bg-current opacity-30`} />
        <h2 className={`text-lg font-bold ${theme.primary} mb-5`}>Edit Profile</h2>
        {[
          { label: "Full Name",  val: name, set: setName, ph: "Your name"    },
          { label: "Department", val: dept, set: setDept, ph: "e.g. ECE, CSE" },
          { label: "Year of Study", val: year, set: setYear, ph: "e.g. 3rd Year" },
          { label: "Section", val: section, set: setSection, ph: "e.g. A" },
        ].map(({ label, val, set, ph }) => (
          <div key={label} className="mb-4">
            <label className={`text-xs font-semibold ${theme.muted} uppercase tracking-wider mb-1.5 block`}>{label}</label>
            <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={{ fontSize: 16 }}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${theme.input}`} />
          </div>
        ))}
        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─── Change Password Sheet ────────────────────────────────────────────────────
const PasswordSheet = ({ onClose, theme }) => {
  const [fields,  setFields]  = useState(["", "", ""]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const set = (i, v) => setFields((p) => { const n = [...p]; n[i] = v; return n; });

  const handleChange = async () => {
    if (fields[1].length < 6)    return setError("Password must be at least 6 characters");
    if (fields[1] !== fields[2]) return setError("Passwords do not match");
    setSaving(true); setError("");
    try {
      const user = auth.currentUser;
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, fields[0]));
      await updatePassword(user, fields[1]);
      setSuccess(true);
      setTimeout(onClose, 1600);
    } catch (e) {
      setError(e.code === "auth/wrong-password" ? "Current password is incorrect" : "Failed. Try again.");
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm border rounded-t-3xl p-6 pb-12 ${theme.sheet}`}>
        <div className={`w-10 h-1 rounded-full mx-auto mb-6 ${theme.muted} bg-current opacity-30`} />
        <h2 className={`text-lg font-bold ${theme.primary} mb-5`}>Change Password</h2>
        {["Current password", "New password", "Confirm new password"].map((label, i) => (
          <div key={i} className="mb-4">
            <label className={`text-xs font-semibold ${theme.muted} uppercase tracking-wider mb-1.5 block`}>{label}</label>
            <input type="password" value={fields[i]} onChange={(e) => set(i, e.target.value)}
              style={{ fontSize: 16 }}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${theme.input}`} />
          </div>
        ))}
        {error   && <p className="text-xs text-red-500 mb-4">{error}</p>}
        {success && <p className="text-xs text-green-500 mb-4">✓ Password updated!</p>}
        <button onClick={handleChange} disabled={saving}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50">
          {saving ? "Updating…" : "Update Password"}
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─── Delete Account Confirm ──────────────────────────────────────────────────
const DeleteConfirm = ({ onConfirm, onCancel, theme, isGoogleUser }) => {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (isGoogleUser) {
      if (confirmText.toLowerCase() !== "circular") return setError("Please type 'circular' to confirm");
    } else {
      if (!password) return setError("Password is required");
    }
    
    setDeleting(true);
    try {
      await onConfirm(isGoogleUser ? null : password);
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm border rounded-3xl p-6 text-center ${theme.sheet}`}>
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className={`text-base font-bold ${theme.primary} mb-1`}>Delete Account?</h3>
        <p className={`text-xs ${theme.secondary} mb-6`}>
          This action is permanent and cannot be undone. All your data will be removed.
        </p>
        
        {isGoogleUser ? (
          <div className="mb-6">
            <label className={`text-[10px] font-bold uppercase ${theme.muted} block mb-2`}>Type "circular" to confirm</label>
            <input 
              value={confirmText} 
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="circular"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${theme.input}`}
            />
          </div>
        ) : (
          <div className="mb-6">
            <label className={`text-[10px] font-bold uppercase ${theme.muted} block mb-2`}>Enter password to confirm</label>
            <input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${theme.input}`}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
        
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 border font-semibold py-3 rounded-xl text-sm ${theme.cardInner} ${theme.secondary}`}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.98] disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Language Sheet ──────────────────────────────────────────────────────────
const LanguageSheet = ({ current, onClose, onSave, theme }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-w-sm border rounded-t-3xl p-6 pb-12 ${theme.sheet}`}>
      <div className={`w-10 h-1 rounded-full mx-auto mb-6 ${theme.muted} bg-current opacity-30`} />
      <h2 className={`text-lg font-bold ${theme.primary} mb-5`}>Choose Language</h2>
      <div className="grid grid-cols-1 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => { onSave(lang.id); onClose(); }}
            className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
              current === lang.id 
                ? "border-red-500 bg-red-500/5 text-red-600" 
                : `${theme.cardInner} ${theme.primary} border-transparent`
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <div className="text-left">
                <p className="text-sm font-bold">{lang.native}</p>
                <p className={`text-[10px] uppercase tracking-widest ${theme.muted}`}>{lang.label}</p>
              </div>
            </div>
            {current === lang.id && <span className="text-red-500 font-bold">✓</span>}
          </button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);


// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
  const { profile, stats, signOut, refreshProfile } = useAuth();
  const { darkMode, toggleDarkMode }                = useContext(ThemeContext);

  const theme       = t(darkMode);
  const fileRef     = useRef(null);

  const [sheet,         setSheet]         = useState(null); // 'edit'|'password'|'signout'|'delete'|'photo'|'language'
  const [photoViewer,   setPhotoViewer]   = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [progress,      setProgress]      = useState(null); // 0–100 | null
  const [uploadError,   setUploadError]   = useState("");

  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com');

  const initials  = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";
  const roleColor = { admin: "red", teacher: "green", student: "blue" }[profile?.role] || "muted";
  const roleLabel = { admin: "System Admin", teacher: "Faculty", student: "Student" }[profile?.role] || profile?.role;

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setUploadError("Please select an image file.");
    if (file.size > 5 * 1024 * 1024)     return setUploadError("Image must be under 5 MB.");

    setUploadError(""); setSheet(null); setProgress(5);
    try {
      const photoURL = await uploadToCloudinary(file, (p) => setProgress(p));
      setProgress(80);
      await updateProfile(auth.currentUser, { photoURL });
      setProgress(90);
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL, updated_at: new Date() });
      setProgress(100);
      await refreshProfile?.();
      setTimeout(() => setProgress(null), 700);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setUploadError("Upload failed. Please try again.");
      setProgress(null);
    }
    e.target.value = "";
  }, [refreshProfile]);

  // ── Photo remove ──────────────────────────────────────────────────────────
  const handleRemovePhoto = useCallback(async () => {
    setUploadError(""); setProgress(20);
    try {
      await updateProfile(auth.currentUser, { photoURL: null });
      setProgress(60);
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL: null, updated_at: new Date() });
      setProgress(100);
      await refreshProfile?.();
      setTimeout(() => setProgress(null), 700);
    } catch {
      setUploadError("Failed to remove photo. Try again.");
      setProgress(null);
    }
  }, [refreshProfile]);

  // ── Save profile text ─────────────────────────────────────────────────────
  const handleSaveProfile = async (data) => {
    await updateDoc(doc(db, "profiles", auth.currentUser.uid), { ...data, updated_at: new Date() });
    if (data.full_name) await updateProfile(auth.currentUser, { displayName: data.full_name });
    await refreshProfile?.();
  };

  // ── Save Language ─────────────────────────────────────────────────────────
  const handleSaveLanguage = async (langId) => {
    await updateDoc(doc(db, "profiles", auth.currentUser.uid), { 
      greeting_language: langId, 
      updated_at: new Date() 
    });
    await refreshProfile?.();
  };

  // ── Delete Account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async (password) => {
    const user = auth.currentUser;
    if (!isGoogleUser && password) {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    }
    // Delete Firestore profile first
    await updateDoc(doc(db, "profiles", user.uid), { status: 'deleted', deleted_at: new Date() });
    // In a real app, you might use a cloud function to fully purge data
    await deleteUser(user);
    window.location.href = '/';
  };

  return (
    <>
      {/* Upload progress bar */}
      <AnimatePresence>
        {progress !== null && <UploadProgress progress={progress} />}
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* Full-screen photo viewer */}
      <AnimatePresence>
        {photoViewer && profile?.photoURL && (
          <PhotoViewer
            url={profile.photoURL}
            name={profile.full_name}
            onClose={() => setPhotoViewer(false)}
            onRemove={() => { handleRemovePhoto(); setPhotoViewer(false); }}
            onChangePhoto={() => { setPhotoViewer(false); fileRef.current?.click(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Main page ── */}
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className={`min-h-screen ${theme.page} pb-28 px-5 pt-4 transition-colors duration-300`}
      >
        {/* India tricolor strip */}
        <motion.div variants={fadeUp} className="h-0.5 rounded-full mb-5 opacity-50"
          style={{ background: theme.strip }} />

        {/* ── Avatar ── */}
        <motion.div variants={fadeUp} className="flex flex-col items-center pb-6">
          <div className="relative mb-4 group">
            {/* Main avatar button — tap to open full viewer if has photo, else open sheet */}
            <button
              onClick={() => profile?.photoURL ? setPhotoViewer(true) : setSheet("photo")}
              className="relative w-24 h-24 rounded-[22px] border-2 border-red-500 p-0.5 focus:outline-none focus:ring-4 focus:ring-red-500/30 overflow-hidden"
              aria-label={profile?.photoURL ? "View profile photo" : "Add profile photo"}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.full_name}
                  className="w-full h-full rounded-[18px] object-cover" />
              ) : (
                <div className="w-full h-full rounded-[18px] bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-[18px] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xl">📷</span>
              </div>
            </button>

            {/* Edit badge */}
            <button onClick={() => setSheet("photo")} aria-label="Change photo"
              className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-red-500 rounded-full border-2 ${theme.avatarBorder} flex items-center justify-center text-white text-xs shadow-md`}>
              ✏️
            </button>

            {/* Online dot */}
            <span className={`absolute -top-1 -left-1 w-4 h-4 bg-green-500 border-2 ${theme.avatarBorder} rounded-full`} />
          </div>

          <h1 className={`text-xl font-bold ${theme.primary} mb-1`}>{profile?.full_name || "Loading…"}</h1>
          <p className={`text-xs ${theme.muted} uppercase tracking-wider mb-3`}>
            {profile?.department ? `${profile.department} · ` : ""}{roleLabel}
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <Badge color={roleColor}>{roleLabel}</Badge>
            {profile?.status === "active" && <Badge color="green">Verified ✓</Badge>}
          </div>

          {uploadError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-red-500 mt-3 text-center px-4">
              {uploadError}
            </motion.p>
          )}
        </motion.div>

        {/* ── Stats ── */}
        <motion.div variants={fadeUp} className="flex gap-3 mb-6">
          {[
            { value: stats?.myPosts ?? "—", label: "Circulars posted", color: "text-red-500" },
            { value: stats?.membersManaged  ?? "—", label: "Members managed",  color: "text-green-500"  },
            { value: stats?.totalViews      ?? "—", label: "Total views",       color: "text-blue-500"   },
          ].map(({ value, label, color }) => (
            <div key={label} className={`flex-1 border rounded-2xl p-4 ${theme.cardInner}`}>
              <p className={`text-2xl font-bold ${color} mb-0.5`}>{value}</p>
              <p className={`text-xs ${theme.muted}`}>{label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Account ── */}
        <motion.div variants={fadeUp}>
          <SectionLabel theme={theme}>Account</SectionLabel>
          <SettingRow theme={theme} icon="👤" title="Edit Profile"    subtitle="Name, department, year, section"
            right={<span className={`${theme.muted} text-xl`}>›</span>} onClick={() => setSheet("edit")} />
          <SettingRow theme={theme} icon="🖼️" title="Profile Photo"   subtitle="Change or remove your photo"
            right={<span className={`${theme.muted} text-xl`}>›</span>} onClick={() => setSheet("photo")} />
          <SettingRow theme={theme} icon="🌐" title="Language"        subtitle="UI Language"
            right={<span className={`text-[10px] font-bold uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded`}>
              {LANGUAGES.find(l => l.id === profile?.greeting_language)?.label || 'EN'}
            </span>}
            onClick={() => setSheet("language")} />
          <SettingRow theme={theme} icon="🔔" title="Notifications"   subtitle="Push & email alerts"
            right={<Toggle on={notifications} onToggle={() => setNotifications((p) => !p)} />} />
          <SettingRow theme={theme} icon="🌙" title="Dark Mode"       subtitle={darkMode ? "Currently dark" : "Currently light"}
            right={<Toggle on={darkMode} onToggle={toggleDarkMode} />} />
          {!isGoogleUser && (
            <SettingRow theme={theme} icon="🔒" title="Change Password" subtitle="Update security credentials"
              right={<span className={`${theme.muted} text-xl`}>›</span>} onClick={() => setSheet("password")} />
          )}
        </motion.div>

        {/* ── Info ── */}
        <motion.div variants={fadeUp}>
          <SectionLabel theme={theme}>Info</SectionLabel>
          <div className={`border rounded-2xl overflow-hidden ${theme.card} divide-y ${theme.divider}`}>
            {[
              { label: "Email",      value: profile?.email      || "—" },
              { label: "Role",       value: roleLabel            || "—" },
              { label: "Department", value: profile?.department  || "—" },
              { label: "Year",       value: profile?.year_of_study || "—" },
              { label: "Section",    value: profile?.section      || "—" },
              { label: "Status",     value: profile?.status      || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className={`text-xs ${theme.muted}`}>{label}</span>
                <span className={`text-sm font-medium ${theme.primary}`}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Sign out ── */}
        <motion.div variants={fadeUp}>
          <SectionLabel theme={theme}>Session</SectionLabel>
          <button onClick={() => setSheet("signout")}
            className={`w-full flex items-center justify-between ${theme.danger} border rounded-2xl px-4 py-4 mb-3 active:scale-[0.98] transition-transform`}>
            <div className="text-left">
              <p className="text-sm font-semibold text-red-500">Sign Out</p>
              <p className={`text-xs ${theme.muted} mt-0.5`}>End current session</p>
            </div>
            <span className={`${theme.muted} text-lg`}>↩</span>
          </button>
          <button onClick={() => setSheet("delete")}
            className={`w-full flex items-center justify-between bg-red-600/5 border border-red-600/10 rounded-2xl px-4 py-4 active:scale-[0.98] transition-transform`}>
            <div className="text-left">
              <p className="text-sm font-semibold text-red-600">Delete Account</p>
              <p className={`text-[10px] uppercase font-bold text-red-600/60 mt-0.5`}>Irreversible Action</p>
            </div>
            <span className={`text-red-600 text-lg`}>🗑️</span>
          </button>
        </motion.div>

        <motion.p variants={fadeUp} className={`text-center text-[11px] ${theme.muted} mt-8 tracking-wider`}>
          Proudly Built for India 🇮🇳 · v2.0
        </motion.p>
      </motion.div>

      {/* ── Sheets & Modals ── */}
      <AnimatePresence>
        {sheet === "photo" && (
          <PhotoActionSheet theme={theme} hasPhoto={!!profile?.photoURL}
            onClose={() => setSheet(null)}
            onPickFile={() => { setSheet(null); fileRef.current?.click(); }}
            onRemove={() => { handleRemovePhoto(); setSheet(null); }} />
        )}
        {sheet === "edit" && (
          <EditSheet theme={theme} profile={profile}
            onClose={() => setSheet(null)} onSave={handleSaveProfile} />
        )}
        {sheet === "password" && (
          <PasswordSheet theme={theme} onClose={() => setSheet(null)} />
        )}
        {sheet === "language" && (
          <LanguageSheet current={profile?.greeting_language || "en"} theme={theme} onSave={handleSaveLanguage} onClose={() => setSheet(null)} />
        )}
        {sheet === "signout" && (
          <SignOutConfirm theme={theme} onConfirm={signOut} onCancel={() => setSheet(null)} />
        )}
        {sheet === "delete" && (
          <DeleteConfirm theme={theme} isGoogleUser={isGoogleUser} onConfirm={handleDeleteAccount} onCancel={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Sign Out Confirm ─────────────────────────────────────────────────────────
const SignOutConfirm = ({ onConfirm, onCancel, theme }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xs border rounded-3xl p-6 text-center ${theme.sheet}`}>
        <div className="text-4xl mb-3">👋</div>
        <h3 className={`text-base font-bold ${theme.primary} mb-1`}>Sign out?</h3>
        <p className={`text-sm ${theme.secondary} mb-6`}>You'll need to sign in again to access Suchna X Link.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 border font-semibold py-3 rounded-xl text-sm ${theme.cardInner} ${theme.secondary}`}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.98]">
            Sign Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

export default ProfilePage;
