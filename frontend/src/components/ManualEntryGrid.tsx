'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiHash, FiBook, FiAward, FiSettings, FiArrowLeft } from 'react-icons/fi';
import CustomSelect from './CustomSelect';

const BRANCHES = [
    { "id": "aero", "name": "AERO" },
    { "id": "aerospace", "name": "AEROSPACE" },
    { "id": "agri", "name": "AGRI" },
    { "id": "aids", "name": "AIDS" },
    { "id": "arch", "name": "ARCH" },
    { "id": "auto", "name": "AUTO" },
    { "id": "bbe", "name": "BBE" },
    { "id": "biotech", "name": "BIOTECH" },
    { "id": "bme", "name": "BME" },
    { "id": "cce", "name": "CCE" },
    { "id": "ce", "name": "CE" },
    { "id": "cee", "name": "CEE" },
    { "id": "civil", "name": "CIVIL" },
    { "id": "csbs", "name": "CSBS" },
    { "id": "csd", "name": "CSD" },
    { "id": "cse", "name": "CSE" },
    { "id": "cse_aiml", "name": "CSE_AIML" },
    { "id": "cse_cs", "name": "CSE_CS" },
    { "id": "ece", "name": "ECE" },
    { "id": "eee", "name": "EEE" },
    { "id": "eie", "name": "EIE" },
    { "id": "env", "name": "ENV" },
    { "id": "ete", "name": "ETE" },
    { "id": "fashion", "name": "FASHION" },
    { "id": "food", "name": "FOOD" },
    { "id": "geo", "name": "GEO" },
    { "id": "ht", "name": "HT" },
    { "id": "ice", "name": "ICE" },
    { "id": "ie", "name": "IE" },
    { "id": "iem", "name": "IEM" },
    { "id": "it", "name": "IT" },
    { "id": "mae", "name": "MAE" },
    { "id": "manuf", "name": "MANUF" },
    { "id": "marine", "name": "MARINE" },
    { "id": "mech", "name": "MECH" },
    { "id": "mechatronics", "name": "MECHATRONICS" },
    { "id": "mech_sw", "name": "MECH_SW" },
    { "id": "mee", "name": "MEE" },
    { "id": "mse", "name": "MSE" },
    { "id": "pce", "name": "PCE" },
    { "id": "pct", "name": "PCT" },
    { "id": "pe", "name": "PE" },
    { "id": "pharma", "name": "PHARMA" },
    { "id": "plastics", "name": "PLASTICS" },
    { "id": "prod", "name": "PROD" },
    { "id": "robotics", "name": "ROBOTICS" },
    { "id": "sfe", "name": "SFE" },
    { "id": "tc", "name": "TC" },
    { "id": "tt", "name": "TT" }
];

const REGULATIONS = ['2017', '2019', '2021', '2025'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'SA', 'W', 'S'];

