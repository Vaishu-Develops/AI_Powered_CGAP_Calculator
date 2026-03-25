'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const router = useRouter();
    const { login } = useUser();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Authentication Logic
        login({
            id: Math.random().toString(36).substr(2, 9),
            name: isLogin ? (email.split('@')[0] || 'User') : name,
            email: email,
        });
        router.push('/home');
    };

    return (
        <main
            style={{
                minHeight: '100vh',
                background: 'var(--background)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                color: 'var(--color-text-primary)'
            }}
        >
            <ParticleBackground />

            {/* Saffron Glow Background */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div
                    className="animate-aurora"
                    style={{
                        position: 'absolute', top: '10%', left: '20%', width: '60%', height: '60%',
                        background: 'radial-gradient(circle, rgba(212,80,10,0.06) 0%, transparent 70%)',
                        borderRadius: '50%', filter: 'blur(80px)',
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-bg-card/80 backdrop-blur-3xl border border-border p-8 rounded-[32px] shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black tracking-tight mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-text-muted font-medium">
                        {isLogin ? 'Sign in to access your saved CGPA reports.' : 'Join to save unlimited reports across semesters.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-bold text-text-muted mb-1 ml-2">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                placeholder="Student Name"
                                className="w-full bg-bg-card-alt border border-border/50 text-text-primary px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-text-muted mb-1 ml-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            placeholder="you@university.edu"
                            className="w-full bg-bg-card-alt border border-border/50 text-text-primary px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-muted mb-1 ml-2">Password</label>
                        <input
                            type="password"
                            required
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            placeholder="••••••••"
                            className="w-full bg-bg-card-alt border border-border/50 text-text-primary px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                    >
                        {isLogin ? 'Sign In ->' : 'Create Account ->'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm font-medium text-text-muted">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary font-bold hover:underline"
                    >
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </motion.div>
        </main>
    );
}
