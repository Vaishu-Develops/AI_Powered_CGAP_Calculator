'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiArrowRight, FiUploadCloud, FiCpu, FiCheckCircle, FiXCircle, FiStar, FiPlus, FiMinus, FiActivity, FiClock, FiAlertTriangle, FiFileText, FiBriefcase, FiFrown } from 'react-icons/fi';
import { useUser } from '@/context/UserContext';
import { useCalcFlow } from '@/context/CalcFlowContext';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function LandingPage() {
  const router = useRouter();
  const { user, isDemo, startDemo } = useUser();
  const { resetFlow } = useCalcFlow();

  const [mockupStep, setMockupStep] = useState(0);

  // Mockup Animation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setMockupStep((prev) => (prev + 1) % 3);
    }, 3000); // 9 seconds total loop (3 steps * 3s)
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    resetFlow();
    if (user) {
      router.push('/home');
    } else {
      router.push('/auth');
    }
  };

  const handleTryDemo = () => {
    resetFlow();
    if (!user && !isDemo) {
      startDemo();
    }
    router.push('/home');
  };

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary relative overflow-hidden font-outfit selection:bg-primary/30">
      <ParticleBackground />

      {/* Saffron OS Aurora Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-70">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(212,80,10,0.08)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(247,197,159,0.08)_0%,transparent_70%)] rounded-full blur-[120px] animate-pulse"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex justify-between items-center px-6 md:px-12 py-6 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-black tracking-tighter">
          <span className="text-primary">CGPA</span> Intel
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 items-center">
          {user ? (
            <button onClick={() => router.push('/home')} className="text-sm font-bold text-primary px-6 py-2.5 rounded-full border border-primary/20 hover:bg-primary/10 transition-colors">
              My Dashboard
            </button>
          ) : (
            <button onClick={() => router.push('/auth')} className="text-sm font-bold text-primary hover:text-primary/70 transition-colors px-4 py-2">
              Sign In
            </button>
          )}
        </motion.div>
      </nav>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pb-32">

        {/* 1. HERO SECTION */}
        <div className="pt-24 md:pt-40 pb-20 text-center max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-8 shadow-sm backdrop-blur-md">
            <FiCpu className="w-4 h-4 animate-pulse" />
            Powered by Advanced AI OCR
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[1.05] mb-8 relative drop-shadow-sm"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] bg-gradient-to-r from-primary/10 via-accent-1/20 to-transparent blur-[100px] -z-10 rounded-[100%] mix-blend-screen pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

            Stop calculating manually.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#FF8C42] to-primary bg-[length:200%_auto] animate-gradient block mt-2 pb-2">
              Our AI reads every grade,<br className="hidden md:block" /> every semester — instantly.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-xl md:text-2xl text-text-muted font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Drop in your university marksheets and get a beautiful, accurate CGPA report in under <span className="text-primary font-bold">5 seconds</span>. No manual entry required.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 relative z-20">
            <button onClick={handleGetStarted} className="group relative px-10 py-5 bg-gradient-to-r from-[#D4500A] to-[#FF8C42] text-white rounded-full font-black text-xl overflow-hidden shadow-[0_20px_40px_rgba(212,80,10,0.35)] hover:shadow-[0_25px_50px_rgba(212,80,10,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto flex items-center justify-center gap-3 border border-white/20">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span>Get Started Free</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button onClick={handleTryDemo} className="group px-8 py-5 bg-bg-card border-border text-text-primary rounded-full font-bold text-lg hover:border-primary border-2 hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto shadow-sm flex items-center justify-center gap-3 backdrop-blur-md">
              <span>Try Demo</span>
              <FiArrowRight className="text-text-muted group-hover:text-primary transition-colors" />
            </button>
          </motion.div>
        </div>

        {/* ANIMATED APP MOCKUP */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
          className="max-w-4xl mx-auto mb-24 relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent-1 to-primary rounded-[32px] blur-xl opacity-30 animate-pulse bg-[length:200%_auto]" />
          <div className="relative bg-[#0F0A00] rounded-[32px] border border-white/10 p-4 md:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] h-[400px] flex items-center justify-center overflow-hidden">

            {/* Elegant glass reflection */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent rounded-t-[32px] pointer-events-none" />

            {/* Mock UI Frame */}
            <div className="absolute top-6 left-6 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>

            <AnimatePresence mode="wait">
              {mockupStep === 0 && (
                <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                  <div className="w-28 h-28 mx-auto border border-dashed border-primary/40 rounded-3xl flex items-center justify-center mb-6 bg-gradient-to-br from-primary/10 to-transparent shadow-inner">
                    <FiUploadCloud className="text-5xl text-primary" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Upload Marksheet</h3>
                  <p className="text-text-muted font-medium">Drag & drop your screenshot here</p>
                </motion.div>
              )}
              {mockupStep === 1 && (
                <motion.div key="scan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="text-center relative">
                  <div className="w-36 h-36 mx-auto relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[6px] border-t-primary border-r-accent-1 border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-5 rounded-full border-[6px] border-l-data border-b-success border-t-transparent border-r-transparent animate-spin-reverse" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <FiCpu className="text-5xl text-white animate-pulse relative z-10" />
                  </div>
                  <h3 className="text-3xl font-black text-white mt-8 mb-3 tracking-tight">AI Analyzing...</h3>
                  <p className="text-primary tracking-widest uppercase text-sm font-black animate-pulse">Connecting to Schema R2021</p>
                </motion.div>
              )}
              {mockupStep === 2 && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="text-center w-full max-w-sm">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/20 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-gray-400 font-black uppercase tracking-widest mb-3">Cumulative GPA</p>
                    <div className="text-[5rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-success to-data mb-6 leading-none tracking-tighter shadow-sm text-shadow-sm">8.79</div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: '87.9%' }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full bg-gradient-to-r from-success to-[#10B981] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 2. SOCIAL PROOF BAR */}
        <div className="border-y border-border/50 py-8 mb-32 bg-bg-card-alt/30">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-4 text-center items-center px-4 font-bold text-text-primary/80">
            <div className="flex items-center gap-2">
              <span className="text-primary font-black text-xl">12,847</span> <span className="text-sm">students</span>
            </div>
            <span className="hidden md:inline text-border">•</span>
            <div className="flex items-center gap-2">
              <span className="text-primary font-black text-xl">98,000+</span> <span className="text-sm">marksheets scanned</span>
            </div>
            <span className="hidden md:inline text-border">•</span>
            <div className="flex items-center gap-2 text-yellow-500">
              <FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" /> <FiStar className="fill-current" /> <span className="text-text-primary text-sm font-black ml-1">4.9</span>
            </div>
            <span className="hidden md:inline text-border">•</span>
            <div className="flex items-center gap-2">
              <span className="text-success font-black text-xl">99.2%</span> <span className="text-sm border border-success/30 bg-success/5 text-success px-2 py-0.5 rounded-full">Accuracy</span>
            </div>
            <div className="w-full mt-4 text-xs font-bold text-text-muted tracking-widest uppercase">
              Anna University Supported: R2017 • R2019 • R2021 • R2025
            </div>
          </div>
        </div>

        {/* 3. PROBLEM -> SOLUTION (THE PAIN vs THE RELIEF) */}
        <div className="mb-40 max-w-6xl mx-auto px-6 relative">
          {/* Saffron-tinted atmospheric glow behind entire section */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-error/5 to-transparent -z-10 blur-[100px] opacity-60" />

          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary/15 to-error/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em] mb-6 shadow-sm"
            >
              The Manual Struggle
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
              Still doing this?{" "}
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="inline-block"
              >😩</motion.span>
            </h2>
            <p className="text-text-muted font-medium text-xl max-w-2xl mx-auto leading-relaxed">
              Manually typing every grade into an Excel sheet is{" "}
              <span className="text-primary font-bold underline decoration-primary/30 decoration-4">obsolete</span>
              . It&apos;s slow, boring, and one slip breaks your entire CGPA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {[
              {
                title: "The 2-Hour Manual Grind",
                desc: "Spending hours squinting at PDFs and manually typing grade points into a calculator.",
                icon: <FiClock />,
                badge: "Time Sink",
                color: "text-primary",
                bg: "bg-primary/10",
                border: "border-primary/20",
                hoverBorder: "hover:border-primary/40",
                badgeColor: "text-primary/50 group-hover:text-primary/70",
                hoverBg: "group-hover:bg-primary/5",
              },
              {
                title: "The Single-Digit Disaster",
                desc: "One tiny typo in a 3-credit subject can swing your CGPA from 8.5 to 8.2 instantly.",
                icon: <FiAlertTriangle />,
                badge: "High Risk",
                color: "text-error",
                bg: "bg-error/10",
                border: "border-error/20",
                hoverBorder: "hover:border-error/40",
                badgeColor: "text-error/40 group-hover:text-error/60",
                hoverBg: "group-hover:bg-error/5",
              },
              {
                title: "The Regulation Maze",
                desc: "Trying to decode AU R2017 vs R2021 grade tables, credits, and elective verticals.",
                icon: <FiFileText />,
                badge: "Confusion",
                color: "text-accent-1",
                bg: "bg-accent-1/10",
                border: "border-accent-1/20",
                hoverBorder: "hover:border-accent-1/40",
                badgeColor: "text-accent-1/40 group-hover:text-accent-1/60",
                hoverBg: "group-hover:bg-accent-1/5",
              },
              {
                title: "The Unknown Future",
                desc: "No idea if you qualify for placements or how one bad semester tanks your honors.",
                icon: <FiBriefcase />,
                badge: "Anxiety",
                color: "text-primary",
                bg: "bg-primary/10",
                border: "border-primary/20",
                hoverBorder: "hover:border-primary/40",
                badgeColor: "text-primary/40 group-hover:text-primary/60",
                hoverBg: "group-hover:bg-primary/5",
              },
            ].map((prob, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`group relative bg-bg-card border border-border ${prob.hoverBorder} rounded-[2.5rem] p-10 flex flex-col items-start gap-4 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden`}
              >
                {/* Saffron-tinted corner glow on hover */}
                <div className={`absolute top-0 right-0 w-48 h-48 ${prob.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none -z-0`} />

                <div className={`absolute top-0 right-0 p-6 text-[0.65rem] font-black uppercase tracking-widest ${prob.badgeColor} transition-colors`}>
                  {prob.badge}
                </div>
                <div className={`relative z-10 text-4xl p-4 ${prob.bg} ${prob.border} border rounded-3xl group-hover:scale-110 transition-all duration-500 ${prob.color}`}>
                  {prob.icon}
                </div>
                <div className="relative z-10 mt-4">
                  <h3 className={`font-black text-2xl tracking-tight text-text-primary mb-3 group-hover:${prob.color} transition-colors`}>{prob.title}</h3>
                  <p className="text-text-muted font-medium leading-relaxed">{prob.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>


        {/* 4. HOW IT WORKS */}
        <div className="mb-32 pt-24 border-t border-border/50 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">3 steps. 30 seconds. Done.</h2>
            <p className="text-text-muted font-medium text-lg">We handle the complex math and AU regulations. You just review the results.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
            {/* Desktop Connecting Line */}
            <div className="hidden md:block absolute top-[4.5rem] left-[16.66%] right-[16.66%] h-[2px] bg-border border-t-2 border-dashed border-border/50 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="w-36 h-36 bg-bg-card border border-border rounded-full flex items-center justify-center mb-8 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full" />
                <FiUploadCloud className="w-12 h-12 text-primary relative z-10" />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-text-primary text-bg-primary rounded-full flex items-center justify-center font-black text-xl border-4 border-bg-primary">1</div>
              </div>
              <h3 className="text-2xl font-black mb-3">Upload</h3>
              <p className="text-text-muted font-medium leading-relaxed px-4">
                Photo, PDF, or screenshot. <br /> Upload a single semester or all 8 at once. Automatically organizes by subject.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center group mt-8 md:mt-0">
              <div className="w-36 h-36 bg-bg-card border border-border rounded-full flex items-center justify-center mb-8 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative">
                <div className="absolute inset-0 bg-accent-1/5 rounded-full" />
                <FiCpu className="w-12 h-12 text-accent-1 relative z-10" />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-text-primary text-bg-primary rounded-full flex items-center justify-center font-black text-xl border-4 border-bg-primary">2</div>
              </div>
              <h3 className="text-2xl font-black mb-3">AI Engine Reads</h3>
              <p className="text-text-muted font-medium leading-relaxed px-4">
                Our bespoke 7-layer OCR pipeline extracts every subject code, grade, and credit, applying your specific regulation rules.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center group mt-8 md:mt-0">
              <div className="w-36 h-36 bg-bg-card border-primary/30 rounded-full flex items-center justify-center mb-8 shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,80,10,0.2)_0%,transparent_70%)] animate-pulse" />
                <FiFileText className="w-12 h-12 text-text-primary relative z-10" />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-black text-xl border-4 border-bg-primary shadow-sm">3</div>
              </div>
              <h3 className="text-2xl font-black mb-3">Get Results</h3>
              <p className="text-text-muted font-medium leading-relaxed px-4">
                Instantly see your verified GPA, CGPA, and degree classification in a beautiful, shareable dashboard report.
              </p>
            </div>
          </div>
        </div>

        {/* 5. HIGHLIGHT FEATURE: WHAT-IF SIMULATOR */}
        <div className="mb-32 relative max-w-[1200px] mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-card-alt rounded-[40px] shadow-2xl border border-border overflow-hidden -z-10" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-1/5 rounded-full blur-[100px]" />

          <div className="p-10 md:p-16 flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8 shadow-sm">
              <FiActivity className="w-4 h-4 animate-pulse" /> Superpower Included
            </div>

            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-text-primary">
              The "What-If" Simulator
            </h2>

            <p className="text-lg md:text-xl text-text-muted max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
              Need 8.5 for placement? Wondering what grades you need next semester to hit First Class with Distinction? Enter your target CGPA, and our simulator reverse-engineers exactly what you need to achieve it.
            </p>

            <button onClick={handleTryDemo} className="bg-primary hover:bg-[#E65C00] text-white font-black px-10 py-5 rounded-full text-xl shadow-[0_15px_30px_rgba(212,80,10,0.3)] hover:shadow-[0_20px_40px_rgba(212,80,10,0.4)] hover:-translate-y-1 transition-all duration-300">
              Try the Simulator
            </button>
          </div>
        </div>

        {/* 9. FAQ */}
        <div className="mb-32 max-w-3xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is it completely free?", a: "Yes, calculating your CGPA and downloading reports is 100% free." },
              { q: "Do you save my marksheets?", a: "No. Marksheets are processed purely in memory and immediately discarded. We only save the extracted grades if you create an account." },
              { q: "What if the AI reads a grade wrong?", a: "We have a built-in verification step where you can manually click and edit any subject before it goes to the final calculation." },
              { q: "Does it handle arrear passes?", a: "Yes. Our engine merges duplicate subjects and always prefers the highest passing grade, aligning with Anna University's regulations." }
            ].map((faq, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-2xl p-6">
                <h4 className="font-bold text-lg mb-2 text-text-primary">{faq.q}</h4>
                <p className="text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 10. FINAL CTA */}
        <div className="text-center pb-20 border-t border-border/50 pt-20">
          <h2 className="text-5xl font-black mb-8">Ready to see your real CGPA?</h2>
          <button onClick={handleGetStarted} className="px-10 py-5 bg-text-primary text-bg-primary rounded-full font-black text-xl hover:scale-105 transition-transform shadow-xl">
            Calculate Now — It's Free
          </button>
        </div>
      </div>
    </main>
  );
}
