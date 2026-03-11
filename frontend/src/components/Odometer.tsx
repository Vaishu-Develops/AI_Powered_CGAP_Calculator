'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface OdometerProps {
    value: number;
    delay?: number;
}

export default function Odometer({ value, delay = 0.9 }: OdometerProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            let start = 0;
            const end = value;
            const duration = 2000;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = start + (end - start) * easeOut;

                setDisplayValue(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }, delay * 1000);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    const formattedValue = displayValue.toFixed(2);
    const [whole, decimal] = formattedValue.split('.');

    return (
        <div className="flex items-baseline font-black tracking-normal overflow-hidden h-[1.2em] pr-2">
            <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay }}
            >
                {whole}
            </motion.span>
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
            >
                .
            </motion.span>
            <motion.span
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.4 }}
            >
                {decimal}
            </motion.span>
        </div>
    );
}
