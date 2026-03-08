'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManualEntryGrid({
    regulation = '2021',
    semester = 1,
    onCalculate
}: {
    regulation?: string;
    semester?: number;
    onCalculate: (subjects: any[]) => void;
}) {
    const [rows, setRows] = useState([
        { id: '1', subject_code: '', grade: '' },
        { id: '2', subject_code: '', grade: '' },
        { id: '3', subject_code: '', grade: '' },
        { id: '4', subject_code: '', grade: '' },
        { id: '5', subject_code: '', grade: '' },
    ]);

    const addRow = () => {
        setRows([...rows, { id: Math.random().toString(), subject_code: '', grade: '' }]);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: 'subject_code' | 'grade', value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value.toUpperCase() } : r));
    };

    const handleSubmit = () => {
        // Filter out empty rows
        const validRows = rows.filter(r => r.subject_code.trim() && r.grade.trim());
        if (validRows.length === 0) return alert('Please enter at least one subject with a grade.');

        // Convert to the format expected by the calculator
        const subjects = validRows.map(r => ({
            subject_code: r.subject_code,
            grade: r.grade,
            semester: semester // Assume current selected semester
        }));

        onCalculate(subjects);
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-bg-card rounded-[32px] border border-border p-8 shadow-xl">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black mb-1">Manual Grade Entry</h2>
                    <p className="text-sm text-text-muted">Type your subject codes and grades below.</p>
                </div>
                <div className="text-xs font-bold text-text-muted px-3 py-1 bg-bg-card-alt rounded-full">
                    R{regulation}
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex gap-4 px-4 text-xs font-black uppercase tracking-widest text-text-muted">
                    <div className="flex-[2]">Subject Code</div>
                    <div className="flex-[1]">Grade</div>
                    <div className="w-10"></div>
                </div>

                <AnimatePresence>
                    {rows.map((row) => (
                        <motion.div
                            key={row.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            className="flex gap-4 items-center group"
                        >
                            <input
                                type="text"
                                value={row.subject_code}
                                onChange={(e) => updateRow(row.id, 'subject_code', e.target.value)}
                                placeholder="e.g. CS3452"
                                className="flex-[2] bg-bg-card-alt border border-border/50 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/50 uppercase transition-colors"
                            />
                            <select
                                value={row.grade}
                                onChange={(e) => updateRow(row.id, 'grade', e.target.value)}
                                className="flex-[1] bg-bg-card-alt border border-border/50 rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="">--</option>
                                <option value="O">O</option>
                                <option value="A+">A+</option>
                                <option value="A">A</option>
                                <option value="B+">B+</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="U">U (Fail)</option>
                            </select>
                            <button
                                onClick={() => removeRow(row.id)}
                                className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-error/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                title="Remove Row"
                            >
                                ✕
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <button
                    onClick={addRow}
                    className="w-full py-3 mt-4 border-2 border-dashed border-border/50 rounded-xl text-sm font-bold text-text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all outline-none"
                >
                    + Add Subject
                </button>
            </div>

            <div className="mt-8 border-t border-border/50 pt-6 flex justify-end">
                <button
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                    Calculate Results -{'>'}
                </button>
            </div>
        </div>
    );
}
