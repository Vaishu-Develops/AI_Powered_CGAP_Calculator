'use client';

import { motion } from 'framer-motion';
import { FiCpu } from 'react-icons/fi';

interface LoadingSaffronProps {
    message?: string;
}

export default function LoadingSaffron({ message = 'Initializing Workspace...' }: LoadingSaffronProps) {
    return (
        <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden font-outfit">
            {/* Saffron Aurora Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-50">
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(212,80,10,0.12)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse"
                    style={{ animationDuration: '4s' }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Animated Logo / Ring */}
                <div className="relative mb-12">
                    {/* Dynamic Ring */}
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.05, 1],
                            borderRadius: ["38% 62% 63% 37% / 41% 44% 56% 59%", "50% 50% 50% 50% / 50% 50% 50% 50%", "38% 62% 63% 37% / 41% 44% 56% 59%"]
                        }}
                        transition={{
                            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#D4500A] via-[#F7C59F] to-[#D4500A] shadow-[0_0_50px_rgba(212,80,10,0.3)] relative overflow-hidden group"
                    >
                        {/* Shimmer effect inside the ring */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-30" />
                    </motion.div>

                    {/* Central Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-10 h-10 md:w-14 md:h-14 bg-bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl"
                        >
                            <FiCpu className="text-primary w-5 h-5 md:w-7 md:h-7" />
                        </motion.div>
                    </div>
                </div>

                {/* Text Area */}
                <div className="text-center space-y-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-3xl font-black tracking-tight text-text-primary uppercase italic"
                    >
                        CGPA <span className="text-primary">Intel</span>
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <p className="text-text-muted text-sm font-black uppercase tracking-[0.2em] animate-pulse">
                            {message}
                        </p>

                        {/* Minimal Progress Bar */}
                        <div className="w-48 h-1 bg-bg-card-alt border border-border rounded-full overflow-hidden mt-2">
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Atmospheric Shards */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [-10, 10],
                        x: i % 2 === 0 ? [-5, 5] : [5, -5],
                        opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute w-4 h-4 rounded-lg bg-[#D4500A]/20 blur-[2px] pointer-events-none"
                    style={{
                        top: `${20 + i * 20}%`,
                        left: `${i % 2 === 0 ? 10 : 80 + i * 2}%`,
                    }}
                />
            ))}
        </main>
    );
}
