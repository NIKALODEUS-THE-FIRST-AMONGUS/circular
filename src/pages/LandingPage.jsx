import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulatedProgress } from "../hooks/useSimulatedProgress";
import { getBrandName, getSlogan } from "../config/branding";
import { signInWithGoogle, signInWithEmail } from "../context/FirebaseAuthContext";
import { doc, setDoc, getDoc, query, collection, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase-config";
import IndianFlag from "../components/IndianFlag";

// ─── Tricolor accent bar ──────────────────────────────────────────────────────
const TricolorBar = ({ className = "" }) => (
  <div className={`flex h-[2px] rounded-full overflow-hidden ${className}`}>
    <div className="flex-1 bg-[#FF9933] shadow-[0_0_8px_rgba(255,153,51,0.4)]" />
    <div className="flex-1 bg-white/90"     />
    <div className="flex-1 bg-[#138808] shadow-[0_0_8px_rgba(19,136,8,0.4)]" />
  </div>
);


// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = ({ language, size = "md" }) => {
  const brandName = getBrandName(language) || "SuchnaX Link";
  const parts = brandName.split("X");
  const textCls = size === "lg"
    ? "text-3xl font-extrabold tracking-tight"
    : "text-xl font-bold tracking-tight";

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div className={`${size === "lg" ? "w-12 h-12" : "w-9 h-9"} rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0`}>
        <svg width={size === "lg" ? 24 : 18} height={size === "lg" ? 24 : 18}
          viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 25L75 75" stroke="white" strokeWidth="14" strokeLinecap="round"/>
          <path d="M25 75L75 25" stroke="rgba(255,255,255,0.5)" strokeWidth="14" strokeLinecap="round"/>
          <circle cx="50" cy="50" r="8" fill="white"/>
        </svg>
      </div>
      {/* Text */}
      <div className="flex items-baseline gap-0 leading-none">
        <span className={`${textCls} text-white`}>{parts[0] || "Suchna"}</span>
        <span className={`${textCls} text-orange-400`}>X</span>
        <span className={`${textCls} text-[#4ade80] ml-1`}>{parts[1] || " Link"}</span>
      </div>
    </div>
  );
};

