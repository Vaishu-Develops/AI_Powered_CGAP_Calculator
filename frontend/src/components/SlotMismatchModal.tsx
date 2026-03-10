'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiSkipForward, FiX } from 'react-icons/fi';

export interface SlotMismatch {
    slotSem: number;          // what the user labelled it
    detectedSem: number;      // what OCR actually read
    regNo?: string;
    previewUrl?: string | null;
}

interface SlotMismatchModalProps {
    mismatches: SlotMismatch[];
    onReplace: (slotSem: number) => void;   // user wants to re-upload correct file
    onSkip: (slotSem: number) => void;      // exclude this slot from calculation
    onProceed: () => void;                  // all resolved
}

export default function SlotMismatchModal({ mismatches, onReplace, onSkip, onProceed }: SlotMismatchModalProps) {
    const current = mismatches[0]; // handle one at a time
    const remaining = mismatches.length;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,10,0,0.55)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 99990,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                }}
            >
                {/* Modal card */}
                <motion.div
                    key="modal"
                    initial={{ opacity: 0, scale: 0.9, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 24 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    style={{
                        background: '#FFFFFF',
                        borderRadius: '28px',
                        padding: '36px',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                        position: 'relative',
                    }}
                >
                    {/* Progress pill */}
                    {remaining > 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: '#FFF6EC',
                            border: '1.5px solid #FDE8D8',
                            borderRadius: '999px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'Outfit, sans-serif',
                            color: '#D4500A',
                        }}>
                            {remaining} to resolve
                        </div>
                    )}

                    {/* Warning icon + title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: 'rgba(245,158,11,0.1)',
                            border: '1.5px solid rgba(245,158,11,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <FiAlertTriangle style={{ color: '#F59E0B', width: 22, height: 22 }} />
                        </div>
                        <div>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: 900,
                                fontFamily: 'Outfit, sans-serif',
                                color: '#0F0A00',
                                letterSpacing: '-0.02em',
                                marginBottom: '4px',
                            }}>
                                Same marksheet detected in two slots
                            </h3>
                            <p style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                fontFamily: 'Outfit, sans-serif',
                                color: '#78716C',
                                margin: 0,
                            }}>
                                OCR detected <strong style={{ color: '#D4500A' }}>Semester {current.detectedSem}</strong> content in your <strong>Sem {current.slotSem}</strong> slot.
                            </p>
                        </div>
                    </div>

                    {/* Side-by-side comparison */}
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'stretch',
                        marginBottom: '28px',
                    }}>
                        {/* Wrong slot */}
                        <div style={{
                            flex: 1,
                            background: 'rgba(245,158,11,0.06)',
                            border: '1.5px solid rgba(245,158,11,0.3)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: '#B45309',
                                fontFamily: 'Outfit, sans-serif',
                            }}>
                                Sem {current.slotSem} slot ← wrong
                            </div>
                            {current.previewUrl && (
                                <div style={{
                                    width: '100%',
                                    height: '80px',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    border: '1.5px solid rgba(245,158,11,0.3)',
                                }}>
                                    <img src={current.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'Outfit, sans-serif',
                                color: '#B45309',
                            }}>
                                OCR reads: Semester {current.detectedSem}
                                {current.regNo && <><br />{current.regNo}</>}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', color: '#78716C', fontSize: '20px', flexShrink: 0 }}>
                            ≠
                        </div>

                        {/* Expected */}
                        <div style={{
                            flex: 1,
                            background: '#F9F9F9',
                            border: '1.5px solid #E5E7EB',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: '#6B7280',
                                fontFamily: 'Outfit, sans-serif',
                            }}>
                                Expected
                            </div>
                            <div style={{
                                width: '100%',
                                height: '80px',
                                borderRadius: '10px',
                                background: '#F3F4F6',
                                border: '1.5px dashed #D1D5DB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#9CA3AF',
                                fontFamily: 'Outfit, sans-serif',
                            }}>
                                Sem {current.slotSem}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'Outfit, sans-serif',
                                color: '#6B7280',
                            }}>
                                Should be: Semester {current.slotSem}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Primary: Replace */}
                        <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onReplace(current.slotSem)}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                borderRadius: '14px',
                                background: '#D4500A',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontFamily: 'Outfit, sans-serif',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '9px',
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FiRefreshCw style={{ width: 16, height: 16 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '1px' }}>
                                    Replace Sem {current.slotSem} with correct marksheet
                                </div>
                                <div style={{ fontSize: '11px', opacity: 0.75, fontWeight: 500 }}>
                                    Upload the actual Semester {current.slotSem} results
                                </div>
                            </div>
                        </motion.button>

                        {/* Secondary: Skip */}
                        <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSkip(current.slotSem)}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                borderRadius: '14px',
                                background: '#FFF6EC',
                                color: '#0F0A00',
                                border: '1.5px solid #FDE8D8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontFamily: 'Outfit, sans-serif',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '9px',
                                background: '#FDE8D8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FiSkipForward style={{ width: 16, height: 16, color: '#D4500A' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '1px', color: '#0F0A00' }}>
                                    Skip Sem {current.slotSem} for now
                                </div>
                                <div style={{ fontSize: '11px', color: '#78716C', fontWeight: 500 }}>
                                    Calculate CGPA without Semester {current.slotSem}
                                </div>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
