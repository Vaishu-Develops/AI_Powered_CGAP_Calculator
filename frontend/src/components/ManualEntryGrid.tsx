'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiHash, FiBook, FiAward, FiSettings, FiArrowLeft } from 'react-icons/fi';
import CustomSelect from './CustomSelect';

const BRANCHES = [
    { id: 'cse', name: 'Computer Science (CSE)' },
    { id: 'it', name: 'Information Technology (IT)' },
    { id: 'ece', name: 'Electronics & Comm (ECE)' },
    { id: 'eee', name: 'Electrical & Electronics (EEE)' },
    { id: 'mech', name: 'Mechanical (MECH)' },
    { id: 'civil', name: 'Civil Engineering' },
    { id: 'aids', name: 'AI & Data Science (AIDS)' },
    { id: 'aero', name: 'Aeronautical Eng' },
    { id: 'agri', name: 'Agricultural Eng' },
    { id: 'auto', name: 'Automobile Eng' },
    { id: 'biotech', name: 'Biotechnology' },
    { id: 'bme', name: 'Biomedical Eng (BME)' },
    { id: 'cce', name: 'Computer & Comm (CCE)' },
    { id: 'chemical', name: 'Chemical Engineering' },
    { id: 'csbs', name: 'Computer Sci & BS (CSBS)' },
    { id: 'eie', name: 'Electronics & Instru (EIE)' },
    { id: 'geo', name: 'Geoinformatics' },
    { id: 'ice', name: 'Instru & Control (ICE)' },
    { id: 'ibt', name: 'Industrial Biotech' },
    { id: 'marine', name: 'Marine Engineering' },
    { id: 'mat', name: 'Material Sci & Eng (MSE)' },
    { id: 'mech_sw', name: 'Mechanical (Sandwich)' },
    { id: 'mechatronics', name: 'Mechatronics' },
    { id: 'mee', name: 'Manufacturing Eng' },
    { id: 'pce', name: 'Petrochemical Eng' },
    { id: 'pct', name: 'Petroleum Eng' },
    { id: 'pe', name: 'Production Eng' },
    { id: 'pharma', name: 'Pharmaceutical Tech' },
    { id: 'plastics', name: 'Plastics Tech' },
    { id: 'prod', name: 'Production Tech' },
    { id: 'robotics', name: 'Robotics & Automation' },
    { id: 'sfe', name: 'Safety & Fire Eng' },
    { id: 'tc', name: 'Textile Chemistry' },
    { id: 'tt', name: 'Textile Technology' },
    { id: 'ft', name: 'Food Technology' },
    { id: 'print', name: 'Printing Technology' }
];

const REGULATIONS = ['2017', '2019', '2021', '2025'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'B-', 'C', 'U', 'AB'];

export default function ManualEntryGrid({
    onCalculate
}: {
    onCalculate: (subjects: any[], metadata: { semester: number; branch: string; regulation: string }) => void;
}) {
    const [regulation, setRegulation] = useState('2021');
    const [semester, setSemester] = useState(1);
    const [branch, setBranch] = useState('cse');

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
        const validRows = rows.filter(r => r.subject_code.trim() && r.grade.trim());
        if (validRows.length === 0) return alert('Please enter at least one subject with a grade.');

        const subjects = validRows.map(r => ({
            subject_code: r.subject_code,
            grade: r.grade,
            semester: semester
        }));

        onCalculate(subjects, { semester, branch, regulation });
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-bg-card rounded-[40px] border border-border p-10 shadow-2xl relative">
            {/* Header section with Metadata selectors */}
            <div className="mb-10 text-center relative z-10">
                <h2 className="text-3xl font-black tracking-tighter mb-2">Manual Grade Entry</h2>
                <p className="text-text-muted font-medium mb-8">Set your context and type your grades below.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    {/* Regulation Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2 ml-2">
                            <FiSettings className="text-primary w-3 h-3" /> Regulation
                        </label>
                        <CustomSelect
                            value={regulation}
                            onChange={(val) => setRegulation(val)}
                            options={REGULATIONS.map(r => ({ label: `AU R-${r}`, value: r }))}
                        />
                    </div>

                    {/* Semester Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2 ml-2">
                            <FiHash className="text-primary w-3 h-3" /> Semester
                        </label>
                        <CustomSelect
                            value={semester}
                            onChange={(val) => setSemester(Number(val))}
                            options={SEMESTERS.map(s => ({ label: `Semester ${s}`, value: s }))}
                        />
                    </div>

                    {/* Branch Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2 ml-2">
                            <FiBook className="text-primary w-3 h-3" /> Branch
                        </label>
                        <CustomSelect
                            value={branch}
                            onChange={(val) => setBranch(val)}
                            options={BRANCHES.map(b => ({ label: b.name, value: b.id }))}
                            searchable
                        />
                    </div>
                </div>
            </div>

            {/* Grid display */}
            <div className="space-y-4 mb-8 relative z-10">
                <div className="flex gap-4 px-6 text-xs font-black uppercase tracking-[0.2em] text-text-muted">
                    <div className="flex-[2] flex items-center gap-2"><FiAward className="w-3 h-3" /> Subject Code</div>
                    <div className="flex-[1] flex items-center gap-2">Grade</div>
                    <div className="w-12"></div>
                </div>

                <div className="pr-2 custom-scrollbar" style={{ minHeight: '300px' }}>
                    <AnimatePresence mode="popLayout">
                        {rows.map((row, index) => (
                            <motion.div
                                key={row.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex gap-4 items-center group mb-3"
                            >
                                <input
                                    type="text"
                                    value={row.subject_code}
                                    onChange={(e) => updateRow(row.id, 'subject_code', e.target.value)}
                                    placeholder="e.g. CS8601"
                                    className="flex-[2] bg-bg-card-alt border border-border/50 rounded-2xl px-6 py-4 font-mono text-base font-bold text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card shadow-sm transition-all uppercase placeholder:text-text-muted/30"
                                />
                                <div className="flex-[1] relative">
                                    <CustomSelect
                                        value={row.grade}
                                        onChange={(val) => updateRow(row.id, 'grade', val)}
                                        options={[{ label: '--', value: '' }, ...GRADES.map(g => ({ label: g, value: g }))]}
                                        placeholder="--"
                                    />
                                </div>
                                <button
                                    onClick={() => removeRow(row.id)}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl text-text-muted hover:bg-error/10 hover:text-error transition-all focus:outline-none group-hover:scale-105"
                                    title="Remove Row"
                                >
                                    <FiTrash2 className="w-5 h-5" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <button
                    onClick={addRow}
                    className="w-full py-4 mt-6 border-2 border-dashed border-border/50 rounded-[20px] text-sm font-black text-text-muted uppercase tracking-widest hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all outline-none flex items-center justify-center gap-2 group"
                >
                    <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Add Subject Item
                </button>
            </div>

            {/* Action Section */}
            <div className="mt-10 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
                <div className="text-xs font-medium text-text-muted bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                    Calculated against <span className="text-primary font-bold">R-{regulation}</span> regulations
                </div>
                <button
                    onClick={handleSubmit}
                    className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-black text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    Calculate Results <FiArrowLeft className="rotate-180" />
                </button>
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-1/5 rounded-full blur-[80px] -z-0 pointer-events-none" />
        </div>
    );
}
