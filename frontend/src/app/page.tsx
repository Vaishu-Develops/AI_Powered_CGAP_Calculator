'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FiArrowRight, FiUploadCloud, FiCpu, FiCheckCircle, FiXCircle, FiStar, FiPlus, FiMinus, FiActivity, FiClock, FiAlertTriangle, FiFileText, FiBriefcase, FiFrown } from 'react-icons/fi';
import { useUser } from '@/context/UserContext';
import { useCalcFlow } from '@/context/CalcFlowContext';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });
import { TextGenerateEffect } from '@/components/TextGenerateEffect';
import TextPressure from '@/components/TextPressure';
import PricingSection from '@/components/PricingSection';
import FeedbackSection from '@/components/FeedbackSection';
import FlashSaleBanner from '@/components/FlashSaleBanner';

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
    // Check if demo has already been used on this device
    const demoUsed = localStorage.getItem('saffron_demo_consumed');

    if (demoUsed === 'true') {
      alert("You've already used your free trial. Sign up to save your reports and calculate more semesters!");
      router.push('/auth');
      return;
    }

    resetFlow();
    if (!user && !isDemo) {
      startDemo(true); // Start as GPA Only Demo
    }
    router.push('/home');
  };

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary relative overflow-hidden font-outfit selection:bg-primary/30">
      <FlashSaleBanner />
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
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-black tracking-tighter cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-primary">CGPA</span> Intel
        </motion.div>

        {/* Central Links */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center gap-10 text-xs font-black uppercase tracking-[0.2em] text-text-muted/60"
        >
          <a href="/#features" className="hover:text-primary transition-colors duration-300">Features</a>
          <a href="/#pricing" className="hover:text-primary transition-colors duration-300">Pricing</a>
          <a href="/#feedback" className="hover:text-primary transition-colors duration-300">Give Feedback</a>
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
        <div className="pt-20 md:pt-32 pb-16 text-center max-w-5xl mx-auto relative z-10">

          {/* Floating Atmospheric Shards (Reduced count & size for better performance) */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{
                opacity: [0, 0.15, 0],
                y: [-15, 15],
                x: i % 2 === 0 ? [-8, 8] : [8, -8],
                rotate: [0, 90]
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5
              }}
              className={`absolute hidden lg:block w-6 h-6 rounded-lg bg-primary/20 blur-[2px] pointer-events-none -z-10`}
              style={{
                top: `${25 * i}%`,
                left: i % 2 === 0 ? '2%' : '95%'
              }}
            />
          ))}

          {/* Holographic AI Badge (Refined scaling) */}
          {/* Saffron Engine Activated Badge - Premium Animation */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="group relative inline-flex items-center gap-2 px-6 py-2 rounded-full bg-bg-card/40 backdrop-blur-3xl border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-12 shadow-2xl overflow-hidden cursor-default"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent-1/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-transparent to-primary/30 animate-spin-slow opacity-20" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center animate-pulse">
                <FiCpu className="w-2.5 h-2.5" />
              </div>
              <span>Saffron Engine Activated</span>
            </div>
          </motion.div>

          {/* Liquid Animated Heading - Premium Animation Components */}
          <div className="relative mb-14 group/heading flex flex-col items-center">
            <h1 className="sr-only">Stop calculating manually. AI reads it all.</h1>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[180%] bg-[radial-gradient(circle_at_center,rgba(212,80,10,0.18)_0%,transparent_70%)] blur-[120px] -z-10 opacity-40 group-hover/heading:opacity-60 transition-opacity duration-1000" />

            {/* Main Title: Sequential Blur Reveal */}
            <TextGenerateEffect
              words="Stop calculating manually."
              className="text-text-primary text-center text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-none"
            />

            {/* Punchline: Interactive Text Pressure Animation */}
            <div className="relative h-[110px] md:h-[130px] lg:h-[160px] w-full mt-2 -mb-4 flex items-center justify-center pointer-events-auto">
              <TextPressure
                text="AI reads it all"
                flex
                alpha={false}
                stroke={false}
                width
                weight
                italic
                textColor="#D4500A"
                minFontSize={32}
              />
            </div>

            {/* Saffron Data Beam SVG (Pulsating) */}
            <motion.div
              animate={{ height: [128, 160, 128], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[1px] pointer-events-none -z-10 bg-gradient-to-b from-primary/60 via-primary/20 to-transparent"
            />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
            className="text-lg md:text-2xl text-text-muted font-medium mb-12 max-w-3xl mx-auto leading-relaxed px-4"
          >
            Drop marksheets. Get your report in <span className="text-primary font-black underline decoration-primary/20 decoration-[4px] underline-offset-8">5 seconds.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-20"
          >
            <button
              onClick={handleGetStarted}
              className="group relative px-12 py-5 bg-bg-primary text-white rounded-full font-black text-xl overflow-hidden shadow-[0_20px_40px_-5px_rgba(212,80,10,0.4)] hover:shadow-[0_30px_60px_-10px_rgba(212,80,10,0.6)] transition-all duration-500 hover:-translate-y-1.5 border border-white/10"
            >
              <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#FF8C42] opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center gap-4">
                <span>Start Calculation</span>
                <FiArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
              </div>
            </button>

            <button
              onClick={handleTryDemo}
              className="group px-12 py-5 bg-white/5 hover:bg-primary/5 border border-white/10 hover:border-primary/40 text-text-muted hover:text-primary font-black text-xl rounded-full backdrop-blur-3xl transition-all duration-500 shadow-xl flex items-center"
            >
              Try Live Demo
              <FiActivity className="ml-3 group-hover:scale-110 transition-transform text-primary/40 group-hover:text-primary" />
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

        {/* 2. SOCIAL PROOF PILLS */}
        <div className="relative z-20 -mt-8 mb-32 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4 px-4"
          >
            {/* Stat Pill 1: Students */}
            <div className="group px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-3 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_0_20px_rgba(212,80,10,0.1)]">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-text-primary tracking-tighter leading-none">12,847</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">Global Students</span>
              </div>
            </div>

            {/* Stat Pill 2: Scanned */}
            <div className="group px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-3 hover:border-accent-1/40 transition-all duration-500 hover:shadow-[0_0_20px_rgba(247,197,159,0.1)]">
              <FiUploadCloud className="text-accent-1 text-xl" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-text-primary tracking-tighter leading-none">98,000+</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">Marks scanned</span>
              </div>
            </div>

            {/* Stat Pill 3: Rating */}
            <div className="group px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-3 hover:border-yellow-500/40 transition-all duration-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]">
              <div className="flex text-yellow-500 gap-0.5">
                <FiStar className="fill-current w-3 h-3" />
                <FiStar className="fill-current w-3 h-3" />
                <FiStar className="fill-current w-3 h-3" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-text-primary tracking-tighter leading-none">4.9/5</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">Student Rating</span>
              </div>
            </div>

            {/* Stat Pill 4: Accuracy */}
            <div className="group px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-3 hover:border-success/40 transition-all duration-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <FiCheckCircle className="text-success text-xl" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-success tracking-tighter leading-none">99.2%</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1">AI Precision</span>
              </div>
            </div>
          </motion.div>

          {/* Supported Regulations Marquee/Pill */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 px-6 py-2 bg-primary/5 border border-primary/10 rounded-full flex items-center gap-4 text-[10px] font-black tracking-[0.2em] text-primary/60 uppercase"
          >
            <span>AU Regulations</span>
            <div className="flex gap-4 border-l border-primary/20 pl-4">
              <span>R2017</span>
              <span>R2019</span>
              <span className="text-primary">R2021</span>
              <span>R2025</span>
            </div>
          </motion.div>
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

          <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-6 mb-10">
            {/* Card 1: THE MANUAL GRIND (Wide - Spans 4 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-4 group relative bg-bg-card/40 backdrop-blur-xl border border-border/60 hover:border-primary/40 rounded-[2.5rem] p-10 flex flex-col justify-between gap-6 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden min-h-[320px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors duration-700" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl text-primary shadow-inner border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                    <FiClock />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 group-hover:text-primary/70 transition-colors">Time Sink</span>
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">The 2-Hour Manual Grind</h3>
                <p className="text-text-muted font-medium text-lg leading-relaxed max-w-md">
                  Spending hours squinting at PDFs and manually typing grade points into a calculator. It&apos;s a soul-crushing repetitive task.
                </p>
              </div>
              <div className="relative z-10 h-2 bg-border/40 rounded-full overflow-hidden w-48 border border-white/5">
                <motion.div
                  initial={{ width: "30%" }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                  className="h-full bg-primary/40"
                />
              </div>
            </motion.div>

            {/* Card 2: THE REGULATION MAZE (Small - Spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="md:col-span-2 group relative bg-bg-card/40 backdrop-blur-xl border border-border/60 hover:border-accent-1/40 rounded-[2.5rem] p-8 flex flex-col items-center text-center justify-center gap-4 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-accent-1/5 rounded-full blur-3xl group-hover:bg-accent-1/10 transition-colors duration-700" />
              <div className="w-14 h-14 rounded-2xl bg-accent-1/10 flex items-center justify-center text-2xl text-accent-1 mb-2 group-hover:rotate-12 transition-transform duration-500">
                <FiFileText />
              </div>
              <h3 className="text-xl font-black tracking-tight">The Regulation Maze</h3>
              <p className="text-text-muted text-sm font-medium leading-relaxed">
                Trying to decode AU R2017 vs R2021 grade tables and elective verticals.
              </p>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-1/40 mt-4 underline decoration-accent-1/20 underline-offset-4">Confusion</span>
            </motion.div>

            {/* Card 3: THE UNKNOWN FUTURE (Small - Spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 group relative bg-gradient-to-br from-bg-card/40 to-[#121212]/5 backdrop-blur-xl border border-border/60 hover:border-text-muted/40 rounded-[2.5rem] p-8 flex flex-col justify-end gap-4 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full border border-border/50 flex items-center justify-center text-xl text-text-muted group-hover:border-primary/30 group-hover:text-primary transition-all">
                <FiBriefcase />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight mb-2">Unknown Future</h3>
                <p className="text-text-muted text-sm font-medium">
                  Qualifying for placements or tanking your honors? You just don&apos;t know.
                </p>
              </div>
              <span className="absolute top-8 right-8 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/30">Anxiety</span>
            </motion.div>

            {/* Card 4: THE DISASTER (Wide - Spans 4 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-4 group relative bg-bg-card/40 backdrop-blur-xl border border-border/60 hover:border-error/40 rounded-[2.5rem] p-10 flex md:flex-row flex-col items-center gap-10 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-error/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-1000 -z-10" />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-xl text-error">
                    <FiAlertTriangle />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-error/50">High Risk</span>
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">The Single-Digit Disaster</h3>
                <p className="text-text-muted font-medium text-lg leading-relaxed">
                  One tiny typo in a 3-credit subject can swing your CGPA from <span className="text-success font-black">8.5</span> to <span className="text-error font-black">8.2</span> instantly.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 w-full max-w-[200px] flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-700 relative">
                <div className="absolute inset-0 bg-error/10 animate-pulse-slow rounded-3xl" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest relative">TYPO ERROR</span>
                <div className="text-4xl font-black text-error relative flex items-center gap-2">
                  <span className="opacity-40 text-lg line-through">8.54</span>
                  <span>8.12</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden relative">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-error to-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </div>

        </div>


        {/* 4. HOW IT WORKS */}
        <div id="features" className="mb-48 pt-24 relative overflow-hidden scroll-mt-24">
          {/* Subtle background flow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(242,101,34,0.03),transparent_70%)] pointer-events-none" />

          <div className="text-center mb-24 relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black mb-4 tracking-tighter"
            >
              3 steps. 30 seconds. Done.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-text-muted font-medium text-xl max-w-xl mx-auto"
            >
              We handle the complex math and AU regulations. <br className="hidden md:block" /> You just review the results.
            </motion.p>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative">
            {/* Desktop Connecting Flow Path (Animated SVG) */}
            <div className="hidden md:block absolute top-[120px] left-[15%] right-[15%] h-[100px] -z-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 1000 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M0 50C150 50 150 10 300 10C450 10 450 90 600 90C750 90 750 50 1000 50" stroke="url(#paint0_linear)" strokeWidth="3" strokeDasharray="10 10" />
                <defs>
                  <linearGradient id="paint0_linear" x1="0" y1="50" x2="1000" y2="50" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F26522" stopOpacity="0" />
                    <stop offset="0.5" stopColor="#F26522" />
                    <stop offset="1" stopColor="#F26522" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative z-10">
              {/* Step 1: UPLOAD */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative group pt-12 md:pt-0"
              >
                <div className="absolute -top-12 md:-top-20 left-4 text-[8rem] md:text-[12rem] font-black text-primary/[0.08] select-none pointer-events-none group-hover:text-primary/[0.15] transition-colors duration-700 leading-none">01</div>

                <div className="bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-[3rem] p-10 hover:shadow-2xl transition-all duration-700 group-hover:-translate-y-4 hover:border-primary/30 relative overflow-hidden">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-4xl text-primary mb-8 shadow-inner border border-primary/5 group-hover:scale-110 transition-transform duration-500">
                    <FiUploadCloud />
                  </div>
                  <h3 className="text-3xl font-black mb-4 tracking-tight group-hover:text-primary transition-colors">Upload</h3>
                  <p className="text-text-muted font-medium text-lg leading-relaxed">
                    Photo, PDF, or screenshot. <br className="hidden md:block" /> Upload a single semester or all 8 at once.
                  </p>
                  <div className="mt-8 flex gap-2">
                    <span className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-black text-primary/60 uppercase">PDF</span>
                    <span className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-black text-primary/60 uppercase">Marksheets</span>
                    <span className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-black text-primary/60 uppercase">Gallery</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 2: AI READS (Staggered Vertical Offset) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative group pt-12 md:pt-16"
              >
                <div className="absolute -top-12 md:-top-4 left-4 text-[8rem] md:text-[12rem] font-black text-accent-1/[0.08] select-none pointer-events-none group-hover:text-accent-1/[0.15] transition-colors duration-700 leading-none">02</div>

                <div className="bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-[3rem] p-10 hover:shadow-2xl transition-all duration-700 group-hover:-translate-y-4 hover:border-accent-1/30 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-1/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-20 h-20 rounded-3xl bg-accent-1/10 flex items-center justify-center text-4xl text-accent-1 mb-8 shadow-inner border border-accent-1/5 group-hover:rotate-6 transition-transform duration-500">
                    <FiCpu />
                  </div>
                  <h3 className="text-3xl font-black mb-4 tracking-tight group-hover:text-accent-1 transition-colors">AI Reads</h3>
                  <p className="text-text-muted font-medium text-lg leading-relaxed">
                    Saffron engine extracts every grade and credit, applying AU specific regulation rules in <span className="text-accent-1 font-black underline decoration-accent-1/30 decoration-2">30 seconds</span>.
                  </p>
                </div>
              </motion.div>

              {/* Step 3: GET RESULTS */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative group pt-12 md:pt-0"
              >
                <div className="absolute -top-12 md:-top-20 left-4 text-[8rem] md:text-[12rem] font-black text-data/[0.08] select-none pointer-events-none group-hover:text-data/[0.15] transition-colors duration-700 leading-none">03</div>

                <div className="bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-[3rem] p-10 hover:shadow-2xl transition-all duration-700 group-hover:-translate-y-4 hover:border-data/30 relative overflow-hidden">
                  <div className="w-20 h-20 rounded-3xl bg-data/10 flex items-center justify-center text-4xl text-data mb-8 shadow-inner border border-data/5 group-hover:scale-110 transition-transform duration-500">
                    <FiFileText />
                  </div>
                  <h3 className="text-3xl font-black mb-4 tracking-tight group-hover:text-data transition-colors">Get Results</h3>
                  <p className="text-text-muted font-medium text-lg leading-relaxed">
                    Instantly see your verified GPA and CGPA in a beautiful, shareable dashboard report.
                  </p>
                  <div className="mt-8 flex -space-x-3">
                    <img src="/avatar_1.png" alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-bg-primary object-cover" />
                    <img src="/avatar_2.png" alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-bg-primary object-cover" />
                    <img src="/avatar_3.png" alt="Student Profile" className="w-10 h-10 rounded-full border-2 border-bg-primary object-cover" />
                    <div className="w-10 h-10 rounded-full bg-data text-[10px] font-black text-white flex items-center justify-center border-2 border-bg-primary shadow-lg">+12k</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* 5. HIGHLIGHT FEATURE: WHAT-IF SIMULATOR */}
        <div className="mb-48 relative max-w-[1240px] mx-auto group">
          {/* Pitch Black Bento Container */}
          <div className="absolute inset-0 bg-[#0A0A0A] rounded-[4rem] shadow-[0_0_100px_rgba(212,80,10,0.15)] border border-white/5 overflow-hidden -z-10" />

          {/* Animated Liquid Background Overlay */}
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(212,80,10,0.15),transparent_50%)] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_100%,rgba(247,197,159,0.08),transparent_50%)] pointer-events-none" />

          <div className="p-10 md:p-24 flex flex-col md:flex-row items-center gap-16 relative z-10">
            <div className="flex-1 text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] mb-10"
              >
                <FiActivity className="w-4 h-4 animate-pulse" /> Superpower Included
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-black mb-8 tracking-tighter text-white leading-tight"
              >
                The "What-If" <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1">Simulator.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-gray-400 mb-12 font-medium leading-relaxed"
              >
                Need 8.5 for placement? Wondering what grades you need next semester to hit <span className="text-white font-bold">First Class with Distinction</span>?
                Enter your target, and our engine reverse-engineers the exact grades you need.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                onClick={handleTryDemo}
                className="group relative px-10 py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-[0_20px_40px_rgba(212,80,10,0.3)] hover:shadow-[0_25px_50px_rgba(212,80,10,0.5)] transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 border border-white/10"
              >
                <span>Unlock Simulator</span>
                <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </div>

            {/* Simulator Mockup Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex-1 w-full max-w-sm relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Target CGPA</span>
                  <div className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black rounded-lg">LIVE SIM</div>
                </div>

                <div className="text-6xl font-black text-white mb-10 text-center tracking-tighter">9.12</div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-tight">Sem 7 Goal</span>
                    <span className="text-xl font-black text-success">"S" Grade</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-tight">Sem 8 Goal</span>
                    <span className="text-xl font-black text-accent-1">"A" Grade</span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success">
                    <FiCheckCircle />
                  </div>
                  <span className="text-xs font-bold text-gray-400 leading-tight">Minimum requirements to achieve your target.</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 9. FAQ */}
        <div className="mb-48 max-w-4xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center mb-16 tracking-tighter"
          >
            Got Questions?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "Is it completely free?", a: "Yes, calculating your CGPA and downloading reports is 100% free." },
              { q: "Do you save my marksheets?", a: "No. Marksheets are processed purely in memory and immediately discarded. We only save grades if you create an account." },
              { q: "What if the AI reads a grade wrong?", a: "We have a built-in verification step where you can manually click and edit any subject before it goes to the final calculation." },
              { q: "Does it handle arrear passes?", a: "Yes. Our engine merges duplicate subjects and always prefers the highest passing grade, aligning with Anna University's regulations." }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 hover:border-primary/20 transition-all duration-500 hover:shadow-2xl"
              >
                <h4 className="font-black text-lg mb-3 text-text-primary group-hover:text-primary transition-colors">{faq.q}</h4>
                <p className="text-text-muted text-sm font-medium leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 10. PRICING */}
        <PricingSection />

        {/* 11. FEEDBACK */}
        <FeedbackSection />

        {/* 12. FINAL CTA: SAFFRON CENTERPIECE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative text-center pb-32 pt-24 border-t border-white/5"
        >
          {/* Saffron Sun Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -z-10" />

          <h2 className="text-5xl md:text-7xl font-black mb-10 tracking-tighter leading-tight">
            Ready to see your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1">real CGPA?</span>
          </h2>

          <button
            onClick={handleGetStarted}
            className="group relative px-14 py-7 bg-bg-primary text-white rounded-[2.5rem] font-black text-2xl overflow-hidden shadow-[0_40px_80px_-20px_rgba(212,80,10,0.5)] hover:shadow-[0_50px_100px_-20px_rgba(212,80,10,0.7)] transition-all duration-500 hover:-translate-y-2 border border-white/10"
          >
            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#FF8C42] opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center gap-4">
              <span>Calculate Now — It's Free</span>
              <FiArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
            </div>
          </button>

          <p className="mt-8 text-text-muted font-bold text-sm tracking-widest uppercase opacity-40">
            No credit card required. No bullsh*t.
          </p>
        </motion.div>

        {/* 11. FOOTER */}
        <footer className="mt-20 py-12 border-t border-white/5 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-black tracking-tighter opacity-50">
              <span className="text-primary">CGPA</span> Intel
            </div>

            <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/40">
              <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
              <a href="#feedback" className="hover:text-primary transition-colors">Give Feedback</a>
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>

            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/20">
              © 2026 Saffron Labs. Build for Students.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
