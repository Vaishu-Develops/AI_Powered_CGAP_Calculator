'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface UploadSectionProps {
    onFilesSelected: (files: File[]) => void;
    isDisabled?: boolean;
}

export default function UploadSection({ onFilesSelected, isDisabled }: UploadSectionProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) processFiles(Array.from(e.dataTransfer.files));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) processFiles(Array.from(e.target.files));
    };

    const processFiles = (files: File[]) => {
        const validFiles = files.filter(f =>
            (f.type.startsWith('image/') || f.type === 'application/pdf') && f.size <= 20 * 1024 * 1024
        );

        if (validFiles.length === 0) {
            setError('Please upload valid images or PDFs under 20MB.');
            return;
        }

        if (validFiles.length < files.length) {
            setError('Some files were ignored (invalid format or >20MB).');
        } else {
            setError(null);
        }

        const newPreviews = validFiles.map(f => ({
            url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
            name: f.name
        }));

        setPreviews(newPreviews);
        onFilesSelected(validFiles);
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4">
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative group rounded-[32px] p-1 transition-all duration-500 bg-gradient-to-br ${isDragging
                    ? 'from-primary via-accent-2 to-primary shadow-[0_0_40px_rgba(212,80,10,0.25)]'
                    : 'from-border via-border/50 to-border'
                    }`}
            >
                <div
                    className="relative rounded-[31px] bg-bg-card p-8 md:p-12 flex flex-col items-center text-center overflow-hidden"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {/* Animated Background Glow */}
                    <AnimatePresence>
                        {isDragging && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] z-0"
                            />
                        )}
                    </AnimatePresence>

                    {/* Animated Border SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        <rect
                            x="2" y="2"
                            width="calc(100% - 4px)"
                            height="calc(100% - 4px)"
                            rx="29"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="8 12"
                            className={`transition-colors duration-500 ${isDragging ? 'text-primary animate-[shimmer_2s_linear_infinite]' : 'text-border'
                                }`}
                            style={{
                                strokeDashoffset: isDragging ? 0 : 40,
                            }}
                        />
                    </svg>

                    <div className="relative z-20 flex flex-col items-center w-full">
                        {/* Interactive Icon Container */}
                        <motion.div
                            animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500 ${isDragging ? 'bg-primary text-white shadow-lg' : 'bg-primary/10 text-primary'
                                }`}
                        >
                            <FiUploadCloud className="w-10 h-10" />
                        </motion.div>

                        <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-2 tracking-tight">
                            {isDragging ? 'Drop to start analysis' : 'Upload Marksheets'}
                        </h3>
                        <p className="text-text-muted max-w-sm mb-8 leading-relaxed">
                            Drag & drop your semester results. We'll handle the calculation magic for you.
                        </p>

                        <div className="flex flex-wrap justify-center gap-3 mb-8">
                            {['JPG', 'PNG', 'WEBP', 'PDF'].map((fmt) => (
                                <span key={fmt} className="px-3 py-1 bg-bg-card-alt border border-border text-[10px] font-bold tracking-widest text-text-muted rounded-full uppercase">
                                    {fmt}
                                </span>
                            ))}
                        </div>

                        {/* File Previews */}
                        <AnimatePresence>
                            {previews.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-wrap justify-center gap-4 mb-8 w-full"
                                >
                                    {previews.slice(0, 3).map((file, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="relative w-16 h-16 rounded-xl border border-border overflow-hidden bg-bg-card-alt group/preview shadow-sm"
                                        >
                                            {file.url ? (
                                                <img src={file.url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FiFile className="w-6 h-6 text-primary" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                                <FiCheck className="text-white w-6 h-6" />
                                            </div>
                                        </motion.div>
                                    ))}
                                    {previews.length > 3 && (
                                        <div className="w-16 h-16 rounded-xl border border-dashed border-primary flex items-center justify-center font-bold text-primary bg-primary/5">
                                            +{previews.length - 3}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <label className="relative overflow-hidden group cursor-pointer">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-shadow duration-300 ${isDisabled
                                    ? 'bg-neutral/20 text-text-muted cursor-not-allowed'
                                    : 'bg-primary text-white shadow-[0_10px_30px_rgba(212,80,10,0.2)] hover:shadow-[0_15px_40px_rgba(212,80,10,0.3)]'
                                    }`}
                            >
                                <FiUploadCloud className="w-5 h-5" />
                                {previews.length > 0 ? 'Add more files' : 'Select Files'}
                            </motion.div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,application/pdf"
                                multiple
                                onChange={handleChange}
                                disabled={isDisabled}
                            />
                        </label>
                    </div>
                </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-6 p-4 rounded-2xl bg-accent-2/10 border border-accent-2/20 flex items-center gap-3 text-accent-2 font-medium"
                    >
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
