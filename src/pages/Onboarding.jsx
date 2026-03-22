import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, getDocs, query, collection, limit } from 'firebase/firestore';
import { db } from '../lib/firebase-config';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import {
  getPersistedStep,
  getPersistedData,
  persistStep,
  persistData,
  completeOnboarding,
  isOnboardingComplete,
} from '../hooks/useOnboarding';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['CSE', 'AIDS', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const LANGUAGES = ['English', 'हिन्दी', 'తెలుగు', 'தமிழ்', 'ಕನ್ನಡ'];
const LANG_CODES = { 'English': 'en', 'हिन्दी': 'hi', 'తెలుగు': 'te', 'தமிழ்': 'ta', 'ಕನ್ನಡ': 'kn' };

const TOTAL_STEPS = 6;

// Access Codes from .env
const CODES = {
  ADMIN:   (import.meta.env.VITE_ADMIN_SECRET_KEY   || 'circularadmin2024').toLowerCase(),
  TEACHER: (import.meta.env.VITE_TEACHER_SECRET_KEY || 'circularteacher2024').toLowerCase(),
  STUDENT: (import.meta.env.VITE_STUDENT_SECRET_KEY || 'methodist2024').toLowerCase()
};

// ─── TricolorBar ──────────────────────────────────────────────────────────────
const TricolorBar = ({ className = '' }) => (
  <div className={`flex h-[3px] rounded-full overflow-hidden ${className}`}>
    <div className="flex-1 bg-[#FF9933]" />
    <div className="flex-1 bg-white/60" />
    <div className="flex-1 bg-[#138808]" />
  </div>
);

// ─── SelectCard ───────────────────────────────────────────────────────────────
const SelectCard = ({ label, selected, onClick, icon, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/60 active:scale-[0.97] ${
      selected
        ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/15'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {icon && <span className="text-2xl">{icon}</span>}
    <span className={`text-[13px] font-bold leading-tight tracking-tight ${selected ? 'text-red-600' : 'text-gray-700'}`}>
      {label}
    </span>
    {selected && (
      <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )}
  </button>
);

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[13px] font-bold border-2 transition-all duration-150 focus:outline-none active:scale-[0.97] ${
      selected
        ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20'
        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ current, total }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
          i < current ? 'bg-red-500' : 'bg-gray-100'
        }`}
      />
    ))}
  </div>
);

// ─── Step labels ─────────────────────────────────────────────────────────────
const STEP_META = [
  { icon: '👋', title: 'Welcome', sub: "Let's confirm who you are" },
  { icon: '🏛️', title: 'Your Department', sub: 'Select your branch and year' },
  { icon: '⚙️', title: 'Preferences', sub: 'Personalise your experience' },
  { icon: '🔑', title: 'Access Key', sub: 'Enter your institutional invite code' },
  { icon: '🔔', title: 'Stay Updated', sub: 'Never miss an urgent circular' },
  { icon: '✅', title: 'All Set!', sub: 'Review and launch your account' },
];


// ─── Main Onboarding ──────────────────────────────────────────────────────────
const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Restore persisted state
  const [step, setStep] = useState(() => getPersistedStep());
  const [submitting, setSubmitting] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);

  const [form, setForm] = useState(() => ({
    full_name: '',
    department: '',
    year: '',
    section: '',
    language: 'English',
    course_type: 'UG',
    access_code: '',
    ...getPersistedData(),
  }));

  const deriveRole = () => {
    const code = form.access_code.trim().toLowerCase();
    return isFirstUser || code === CODES.ADMIN ? 'admin' : (code === CODES.TEACHER ? 'teacher' : 'student');
  };

  const { permission, enableNotifications } = useNotifications(user, deriveRole());


  // Bootstrap: is this the very first user?
  useEffect(() => {
    const check = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'profiles'), limit(1)));
        setIsFirstUser(snap.empty);
      } catch (err) {
        console.error('Error checking for first user:', err);
      }
    };
    check();
  }, []);

  // Pre-fill name from Google account if available and not already set
  useEffect(() => {
    if (user && !form.full_name && user.displayName) {
      const updated = { ...form, full_name: user.displayName };
      setForm(updated);
      persistData(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Redirect to landing if no user, or to dashboard if already onboarded
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (isOnboardingComplete()) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const update = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      persistData(next);
      return next;
    });
  }, []);

  const gotoStep = useCallback((s) => {
    setStep(s);
    persistStep(s);
  }, []);

  const next = () => gotoStep(Math.min(step + 1, TOTAL_STEPS - 1));
  const back = () => gotoStep(Math.max(step - 1, 0));

  const canAdvance = () => {
    if (step === 0) return form.full_name.trim().length >= 2;
    if (step === 1) return form.department && form.year && form.section;
    if (step === 2) return true;
    if (step === 3) {
      // Validate access code
      const code = form.access_code.trim().toLowerCase();
      return code === CODES.ADMIN || code === CODES.TEACHER || code === CODES.STUDENT;
    }
    if (step === 4) return true; // Optional notification step
    return true;
  };


  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const email = user.email?.toLowerCase() || '';
      const isMethodist = email.endsWith('@methodist.edu.in');
      const code = form.access_code.trim().toLowerCase();
      
      const role = isFirstUser || code === CODES.ADMIN ? 'admin' : (code === CODES.TEACHER ? 'teacher' : 'student');
      const status = isFirstUser || code === CODES.ADMIN || code === CODES.TEACHER || isMethodist ? 'active' : 'pending';

      await setDoc(doc(db, 'profiles', user.uid), {
        email: user.email,
        full_name: form.full_name.trim() || email.split('@')[0] || 'User',
        role,
        department: form.department || 'CSE',
        year_of_study: form.year,
        section: form.section,
        course_type: form.course_type,
        greeting_language: LANG_CODES[form.language] || 'en',
        status,
        created_at: new Date().toISOString(),
        daily_intro_enabled: true,
        intro_frequency: 'daily',
      });

      completeOnboarding();
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding submit error:', err);
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const meta = STEP_META[step];
  const email = user.email || '';
  const isMethodist = email.toLowerCase().endsWith('@methodist.edu.in');

  return (
    <div className="min-h-screen bg-[#080e1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF9933 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #138808 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

      {/* Tricolor top stripe */}
      <div className="absolute top-0 left-0 right-0 flex h-[3px]">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/60" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-8 px-1">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
            <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
              <path d="M25 25L75 75" stroke="white" strokeWidth="14" strokeLinecap="round" />
              <path d="M25 75L75 25" stroke="rgba(255,255,255,0.5)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="50" cy="50" r="8" fill="white" />
            </svg>
          </div>
          <span className="text-white/60 text-[11px] font-bold uppercase tracking-[2px]">SuchnaX Link · Member Setup</span>
        </div>

        <div className="bg-white rounded-[28px] shadow-2xl overflow-hidden">
          {/* Progress */}
          <div className="px-7 pt-7 pb-5">
            <ProgressBar current={step + 1} total={TOTAL_STEPS} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                Step {step + 1} of {TOTAL_STEPS}
              </span>
              <span className="text-[10px] font-bold text-gray-400 truncate max-w-[160px]">{email}</span>
            </div>
          </div>

          {/* Step content */}
          <div className="px-7 pb-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Step header */}
                <div className="mb-6">
                  <div className="text-3xl mb-2">{meta.icon}</div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">{meta.title}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{meta.sub}</p>
                  <TricolorBar className="w-12 mt-3" />
                </div>

                {/* ── Step 0: Welcome ── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => update('full_name', e.target.value)}
                        placeholder="e.g. Arjun Sharma"
                        style={{ fontSize: 16 }}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-semibold placeholder-gray-300 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-400/10"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Course Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <SelectCard
                          label="Under Graduate (UG)"
                          icon="🎓"
                          selected={form.course_type === 'UG'}
                          onClick={() => update('course_type', 'UG')}
                        />
                        <SelectCard
                          label="Post Graduate (PG)"
                          icon="📘"
                          selected={form.course_type === 'PG'}
                          onClick={() => update('course_type', 'PG')}
                        />
                      </div>
                    </div>

                    {/* Access note */}
                    <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${isMethodist ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      <span className="mt-0.5 shrink-0">{isMethodist ? '✅' : '⏳'}</span>
                      <span>
                        {isMethodist
                          ? 'Your Methodist email grants instant access — you\'ll be activated automatically.'
                          : 'Your account will be reviewed by an admin before you can access circulars.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Academic Details ── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Department / Branch
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {DEPARTMENTS.map(dept => (
                          <SelectCard
                            key={dept}
                            label={dept}
                            selected={form.department === dept}
                            onClick={() => update('department', dept)}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Year of Study
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {YEARS.map(yr => (
                          <Chip key={yr} label={yr} selected={form.year === yr} onClick={() => update('year', yr)} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Section
                      </label>
                      <div className="flex gap-2">
                        {SECTIONS.map(sec => (
                          <Chip key={sec} label={`Sec ${sec}`} selected={form.section === sec} onClick={() => update('section', sec)} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Preferences ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Preferred Language for Notifications
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {LANGUAGES.map(lang => (
                          <SelectCard
                            key={lang}
                            label={lang}
                            selected={form.language === lang}
                            onClick={() => update('language', lang)}
                          />
                        ))}
                        <SelectCard
                          label="Mixed"
                          selected={form.language === 'Mixed'}
                          onClick={() => update('language', 'Mixed')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Access Key ── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Network Invite Code
                      </label>
                      <input
                        type="text"
                        value={form.access_code}
                        onChange={e => update('access_code', e.target.value)}
                        placeholder="Enter the secure access code"
                        style={{ fontSize: 16 }}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 font-bold placeholder-gray-300 outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-400/10 text-center uppercase tracking-widest"
                      />
                    </div>
                    {form.access_code.trim() && !canAdvance() && (
                      <p className="text-xs text-red-500 font-bold text-center animate-pulse">
                        Invalid access code
                      </p>
                    )}
                    {canAdvance() && form.access_code.trim() && (
                      <p className="text-xs text-emerald-600 font-bold text-center">
                        Code verified successfully
                      </p>
                    )}
                  </div>
                )}

                {/* ── Step 4: Notifications ── */}
                {step === 4 && (
                  <div className="space-y-6 text-center py-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-xl shadow-red-500/10">
                      <span className="text-4xl animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">🔔</span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-600 px-6">
                      Get instantly notified when important circulars, holidays, or urgent updates are published.
                    </p>
                    
                    {permission === 'granted' ? (
                      <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 font-bold shadow-inner">
                        ✅ Push Notifications Enabled!
                      </div>
                    ) : permission === 'denied' ? (
                      <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 font-bold shadow-inner">
                        ❌ Notifications Blocked
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => { await enableNotifications(); }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] text-[15px] flex items-center justify-center gap-2"
                      >
                        Enable Push Notifications
                      </button>
                    )}
                  </div>
                )}

                {/* ── Step 5: Review ── */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      {[
                        { label: 'Name', value: form.full_name || '—' },
                        { label: 'Email', value: email },
                        { label: 'Course', value: form.course_type },
                        { label: 'Department', value: form.department || '—' },
                        { label: 'Year', value: form.year || '—' },
                        { label: 'Section', value: form.section ? `Sec ${form.section}` : '—' },
                        { label: 'Designation', value: form.access_code.toLowerCase() === CODES.ADMIN ? 'Administrator' : (form.access_code.toLowerCase() === CODES.TEACHER ? 'Faculty' : 'Student') },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-semibold">{label}</span>
                          <span className="text-gray-800 font-black">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${isMethodist || form.access_code.toLowerCase() === CODES.ADMIN ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                      <span className="mt-0.5 shrink-0">{isMethodist || form.access_code.toLowerCase() === CODES.ADMIN ? '✅' : '⏳'}</span>
                      <span>
                        {isMethodist || form.access_code.toLowerCase() === CODES.ADMIN || form.access_code.toLowerCase() === CODES.TEACHER
                          ? 'Instant access — you\'ll be redirected to your dashboard immediately.'
                          : 'Pending admin approval — you\'ll be notified once your account is activated.'}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className={`flex gap-3 mt-7 ${step > 0 ? 'flex-row' : ''}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]"
                >
                  Back
                </button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance()}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/20 disabled:shadow-none text-sm"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>◌</motion.span>
                      Setting up…
                    </>
                  ) : (
                    'Launch My Account 🚀'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 mt-4 font-bold uppercase tracking-widest">
          SuchnaX Link · Secure Institutional Platform
        </p>
      </motion.div>
    </div>
  );
};

export default Onboarding;
