import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, ChevronLeft, X, 
  Bell, LayoutDashboard, FileText, 
  Settings, Users, Send, BookOpen,
  Sparkles, ShieldCheck, Zap
} from "lucide-react";
import { useTutorial } from "../hooks/useTutorial";
import { useAuth } from "../hooks/useAuth";

const FirstTimeTutorial = () => {
  const { profile } = useAuth();
  const { showTutorial, completeTutorial, dismissTutorial } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);

  const role = profile?.role || "student";

  // ─── Tutorial Steps ────────────────────────────────────────────────────────
  const steps = useMemo(() => {
    const common = [
      {
        icon: <Sparkles className="text-amber-400" size={40} />,
        title: "Welcome to SuchnaX Link",
        description: "Your unified institutional broadcast hub. Let's take a quick tour of your new premium workspace.",
        color: "from-amber-500/20 to-orange-500/20",
      },
      {
        icon: <LayoutDashboard className="text-blue-400" size={40} />,
        title: "The Broadcast Feed",
        description: "This is where all live circulars appear. Stay updated with real-time institutional broadcasts and announcements.",
        color: "from-blue-500/20 to-cyan-500/20",
      },
    ];

    const studentSteps = [
      {
        icon: <Bell className="text-purple-400" size={40} />,
        title: "Smart Notifications",
        description: "The bell icon keeps you updated. Get instant alerts for circulars that match your department and year.",
        color: "from-purple-500/20 to-pink-500/20",
      },
      {
        icon: <BookOpen className="text-emerald-400" size={40} />,
        title: "Academic Focus",
        description: "Filter circulars by your specific branch and section to see only what matters most to your studies.",
        color: "from-emerald-500/20 to-teal-500/20",
      },
    ];

    const teacherSteps = [
      {
        icon: <Send className="text-orange-400" size={40} />,
        title: "Post Circulars",
        description: "Broadcast announcements to specific departments, years, or sections with just a few clicks.",
        color: "from-orange-500/20 to-red-500/20",
      },
      {
        icon: <FileText className="text-indigo-400" size={40} />,
        title: "Drafts & Hub",
        description: "Save your work as drafts and manage your previous posts from your personalized dashboard.",
        color: "from-indigo-500/20 to-blue-500/20",
      },
    ];

    const adminSteps = [
      {
        icon: <ShieldCheck className="text-red-400" size={40} />,
        title: "Command Center",
        description: "As an Administrator, you have global control over all institutional hubs and user permissions.",
        color: "from-red-500/20 to-rose-500/20",
      },
      {
        icon: <Users className="text-cyan-400" size={40} />,
        title: "Member Management",
        description: "Approve new sign-ups, manage faculty roles, and maintain the integrity of the network.",
        color: "from-cyan-500/20 to-blue-500/20",
      },
    ];

    const final = {
      icon: <Zap className="text-yellow-400" size={40} />,
      title: "All Set!",
      description: "You're ready to explore. You can always replay this tutorial from your profile settings.",
      color: "from-yellow-500/20 to-amber-500/20",
    };

    let roleSpecific = [];
    if (role === "admin") roleSpecific = adminSteps;
    else if (role === "dept_admin" || role === "teacher") roleSpecific = teacherSteps;
    else roleSpecific = studentSteps;

    return [...common, ...roleSpecific, final];
  }, [role]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!showTutorial) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-[#0a0f1d]/90 backdrop-blur-md" 
          onClick={dismissTutorial}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#11141b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-black/60"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 flex h-1.5 gap-1 p-1">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all duration-500 ${
                  i <= currentStep ? "bg-blue-500" : "bg-white/5"
                }`}
              />
            ))}
          </div>

          {/* Close Button */}
          <button 
            onClick={dismissTutorial}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10"
          >
            <X size={20} />
          </button>

          {/* Content Area */}
          <div className="p-8 sm:p-12 pt-16 text-center space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Icon with Dynamic Glow */}
                <div className={`relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br ${steps[currentStep].color} border border-white/10 flex items-center justify-center shadow-inner shadow-white/5`}>
                   <div className="absolute inset-0 blur-2xl opacity-20 bg-blue-500 animate-pulse pointer-events-none" />
                   {steps[currentStep].icon}
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {steps[currentStep].title}
                  </h2>
                  <p className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed max-w-[320px] mx-auto">
                    {steps[currentStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                  currentStep === 0 
                  ? "opacity-0 pointer-events-none" 
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <ChevronLeft size={18} />
                Back
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          {/* Visual Rhythm - Bottom Tricolor Strip */}
          <div className="h-1 flex">
            <div className="flex-1 bg-[#FF9933] opacity-30" />
            <div className="flex-1 bg-white opacity-20" />
            <div className="flex-1 bg-[#138808] opacity-30" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FirstTimeTutorial;