export default function ManualEntryGrid({
    isMultiSem = false,
    onCalculate
}: {
    isMultiSem?: boolean;
    onCalculate: (subjects: any[], metadata: { semester: number; branch: string; regulation: string }) => void;
}) {
    const [regulation, setRegulation] = useState('2021');
    const [semester, setSemester] = useState(1);
    const [branch, setBranch] = useState('cse');

    const [rows, setRows] = useState([
        { id: '1', subject_code: '', grade: '', credits: '', semester: 1 },
        { id: '2', subject_code: '', grade: '', credits: '', semester: 1 },
        { id: '3', subject_code: '', grade: '', credits: '', semester: 1 },
        { id: '4', subject_code: '', grade: '', credits: '', semester: 1 },
        { id: '5', subject_code: '', grade: '', credits: '', semester: 1 },
    ]);

    const [activeSemesters, setActiveSemesters] = useState<number[]>([1]);

    const addRow = (targetSem?: number) => {
        const sem = targetSem !== undefined ? targetSem : semester;
        setRows([...rows, { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: sem }]);
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const removeSemesterBlock = (sem: number) => {
        setRows(rows.filter(r => r.semester !== sem));
        setActiveSemesters(activeSemesters.filter(s => s !== sem));
    };

    const updateRow = (id: string, field: 'subject_code' | 'grade' | 'credits' | 'semester', value: string | number) => {
        setRows(rows.map(r => r.id === id ? {
            ...r,
            [field]: field === 'subject_code' || field === 'grade' ? String(value).toUpperCase() : value
        } : r));
    };

    const handleSubmit = () => {
        const validRows = rows.filter(r => r.subject_code.trim() && r.grade.trim());
        if (validRows.length === 0) return alert('Please enter at least one subject with a grade.');

        const subjects = validRows.map(r => ({
            subject_code: r.subject_code,
            grade: r.grade,
            semester: isMultiSem ? r.semester : semester,
            ...(r.credits && !isNaN(Number(r.credits)) ? { credits: Number(r.credits) } : {})
        }));

        onCalculate(subjects, { semester: isMultiSem ? 8 : semester, branch, regulation });
    };

    const renderRows = (semFilter: number) => (
        <AnimatePresence mode="popLayout">
            {rows.filter(r => isMultiSem ? r.semester === semFilter : true).map((row, index) => (
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
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={row.credits}
                        onChange={(e) => updateRow(row.id, 'credits', e.target.value)}
                        placeholder="Opt"
                        className="flex-[1] bg-bg-card-alt border border-border/50 rounded-2xl px-4 py-4 font-mono text-base font-bold text-text-primary focus:outline-none focus:border-primary/50 focus:bg-bg-card shadow-sm transition-all placeholder:text-text-muted/30"
                    />
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
    );

    return (
        <div className="w-full max-w-3xl mx-auto bg-bg-card rounded-[40px] border border-border p-10 shadow-2xl relative">
            {/* Header section with Metadata selectors */}
            <div className="mb-10 text-center relative z-10">
                <h2 className="text-3xl font-black tracking-tighter mb-2">Manual Grade Entry</h2>
                <p className="text-text-muted font-medium mb-8">Set your context and type your grades below.</p>

                <div className={`grid ${isMultiSem ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'} gap-4 text-left`}>
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

                    {/* Semester Selector - Hidden in Multi Sem mode */}
                    {!isMultiSem && (
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
                    )}

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
            <div className="space-y-8 mb-8 relative z-10">
                {isMultiSem ? (
                    <>
                        {activeSemesters.map(sem => (
                            <div key={sem} className="bg-bg-card-alt/30 border border-border/50 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black tracking-tight text-text-primary">
                                        Semester {sem}
                                    </h3>
                                    {activeSemesters.length > 1 && (
                                        <button
                                            onClick={() => removeSemesterBlock(sem)}
                                            className="text-text-muted hover:text-error text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                                        >
                                            <FiTrash2 className="w-3 h-3" /> Remove Sem
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">
                                    <div className="flex-[2] flex items-center gap-2"><FiAward className="w-3 h-3" /> Subject Code</div>
                                    <div className="flex-[1] flex items-center gap-2">Grade</div>
                                    <div className="flex-[1] flex items-center gap-2">Credits</div>
                                    <div className="w-12"></div>
                                </div>

                                <div className="pr-2 custom-scrollbar">
                                    {renderRows(sem)}
                                </div>

                                <button
                                    onClick={() => addRow(sem)}
                                    className="w-full py-4 mt-4 border-2 border-dashed border-border/50 rounded-[20px] text-xs font-black text-text-muted uppercase tracking-widest hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all outline-none flex items-center justify-center gap-2 group"
                                >
                                    <FiPlus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Subject to Sem {sem}
                                </button>
                            </div>
                        ))}

                        {activeSemesters.length < 8 && (
                            <button
                                onClick={() => {
                                    const next = Math.max(...activeSemesters) + 1;
                                    setActiveSemesters([...activeSemesters, next]);
                                    setRows([
                                        ...rows,
                                        { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: next },
                                        { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: next },
                                        { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: next },
                                        { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: next },
                                        { id: Math.random().toString(), subject_code: '', grade: '', credits: '', semester: next },
                                    ]);
                                }}
                                className="w-full py-5 border-2 border-primary/20 bg-primary/5 rounded-[24px] text-sm font-black text-primary uppercase tracking-widest hover:border-primary/50 hover:bg-primary/10 transition-all outline-none flex items-center justify-center gap-2 group shadow-sm"
                            >
                                <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Add Next Semester Block
                            </button>
                        )}
                    </>
                ) : (
                    <div>
                        <div className="flex gap-4 px-6 text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-4">
                            <div className="flex-[2] flex items-center gap-2"><FiAward className="w-3 h-3" /> Subject Code</div>
                            <div className="flex-[1] flex items-center gap-2">Grade</div>
                            <div className="flex-[1] flex items-center gap-2">Credits</div>
                            <div className="w-12"></div>
                        </div>

                        <div className="pr-2 custom-scrollbar" style={{ minHeight: '300px' }}>
                            {renderRows(semester)}
                        </div>

                        <button
                            onClick={() => addRow(semester)}
                            className="w-full py-4 mt-6 border-2 border-dashed border-border/50 rounded-[20px] text-sm font-black text-text-muted uppercase tracking-widest hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all outline-none flex items-center justify-center gap-2 group"
                        >
                            <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Add Subject Item
                        </button>
                    </div>
                )}
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
