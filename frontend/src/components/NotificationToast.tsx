'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

interface NotificationToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
}

export const NotificationToast = ({ message, type, isVisible, onClose }: NotificationToastProps) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[min(90vw,400px)]"
            >
                <div className={`
                    bg-bg-card border-2 shadow-2xl rounded-3xl p-4 flex items-center gap-4 backdrop-blur-xl
                    ${type === 'success' ? 'border-success/30 shadow-success/10' : type === 'error' ? 'border-error/30 shadow-error/10' : 'border-primary/30 shadow-primary/10'}
                `}>
                    <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl
                        ${type === 'success' ? 'bg-success/10 text-success' : type === 'error' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}
                    `}>
                        <Icon icon={type === 'success' ? "solar:check-circle-bold-duotone" : type === 'error' ? "solar:danger-bold-duotone" : "solar:info-circle-bold-duotone"} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-text-primary leading-tight">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-bg-card-alt rounded-xl transition-colors text-text-muted"
                    >
                        <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default NotificationToast;