// ─── Feature pill ─────────────────────────────────────────────────────────────
const FeaturePill = ({ icon, text, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 backdrop-blur-sm"
  >
    <span className="text-sm">{icon}</span>
    <span className="text-xs font-medium text-white/70">{text}</span>
  </motion.div>
);

// ─── Input field ──────────────────────────────────────────────────────────────
const InputField = ({ label, type, value, onChange, placeholder, autoComplete, required, extra }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      {extra}
    </div>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      style={{ fontSize: 16 }}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/10"
    />
  </div>
);

// ─── Main LandingPage ─────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate                        = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { language }                    = useLanguage();
  const [loading,    setLoading]        = useState(false);
  const [error,      setError]          = useState(null);
  const [isFirstUser, setIsFirstUser]   = useState(false);
  const [emailData,  setEmailData]      = useState({ email: "", password: "" });
  const [deletionMessage, setDeletionMessage] = useState(() => {
    const msg = sessionStorage.getItem("deletion_message");
    if (msg) { sessionStorage.removeItem("deletion_message"); return msg; }
    return null;
  });

  const { progress } = useSimulatedProgress(loading, { slowdownPoint: 92 });

  // Bootstrap check
  useEffect(() => {
    const check = async () => {
      try {
        const snap = await getDocs(query(collection(db, "profiles"), limit(1)));
        setIsFirstUser(snap.empty);
      } catch {
        // Silent error for bootstrap check
      }
    };
    check();
  }, []);

  // Redirect if logged in
  useEffect(() => {
    if (user && profile && profile.status !== "pending") navigate("/dashboard");
  }, [user, profile, navigate]);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const result = await signInWithGoogle();
      const profileSnap = await getDoc(doc(db, "profiles", result.user.uid));
      if (profileSnap.exists()) await refreshProfile();
    } catch (err) {
      if (err.code === "auth/cancelled-popup-request" || err.code === "auth/popup-closed-by-user") {
        setLoading(false); return;
      }
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e?.preventDefault();
    setLoading(true); setError(null);
    try {
      await signInWithEmail(emailData.email, emailData.password);
      await refreshProfile();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Onboarding (user exists but no profile) ──
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A1628]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full"
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                <path d="M25 25L75 75" stroke="white" strokeWidth="14" strokeLinecap="round"/>
                <path d="M25 75L75 25" stroke="rgba(255,255,255,0.5)" strokeWidth="14" strokeLinecap="round"/>
                <circle cx="50" cy="50" r="8" fill="white"/>
              </svg>
            </div>
            <TricolorBar className="w-16 mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-sm text-gray-500 mb-6">Setting up your institutional profile…</p>
            <button
              onClick={async () => {
                const email = user.email?.toLowerCase() || "";
                const isMethodist = email.endsWith("@methodist.edu.in");
                await setDoc(doc(db, "profiles", user.uid), {
                  email:               user.email,
                  full_name:           user.displayName || email.split("@")[0] || "User",
                  role:                isFirstUser ? "admin" : "student",
                  department:          "ALL",
                  status:              isFirstUser || isMethodist ? "active" : "pending",
                  created_at:          new Date().toISOString(),
                  daily_intro_enabled: true,
                  greeting_language:   "Mixed",
                  intro_frequency:     "daily",
                });
                await refreshProfile();
                navigate("/dashboard");
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors active:scale-[0.98] shadow-lg shadow-orange-500/20"
            >
              Continue to Dashboard →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">

      {/* ── LEFT: Branding panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0  }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full md:w-[55%] bg-[#080e1a] flex flex-col justify-between p-8 sm:p-10 md:p-14 min-h-[45vh] md:min-h-screen overflow-hidden"
      >
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

        {/* Radial glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #FF9933 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #138808 0%, transparent 70%)", transform: "translate(30%, 30%)" }} />

        {/* Tricolor top bar */}
        <div className="absolute top-0 left-0 right-0 flex h-[3px]">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/80"  />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* Top: Logo + flag */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <Logo language={language} size="md" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/6 border border-white/10">
              <IndianFlag size="xs" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest hidden sm:block">
                Made in India
              </span>
            </div>
          </motion.div>
        </div>

        {/* Center: Hero text */}
        <div className="relative z-10 py-8 md:py-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Label */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-[2px] bg-orange-400 rounded-full" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[2px]">
                Administrative Node
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
              Streamlined<br/>
              <span className="text-orange-400">Institutional</span><br/>
              Communication
            </h1>

            <TricolorBar className="w-24 mb-5" />

            <p className="text-base text-white/45 max-w-sm leading-relaxed mb-8">
              {getSlogan(language) || "The secure, authoritative platform for digital circulars and institutional governance."}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              <FeaturePill icon="🔒" text="End-to-end secure"  delay={0.5} />
              <FeaturePill icon="⚡" text="Real-time delivery" delay={0.6} />
              <FeaturePill icon="🏛️" text="Role-based access"  delay={0.7} />
            </div>
          </motion.div>
        </div>

        {/* Bottom: Built for India */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex items-center gap-3"
        >
          <IndianFlag size="sm" />
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              Proudly Built for India
            </p>
            <p className="text-[10px] text-white/20">
              Developed by 5xL Labs · SuchnaXLink
            </p>
          </div>
        </motion.div>

        {/* Tricolor bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex h-[3px]">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/80"  />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </motion.div>

      {/* ── RIGHT: Login form ── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0  }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="w-full md:w-[45%] bg-[#f8fafc] flex items-center justify-center p-6 sm:p-8 md:p-12 min-h-[55vh] md:min-h-screen"
      >
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/8 border border-gray-100 overflow-hidden">

            {/* Card top accent */}
            <div className="flex h-[3px]">
              <div className="flex-1 bg-[#FF9933]"/>
              <div className="flex-1 bg-gray-200" />
              <div className="flex-1 bg-[#138808]"/>
            </div>

            <div className="p-7 sm:p-8 relative">

              {/* Loading overlay */}
              <AnimatePresence>
                {loading && !user && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-white/92 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                      <motion.svg
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </motion.svg>
                    </div>
                    {/* Progress bar */}
                    <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }} />
                    </div>
                    <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-widest">
                      Securing Access…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Deletion message */}
              <AnimatePresence>
                {deletionMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3"
                  >
                    <span className="text-red-500 text-sm mt-0.5">⚠</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-700 mb-0.5">Account Removed</p>
                      <p className="text-[11px] text-red-600">{deletionMessage}</p>
                    </div>
                    <button onClick={() => setDeletionMessage(null)}
                      className="text-red-300 hover:text-red-500 text-lg leading-none">×</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Institutional Access</h2>
                <p className="text-xs text-gray-400">Enter your credentials to access the dashboard</p>
              </div>

              {/* Google login */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] disabled:opacity-50 mb-5 shadow-sm"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google" className="w-4 h-4"
                />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest whitespace-nowrap">
                  or direct access
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <InputField
                  label="Work Email"
                  type="email"
                  value={emailData.email}
                  onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                  placeholder="name@university.edu"
                  autoComplete="email"
                  required
                />
                <InputField
                  label="Password"
                  type="password"
                  value={emailData.password}
                  onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  extra={
                    <a href="#" className="text-[10px] font-bold text-orange-500 hover:text-orange-600">
                      Forgot password?
                    </a>
                  }
                />

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-600"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
                      Verifying…
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security footer */}
              <div className="flex items-center justify-center gap-2 mt-5 pt-5 border-t border-gray-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ display: "block", flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  End-to-end encrypted secure access
                </span>
              </div>
            </div>
          </div>

          {/* Below card */}
          <p className="text-center text-[10px] text-gray-400 mt-4">
            By signing in you agree to institutional usage policies.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;