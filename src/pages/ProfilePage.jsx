import { useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../lib/firebase-config";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { User, Shield, Palette, Info, LogOut, Trash2, Camera, Check, Globe, Bell, PlayCircle, RefreshCw, X, Pencil, ExternalLink, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTutorial } from "../hooks/useTutorial";
import { ThemeContext } from "../context/ThemeContext";

const LANGUAGES = [
  { id: "en",    label: "English",    native: "English",    flag: "🇬🇧" },
  { id: "hi",    label: "Hindi",      native: "हिंदी",        flag: "🇮🇳" },
  { id: "te",    label: "Telugu",     native: "తెలుగు",       flag: "🇮🇳" },
  { id: "ta",    label: "Tamil",      native: "தமிழ்",        flag: "🇮🇳" },
  { id: "kn",    label: "Kannada",    native: "ಕನ್ನಡ",        flag: "🇮🇳" },
  { id: "mr",    label: "Marathi",    native: "मराठी",        flag: "🇮🇳" },
];

const DEPTS      = ['CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const YEARS      = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS   = ['A', 'B', 'C', 'D'];

/** ── Design tokens ── */
const tk = (dark) => ({
  page:      dark ? "bg-black text-white" : "bg-white text-slate-900",
  sidebar:   dark ? "bg-[#0d1117]/80 border-white/6" : "bg-slate-50/80 border-slate-200",
  card:      dark ? "bg-[#161b22] border-white/10 shadow-2xl" : "bg-white border-slate-200 shadow-xl",
  input:     dark ? "bg-white/5 border-white/10 text-white placeholder-slate-600 focus:border-red-500/50"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-500",
  hover:     dark ? "hover:bg-white/5" : "hover:bg-slate-100",
  divider:   dark ? "border-white/5" : "border-slate-100",
  muted:     dark ? "text-slate-500" : "text-slate-400",
  accent:    "linear-gradient(90deg,#FF9933 33%,#fff 33%,#fff 66%,#138808 66%)",
});

/** ── Transitions ── */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

/** ── Photo upload helper ── */
const uploadAvatar = async (file, onProgress) => {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "suchna_x/avatars");
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      data.secure_url ? resolve(data.secure_url) : reject(new Error("Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
  const { profile, stats, signOut, refreshProfile } = useAuth();
  const { theme, toggleDarkMode } = useContext(ThemeContext);
  const { startTutorial } = useTutorial();
  const fileRef = useRef(null);

  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const T = tk(dark);

  // ── Logic State ──
  const [activeTab,    setActiveTab]    = useState("account"); // account | appearance | security | about
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [error,        setError]        = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // signout | delete

  // ── Form State ──
  const [name,    setName]    = useState(profile?.full_name || "");
  const [dept,    setDept]    = useState(profile?.department || DEPTS[0]);
  const [year,    setYear]    = useState(profile?.year_of_study || YEARS[0]);
  const [section, setSection] = useState(profile?.section || SECTIONS[0]);

  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com');
  const initials = profile?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

  // ── Photo Ops ──
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB");
    
    setUploading(true); setProgress(0); setError("");
    try {
      const url = await uploadAvatar(file, (p) => setProgress(p));
      await updateProfile(auth.currentUser, { photoURL: url });
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL: url, updated_at: new Date() });
      await refreshProfile();
    } catch { setError("Upload failed. Please try again."); }
    finally { setUploading(false); setProgress(0); e.target.value = ""; }
  };

  const handleRemovePhoto = async () => {
    setUploading(true); setError("");
    try {
      await updateProfile(auth.currentUser, { photoURL: null });
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { photoURL: null, updated_at: new Date() });
      await refreshProfile();
    } catch { setError("Failed to remove photo."); }
    finally { setUploading(false); }
  };

  // ── Profile Ops ──
  const handleSaveProfile = async () => {
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), {
        full_name: name.trim(),
        department: dept.trim(),
        year_of_study: year.trim(),
        section: section.trim(),
        updated_at: new Date()
      });
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await refreshProfile();
      setEditing(false);
    } catch { setError("Failed to save changes."); }
    finally { setSaving(false); }
  };

  const handleLanguageUpdate = async (langId) => {
    try {
      await updateDoc(doc(db, "profiles", auth.currentUser.uid), { greeting_language: langId, updated_at: new Date() });
      await refreshProfile();
    } catch { setError("Failed to update language."); }
  };

  // ── Sidebar Tabs ──
  const tabs = [
    { id: "account",    label: "Account",    icon: User,    desc: "Personal information & stats" },
    { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & language preferences" },
    { id: "security",   label: "Security",   icon: Shield,  desc: "Password & account safety" },
    { id: "about",      label: "About",      icon: Info,    desc: "System info & build version" },
  ];

  return (
    <div className={`min-h-screen pt-20 transition-colors duration-300 ${T.page}`}>
      <div className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">

        {/* ── SIDEBAR ── */}
        <aside className="space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight mb-1">Settings</h1>
            <p className={`text-xs ${T.muted} uppercase font-bold tracking-[0.2em]`}>Institutional Preferences</p>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                    active ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : `${T.hover} ${T.page}`
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <div className="text-left">
                    <p className="text-sm font-bold">{tab.label}</p>
                    <p className={`text-[10px] ${active ? "text-white/70" : T.muted} font-medium`}>{tab.desc}</p>
                  </div>
                  {active && (
                    <motion.div layoutId="nav-active" className="absolute left-1.5 w-1 h-6 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className={`pt-8 border-t ${T.divider}`}>
            <button
              onClick={() => setConfirmModal("signout")}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/20 transition-all font-bold group active:scale-[0.98]"
            >
              <span className="text-sm">Sign Out</span>
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial="initial" animate="animate" exit="exit" variants={fadeUp}
              className={`p-8 lg:p-12 rounded-[48px] border ${T.card}`}
            >
              {/* India tricolor rhythm strip */}
              <div className="h-1 w-24 rounded-full mb-8 origin-left shadow-sm" style={{ background: T.accent }} />

              {/* ── TAB: ACCOUNT ── */}
              {activeTab === "account" && (
                <div className="space-y-10">
                  {/* Photo & Identity Section */}
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                      <div className={`w-36 h-36 rounded-[42px] border-4 p-1.5 overflow-hidden transition-all duration-500 bg-gradient-to-br from-red-500 via-orange-500 to-green-500 ${dark ? "border-white/10" : "border-slate-100 shadow-xl"}`}>
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt={profile.full_name} className="w-full h-full rounded-[34px] object-cover" />
                        ) : (
                          <div className={`w-full h-full rounded-[34px] flex items-center justify-center font-black text-4xl ${dark ? "bg-[#0d1117] text-white" : "bg-white text-slate-900"}`}>
                            {initials}
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-red-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] text-white font-black mt-2 uppercase tracking-widest">{progress}%</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => fileRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-red-500 text-white border-4 border-white dark:border-[#161b22] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                      >
                        <Camera size={18} strokeWidth={2.5} />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <h2 className="text-3xl font-black tracking-tight">{profile?.full_name}</h2>
                        {profile?.status === 'active' && <ShieldCheck size={22} className="text-blue-500" />}
                      </div>
                      <p className={`text-base font-medium ${T.muted} mb-4`}>
                        {profile?.email} <span className="mx-2 opacity-30">|</span> {profile?.role?.toUpperCase()}
                      </p>
                      <div className="flex gap-2 justify-center md:justify-start">
                        {profile?.photoURL && (
                          <button onClick={handleRemovePhoto} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all">
                            Remove Photo
                          </button>
                        )}
                        <button onClick={() => setEditing(true)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all flex items-center gap-2">
                          <Pencil size={12} /> Edit Detail
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Stats (Premium Cards) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { l: "Posts",  v: stats?.myPosts ?? 0, c: "text-orange-500", i: PlayCircle },
                      { l: "Views",  v: stats?.totalViews ?? 0, c: "text-blue-500",   i: User },
                      { l: "Groups", v: profile?.department ?? "—", c: "text-green-500",  i: Shield },
                    ].map((s, i) => {
                      const Icon = s.i;
                      return (
                        <div key={i} className={`p-6 rounded-3xl border ${T.sidebar} group hover:border-white/20 transition-all`}>
                          <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${dark ? "bg-white/5" : "bg-white border border-slate-100 shadow-sm"}`}>
                            <Icon size={20} className={s.c} />
                          </div>
                          <p className={`text-3xl font-black ${s.c} mb-1 transition-transform group-hover:scale-105 origin-left`}>{s.v}</p>
                          <p className={`text-[10px] ${T.muted} uppercase font-black tracking-widest`}>{s.l}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB: APPEARANCE ── */}
              {activeTab === "appearance" && (
                <div className="space-y-12">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Palette size={20} className="text-red-500" />
                      <h3 className="text-xl font-black tracking-tight">Visual Theme</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {['light', 'dark'].map((m) => (
                        <button key={m} onClick={toggleDarkMode}
                          className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 group ${
                            (m === 'dark' ? dark : !dark) ? "border-red-500 bg-red-500/5 shadow-xl shadow-red-500/10" : "border-transparent bg-white/5 opacity-50 hover:opacity-80"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m === 'dark' ? 'bg-black text-white' : 'bg-white text-slate-800 border'}`}>
                            {m === 'dark' ? '🌙' : '☀️'}
                          </div>
                          <div className="text-left font-black uppercase tracking-widest text-xs">
                            {m} Mode
                            {(m === 'dark' ? dark : !dark) && <span className="ml-2 text-red-500 font-black">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-blue-500" />
                      <h3 className="text-xl font-black tracking-tight">Greeting Language</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {LANGUAGES.map((l) => (
                        <button key={l.id} onClick={() => handleLanguageUpdate(l.id)}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                            profile?.greeting_language === l.id ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "bg-white/5 border-transparent hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <span className="text-2xl">{l.flag}</span>
                            <div>
                              <p className="text-sm font-black">{l.native}</p>
                              <p className={`text-[10px] uppercase font-bold ${T.muted}`}>{l.label}</p>
                            </div>
                          </div>
                          {profile?.greeting_language === l.id && <Check size={16} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className={`pt-8 border-t ${T.divider}`}>
                    <div className="flex items-center justify-between p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                          <PlayCircle size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-orange-500 tracking-tight">First-Time Tutorial</h4>
                          <p className="text-xs font-medium opacity-70">Experience the guided walkthrough again</p>
                        </div>
                      </div>
                      <button onClick={() => { startTutorial(); window.location.href = "/dashboard"; }}
                        className="px-6 py-3 rounded-xl bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">
                        Launch Tutorial
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ── TAB: SECURITY ── */}
              {activeTab === "security" && (
                <div className="space-y-12">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Shield size={20} className="text-red-500" />
                      <h3 className="text-xl font-black tracking-tight">Password Management</h3>
                    </div>
                    <div className={`p-8 rounded-3xl border ${T.sidebar} space-y-6`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                          <ShieldCheck size={20} />
                        </div>
                        <p className="text-sm font-medium">Your account is secured with standard encryption.</p>
                      </div>
                      {!isGoogleUser ? (
                        <button onClick={() => setEditing("password")} className="w-full bg-red-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">
                          Change Account Password
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-blue-500">
                          <Globe size={16} />
                          <p className="text-xs font-bold">Authenticated via Google. Manage security at google.com</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Trash2 size={20} className="text-red-600" />
                      <h3 className="text-xl font-black tracking-tight">Danger Zone</h3>
                    </div>
                    <div className={`p-8 rounded-3xl border border-red-500/20 bg-red-500/5 space-y-4`}>
                      <h4 className="text-red-600 font-black">Delete Account</h4>
                      <p className={`text-sm ${T.muted} leading-relaxed`}>
                        This action is irreversible. All your circulars, posts, and manage data will be permanently wiped.
                      </p>
                      <button onClick={() => setConfirmModal("delete")} className="px-6 py-3 rounded-xl border border-red-500/40 text-red-600 font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all">
                        Request Deletion
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ── TAB: ABOUT ── */}
              {activeTab === "about" && (
                <div className="space-y-8">
                  <div className="text-center pb-8 border-b border-white/5">
                    <div className="w-20 h-20 bg-orange-500 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-orange-500/30">SX</div>
                    <h2 className="text-3xl font-black tracking-tight">SuchnaX Link</h2>
                    <p className={`text-sm font-bold mt-1 ${T.muted} uppercase tracking-[0.3em]`}>Connect · Inform · Lead</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { l: "Version", v: "2.0.4-premium", i: Info },
                      { l: "Platform", v: "Institutional Node", i: Globe },
                      { l: "Status", v: "Production Stable", i: Check },
                      { l: "Updated", v: new Date().toLocaleDateString(), i: RefreshCw },
                    ].map((item, i) => (
                      <div key={i} className={`p-5 rounded-2xl border ${T.sidebar} flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-white/5" : "bg-white border"}`}>
                          <item.i size={18} className="text-blue-500" />
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase font-black tracking-widest ${T.muted}`}>{item.l}</p>
                          <p className="text-sm font-bold">{item.v}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-8 p-6 rounded-3xl ${T.sidebar} border-dashed flex flex-col items-center justify-center text-center gap-2`}>
                    <p className="text-sm font-medium">Proudly Engineered in India 🇮🇳</p>
                    <p className={`text-xs ${T.muted}`}>Empowering institutional communication at scale.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Full Edit Modal */}
        {editing === true && (
          <ModalWrapper key="edit" title="Update Profile" onClose={() => setEditing(false)} T={T} dark={dark}>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name"
                  className={`w-full px-5 py-3.5 rounded-2xl border outline-none transition-all ${T.input}`} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Department</label>
                <select value={dept} onChange={e => setDept(e.target.value)}
                  className={`w-full px-5 py-3.5 rounded-2xl border outline-none transition-all appearance-none cursor-pointer ${T.input}`}>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Year</label>
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className={`w-full px-5 py-3.5 rounded-2xl border outline-none transition-all appearance-none cursor-pointer ${T.input}`}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Section</label>
                  <select value={section} onChange={e => setSection(e.target.value)}
                    className={`w-full px-5 py-3.5 rounded-2xl border outline-none transition-all appearance-none cursor-pointer ${T.input}`}>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button onClick={handleSaveProfile} disabled={saving} className="w-full h-14 bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50">
                  {saving ? "Processing…" : "Save Changes"}
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {/* Password Modal */}
        {editing === "password" && (
          <ModalWrapper key="pw" title="Security Credentials" onClose={() => setEditing(false)} T={T} dark={dark}>
             <p className="text-xs opacity-60 mb-6 leading-relaxed">Ensure your local connection is secure before updating sensitive data.</p>
             <div className="space-y-4">
                <input type="password" placeholder="Current Password" className={`w-full px-5 py-3.5 rounded-2xl border outline-none ${T.input}`} />
                <input type="password" placeholder="New Password" className={`w-full px-5 py-3.5 rounded-2xl border outline-none ${T.input}`} />
                <button className="w-full h-14 bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl">Apply New Security</button>
             </div>
          </ModalWrapper>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-[42px] p-10 text-center border ${T.card}`}>
              <div className="mb-6 w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                {confirmModal === 'delete' ? <Trash2 size={40} /> : <LogOut size={40} />}
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">Confirm {confirmModal}?</h3>
              <p className={`text-sm ${T.muted} mb-8 leading-relaxed`}>
                {confirmModal === 'delete' ? 'This is an irreversible institutional action. All node data will be purged.' : 'You will be disconnected from the SuchnaX network.'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setConfirmModal(null)} className={`h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl border ${T.divider} hover:bg-white/5`}>Back</button>
                <button onClick={() => { if(confirmModal==='signout') signOut(); setConfirmModal(null); }} className={`h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-95`}>Proceed</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl bg-red-500 text-white text-xs font-bold shadow-2xl z-[200]">
          {error}
          <button onClick={() => setError("")} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </motion.div>
      )}
    </div>
  );
};

// ── Shared Wrapper for Modals ──
const ModalWrapper = ({ title, children, onClose, T }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg pt-24 pb-12 overflow-y-auto">
    <div className="absolute inset-0" onClick={onClose} />
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1,    opacity: 1, y: 0 }}
      exit={{ scale: 0.9,     opacity: 0, y: 30 }}
      className={`relative w-full max-w-lg rounded-[48px] p-10 pt-12 shadow-2xl border ${T.card} overflow-hidden`}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: T.accent }} />
      <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-red-500 transition-colors">
        <X size={24} />
      </button>
      <h3 className="text-3xl font-black mb-1.5 tracking-tight">{title}</h3>
      <div className="h-1 w-12 bg-red-500 rounded-full mb-8" />
      {children}
    </motion.div>
  </div>
);

export default ProfilePage;
