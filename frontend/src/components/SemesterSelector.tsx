'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiX, FiUploadCloud, FiAlertCircle } from 'react-icons/fi';

export interface SemSlot {
    sem: number;
    file: File | null;
    previewUrl: string | null;
}

interface SemesterUploadGridProps {
    slots: SemSlot[];
    onSlotsChange: (slots: SemSlot[]) => void;
}

/** Fingerprint: name + size (fast, good-enough exact-duplicate detection) */
const fingerprint = (f: File) => `${f.name}::${f.size}`;

export default function SemesterUploadGrid({ slots, onSlotsChange }: SemesterUploadGridProps) {
    const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const [dupToast, setDupToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setDupToast(msg);
        setTimeout(() => setDupToast(null), 5000);
    };

    const addSlot = () => {
        const usedSems = new Set(slots.map(s => s.sem));
        for (let i = 1; i <= 8; i++) {
            if (!usedSems.has(i)) {
                onSlotsChange([...slots, { sem: i, file: null, previewUrl: null }]);
                return;
            }
        }
    };

    const removeSlot = (sem: number) => {
        onSlotsChange(slots.filter(s => s.sem !== sem));
    };

    const handleFileChange = (sem: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ── Layer 1: Exact duplicate detection ──
        const fp = fingerprint(file);
        const existingSlot = slots.find(s => s.file && fingerprint(s.file) === fp && s.sem !== sem);
        if (existingSlot) {
            showToast(`This file is already in the Sem ${existingSlot.sem} slot. Duplicate removed.`);
            // Reset the input so user can choose another file
            if (inputRefs.current[sem]) inputRefs.current[sem]!.value = '';
            return;
        }

        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
        onSlotsChange(slots.map(s => s.sem === sem ? { ...s, file, previewUrl } : s));
    };

    const canAddMore = slots.length < 8;

    return (
        <div style={{ maxWidth: '780px', margin: '0 auto 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <p style={{
                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em',
                    textTransform: 'uppercase', color: '#78716C',
                    fontFamily: 'Outfit, sans-serif', marginBottom: '4px',
                }}>
                    Multi-Semester CGPA
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{
                        fontSize: '20px', fontWeight: 900, color: '#0F0A00',
                        fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', margin: 0,
                    }}>
                        Upload marksheet for each semester
                    </h3>
                    <span style={{
                        fontSize: '11px', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                        color: '#78716C', background: '#FFF6EC', border: '1px solid #FDE8D8',
                        borderRadius: '999px', padding: '4px 12px',
                    }}>
                        {slots.filter(s => s.file).length} / {slots.length} uploaded
                    </span>
                </div>
            </div>

            {/* ── Duplicate toast ── */}
            <AnimatePresence>
                {dupToast && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#FFFBEB',
                            border: '1.5px solid #FDE68A',
                            borderRadius: '14px',
                            padding: '12px 16px',
                            marginBottom: '16px',
                        }}
                    >
                        <FiAlertCircle style={{ color: '#D97706', flexShrink: 0, width: 18, height: 18 }} />
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: '#92400E' }}>
                            {dupToast}
                        </span>
                        <button
                            onClick={() => setDupToast(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', padding: 0 }}
                        >
                            <FiX style={{ width: 16, height: 16 }} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid of semester cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                <AnimatePresence>
                    {slots.map(slot => (
                        <motion.div
                            key={slot.sem}
                            layout
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            style={{ position: 'relative' }}
                        >
                            {/* Remove (×) button */}
                            <button
                                onClick={() => removeSlot(slot.sem)}
                                style={{
                                    position: 'absolute', top: '-8px', right: '-8px',
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: '#1A1A2E', border: 'none', cursor: 'pointer',
                                    zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                }}
                            >
                                <FiX style={{ color: 'white', width: 11, height: 11 }} />
                            </button>

                            {/* Upload card */}
                            <motion.label
                                htmlFor={`sem-upload-${slot.sem}`}
                                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(212,80,10,0.16)' }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    width: '200px', height: '185px',
                                    borderRadius: '16px',
                                    border: slot.file ? '2px solid #D4500A' : '1.5px dashed #F7C59F',
                                    background: slot.previewUrl ? 'transparent' : '#FFF6EC',
                                    cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', overflow: 'hidden',
                                    transition: 'border-color 0.18s',
                                }}
                            >
                                {slot.previewUrl ? (
                                    <img
                                        src={slot.previewUrl}
                                        alt={`Sem ${slot.sem}`}
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <>
                                        <FiUploadCloud style={{ color: '#D4500A', width: 22, height: 22, marginBottom: '6px' }} />
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, color: '#78716C',
                                            fontFamily: 'Outfit, sans-serif', letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                        }}>
                                            Upload
                                        </span>
                                    </>
                                )}

                                {/* Sem badge */}
                                <div style={{
                                    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                                    background: slot.file ? 'rgba(212,80,10,0.85)' : 'rgba(255,255,255,0.92)',
                                    backdropFilter: 'blur(8px)', borderRadius: '999px', padding: '3px 10px',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    border: slot.file ? 'none' : '1px solid #FDE8D8',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', whiteSpace: 'nowrap',
                                }}>
                                    <span style={{
                                        fontSize: '12px', fontWeight: 900,
                                        color: slot.file ? 'white' : '#D4500A',
                                        fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em',
                                    }}>
                                        Sem {slot.sem}
                                    </span>
                                </div>
                            </motion.label>

                            <input
                                id={`sem-upload-${slot.sem}`}
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                ref={el => { inputRefs.current[slot.sem] = el; }}
                                onChange={e => handleFileChange(slot.sem, e)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* + Add Sem button */}
                {canAddMore && (
                    <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -3, borderColor: '#D4500A' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={addSlot}
                        style={{
                            width: '200px', height: '185px',
                            borderRadius: '16px', border: '1.5px dashed #FDE8D8',
                            background: 'transparent', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'border-color 0.18s',
                        }}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#FFF6EC', border: '1.5px solid #FDE8D8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FiPlus style={{ color: '#D4500A', width: 16, height: 16 }} />
                        </div>
                        <span style={{
                            fontSize: '11px', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                            color: '#78716C', letterSpacing: '0.04em',
                        }}>
                            Add Sem
                        </span>
                    </motion.button>
                )}
            </div>

            {/* Hint */}
            {slots.length > 0 && (
                <p style={{
                    marginTop: '16px', fontSize: '12px', fontWeight: 600,
                    fontFamily: 'Outfit, sans-serif', color: '#78716C',
                }}>
                    Click any card to upload its marksheet. Click <strong style={{ color: '#D4500A' }}>Scan All</strong> when ready.
                </p>
            )}
        </div>
    );
}
