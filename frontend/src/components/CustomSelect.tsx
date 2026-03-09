'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

export interface SelectOption {
    label: string;
    value: string | number;
}

interface CustomSelectProps {
    value: string | number;
    options: SelectOption[];
    onChange: (value: any) => void;
    placeholder?: string;
    searchable?: boolean;
    className?: string;
}

export default function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select...',
    searchable = false,
    className = '',
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const filtered = searchable && query.trim()
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    // Calculate position for the portal dropdown
    const computePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownH = Math.min(320, filtered.length * 45 + (searchable ? 60 : 10));
        const openUpward = spaceBelow < dropdownH && rect.top > dropdownH;

        setDropdownStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            zIndex: 99999,
            ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
        });
    }, [filtered.length, searchable]);

    const handleOpen = () => {
        computePosition();
        setIsOpen(true);
    };

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current && !triggerRef.current.contains(target)) {
                setIsOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Recompute on scroll/resize
    useEffect(() => {
        if (!isOpen) return;
        const handler = () => computePosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [isOpen, computePosition]);

    // Auto-focus search
    useEffect(() => {
        if (isOpen && searchable) {
            setTimeout(() => searchRef.current?.focus(), 60);
        }
    }, [isOpen, searchable]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setQuery('');
    };

    const panelStyle: React.CSSProperties = {
        ...dropdownStyle,
        background: '#FFFFFF',
        border: '1.5px solid #F7C59F',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(212,80,10,0.12)',
        overflow: 'hidden',
    };

    return (
        <>
            {/* Trigger button */}
            <div
                ref={triggerRef}
                onClick={handleOpen}
                onMouseDown={e => e.preventDefault()}   // prevent focus steal
                className={className}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '14px 20px',
                    border: isOpen ? '1.5px solid #D4500A' : '1.5px solid #FDE8D8',
                    borderRadius: '16px',
                    background: '#FFF6EC',
                    boxShadow: isOpen ? '0 0 0 3px rgba(212,80,10,0.10)' : 'none',
                    transition: 'all 0.18s ease',
                    userSelect: 'none',
                    minHeight: '52px',
                    boxSizing: 'border-box',
                }}
            >
                <span style={{
                    fontWeight: 700,
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '14px',
                    color: selectedOption ? '#0F0A00' : '#78716C',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}
                >
                    <FiChevronDown style={{ color: isOpen ? '#D4500A' : '#78716C', width: 16, height: 16 }} />
                </motion.span>
            </div>

            {/* Portal dropdown – renders directly on document.body */}
            {typeof window !== 'undefined' && isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        key="dropdown"
                        initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.96, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        style={{ ...panelStyle, transformOrigin: 'top' }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {/* Search */}
                        {searchable && (
                            <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #FDE8D8' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#FFF6EC',
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    border: '1px solid #FDE8D8',
                                }}>
                                    <FiSearch style={{ color: '#D4500A', flexShrink: 0, width: 14, height: 14 }} />
                                    <input
                                        ref={searchRef}
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Type to search..."
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#0F0A00',
                                            width: '100%',
                                            fontFamily: 'Outfit, sans-serif',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options */}
                        <div style={{
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                        }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: '12px 16px', color: '#78716C', fontSize: '13px', textAlign: 'center' }}>
                                    No results found
                                </div>
                            ) : filtered.map(opt => {
                                const isSelected = String(opt.value) === String(value);
                                return (
                                    <div
                                        key={opt.value}
                                        onMouseDown={() => handleSelect(opt.value)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: isSelected ? 800 : 600,
                                            color: isSelected ? '#D4500A' : '#0F0A00',
                                            background: isSelected ? 'rgba(212,80,10,0.08)' : 'transparent',
                                            fontFamily: 'Outfit, sans-serif',
                                            transition: 'background 0.1s, color 0.1s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLDivElement).style.background = '#FFF6EC';
                                                (e.currentTarget as HTMLDivElement).style.color = '#D4500A';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLDivElement).style.color = '#0F0A00';
                                            }
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
