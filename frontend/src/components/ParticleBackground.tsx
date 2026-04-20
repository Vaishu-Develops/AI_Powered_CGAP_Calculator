'use client';

import { useRef, useEffect } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
    color: string;
    connections: number[];
}

const COLORS = ['#D4500A', '#1A1A2E', '#F7C59F', '#A78BFA', '#059669'];

export default function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const particles = useRef<Particle[]>([]);
    const frameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = Math.floor(window.innerWidth * dpr);
            canvas.height = Math.floor(window.innerHeight * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        // Create particles
        const viewportArea = window.innerWidth * window.innerHeight;
        const count = Math.min(52, Math.floor(viewportArea / 26000));
        particles.current = Array.from({ length: count }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            connections: [],
        }));

        const draw = () => {
            if (document.hidden) {
                animRef.current = requestAnimationFrame(draw);
                return;
            }

            frameRef.current += 1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update & draw particles
            for (const p of particles.current) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
                if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
                ctx.fill();
            }

            // Draw connections every other frame to reduce main-thread load.
            if (frameRef.current % 2 === 0) {
                const maxDist = 120;
                const maxDistSq = maxDist * maxDist;
                let linesDrawn = 0;
                const maxLines = 180;

                for (let i = 0; i < particles.current.length; i++) {
                    if (linesDrawn >= maxLines) break;
                    for (let j = i + 1; j < particles.current.length; j++) {
                        const a = particles.current[i];
                        const b = particles.current[j];
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < maxDistSq) {
                            const alpha = (1 - distSq / maxDistSq) * 0.12;
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y);
                            ctx.lineTo(b.x, b.y);
                            ctx.strokeStyle = `rgba(212,80,10,${alpha.toFixed(3)})`;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                            linesDrawn += 1;
                            if (linesDrawn >= maxLines) break;
                        }
                    }
                }
            }

            animRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}
