'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit3, FiRefreshCw, FiUploadCloud } from 'react-icons/fi';
import { useUser } from '@/context/UserContext';
import { useCalcFlow } from '@/context/CalcFlowContext';
import LoadingSaffron from '@/components/LoadingSaffron';

type SemesterSubject = {
    id: number;
    subject_code: string;
    credits: number;
    grade: string;
    original_semester?: number;
    is_arrear?: boolean;
    is_pass?: boolean;
};

type SemesterReport = {
    id: number;
    semester: number;
    gpa: number;
    cgpa: number;
    branch: string;
    regulation: string;
    total_credits: number;
    subject_count: number;
    arrears_count: number;
    subjects: SemesterSubject[];
};

const FAILING_GRADES = new Set(['U', 'RA', 'SA', 'W', 'AB', 'F', '-']);

export default function SemesterDetailPage() {
    const { user, isDemo } = useUser();
    const { startQuickAddFromHome, setInputMethod, setSource } = useCalcFlow();
    const router = useRouter();
    const params = useParams<{ semester: string }>();
    const semester = Number(params?.semester || 1);
    const safeSemester = Number.isFinite(semester) && semester >= 1 && semester <= 8 ? semester : 1;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<SemesterReport | null>(null);

    useEffect(() => {
        if (!user || isDemo) return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`http://localhost:8000/reports/user/${encodeURIComponent(user.id)}/semester/${safeSemester}`);
                if (!res.ok) throw new Error('Failed to load semester report');
                const data = await res.json();
                setReport(data?.report || null);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unable to load semester details';
                setError(message);
                setReport(null);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user, isDemo, safeSemester]);

    const totalWeighted = useMemo(() => {
        if (!report) return 0;
        return report.subjects.reduce((sum, s) => {
            const grade = String(s.grade || '').toUpperCase();
            if (FAILING_GRADES.has(grade)) return sum;
            const gp = grade === 'S' || grade === 'O' ? 10 : grade === 'A+' ? 9 : grade === 'A' ? 8 : grade === 'B+' ? 7 : grade === 'B' ? 6 : grade === 'C' ? 5 : 0;
            return sum + gp * Number(s.credits || 0);
        }, 0);
    }, [report]);

    if (!user && !isDemo) return null;

    const handleEditSubjects = () => {
        router.push(`/home/edit-all?sem=${safeSemester}`);
    };

    const handleAddRevalUpdate = () => {
        startQuickAddFromHome(safeSemester);
        setSource('home_semester_view');
        setInputMethod('ocr');
        router.push('/calculate/input');
    };

    const handleReuploadRecalculate = () => {
        router.push(`/calculate/add-semester/${safeSemester}`);
    };

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-8">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => router.push('/home')} className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary font-bold mb-6">
                    <FiArrowLeft className="w-4 h-4" /> Back to Home
                </button>

                <div className="bg-bg-card border border-border rounded-[32px] p-8 md:p-10 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Semester {safeSemester}</h1>
                            <p className="text-text-muted font-medium mt-1">Direct semester view from your journey timeline.</p>
                        </div>
                        {report && (
                            <div className="text-right">
                                <div className="text-sm text-text-muted font-bold uppercase tracking-widest">Semester GPA</div>
                                <div className="text-4xl font-black text-primary">{Number(report.gpa || 0).toFixed(2)}</div>
                            </div>
                        )}
                    </div>

                    {loading && <div className="py-20"><LoadingSaffron message="Fetching semester insights..." /></div>}
                    {error && <p className="text-red-500 font-semibold">{error}</p>}

                    {!loading && !error && !report && (
                        <div className="border border-border rounded-2xl p-6 bg-bg-primary">
                            <p className="font-semibold text-text-muted">No saved data found for Semester {safeSemester} yet.</p>
                        </div>
                    )}

                    {!loading && report && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-bg-primary border border-border rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-widest font-bold text-text-muted">Subjects</div>
                                    <div className="text-2xl font-black mt-1">{report.subject_count}</div>
                                </div>
                                <div className="bg-bg-primary border border-border rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-widest font-bold text-text-muted">Arrears</div>
                                    <div className="text-2xl font-black mt-1">{report.arrears_count}</div>
                                </div>
                                <div className="bg-bg-primary border border-border rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-widest font-bold text-text-muted">Credits</div>
                                    <div className="text-2xl font-black mt-1">{Number(report.total_credits || 0).toFixed(1)}</div>
                                </div>
                                <div className="bg-bg-primary border border-border rounded-2xl p-4">
                                    <div className="text-xs uppercase tracking-widest font-bold text-text-muted">Weighted Total</div>
                                    <div className="text-2xl font-black mt-1">{totalWeighted.toFixed(1)}</div>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-border rounded-2xl">
                                <table className="w-full min-w-[620px]">
                                    <thead className="bg-bg-primary">
                                        <tr className="text-left text-xs uppercase tracking-widest text-text-muted">
                                            <th className="px-4 py-3">Subject</th>
                                            <th className="px-4 py-3">Grade</th>
                                            <th className="px-4 py-3">Credits</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.subjects.map((subject) => {
                                            const grade = String(subject.grade || '').toUpperCase();
                                            const failed = FAILING_GRADES.has(grade);
                                            return (
                                                <tr key={subject.id} className="border-t border-border/60">
                                                    <td className="px-4 py-3 font-bold">{subject.subject_code}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${failed ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                                            {grade}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold">{Number(subject.credits || 0).toFixed(1)}</td>
                                                    <td className={`px-4 py-3 font-semibold ${failed ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        {failed ? 'Arrear' : 'Pass'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleEditSubjects}
                                    className="px-5 py-3 rounded-full bg-primary text-white font-bold inline-flex items-center gap-2"
                                >
                                    <FiEdit3 className="w-4 h-4" /> Edit subjects
                                </button>
                                <button
                                    onClick={handleAddRevalUpdate}
                                    className="px-5 py-3 rounded-full bg-bg-primary border border-border font-bold inline-flex items-center gap-2 text-text-primary"
                                >
                                    <FiRefreshCw className="w-4 h-4" /> Add reval update
                                </button>
                                <button
                                    onClick={handleReuploadRecalculate}
                                    className="px-5 py-3 rounded-full bg-bg-primary border border-border font-bold inline-flex items-center gap-2 text-text-primary"
                                >
                                    <FiUploadCloud className="w-4 h-4" /> Re-upload marksheet & recalculate
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
