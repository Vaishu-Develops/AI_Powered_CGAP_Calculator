'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { useUser } from '@/context/UserContext';
import { useCalcFlow } from '@/context/CalcFlowContext';
import dynamic from 'next/dynamic';
import { FiPlus, FiCheck, FiDownload, FiTrendingUp, FiActivity, FiAlertCircle, FiAward, FiStar, FiFileText, FiBriefcase, FiCheckCircle, FiChevronDown, FiUserPlus, FiUpload, FiEdit3, FiTarget } from 'react-icons/fi';
import { Icon } from '@iconify/react';
import BadgeShowcase from '@/components/BadgeShowcase';
import AchievementDetailModal from '@/components/AchievementDetailModal';
import PlacementEligiblityCard from '@/components/PlacementEligiblityCard';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import NotificationToast from '@/components/NotificationToast';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

type DashboardState = 'zero' | 'single' | 'partial' | 'complete';

type SavedReport = {
    id: number;
    semester: number;
    gpa: number;
    cgpa: number;
    created_at?: string;
};

type HomeReportsResponse = {
    reports?: SavedReport[];
    semesters_present?: number[];
    semester_gpas?: Array<{ semester: number; gpa: number }>;
};

type HomeSubjectsResponse = {
    subjects?: Array<{
        subject_code: string;
        grade: string;
        credits: number;
        original_semester?: number;
        is_arrear?: boolean;
    }>;
};

function classFromCgpa(cgpa: number): string {
    if (cgpa >= 8.5) return 'First Class with Distinction';
    if (cgpa >= 6.5) return 'First Class';
    if (cgpa >= 5.0) return 'Second Class';
    return 'Needs Improvement';
}

function buildAiInsight(params: {
    activeSems: number[];
    gpaBySem: Record<number, number>;
    latestCgpa: number;
    missingCount: number;
}) {
    const { activeSems, gpaBySem, latestCgpa, missingCount } = params;
    const completed = activeSems.length;
    if (completed === 0) {
        return 'Upload your first semester to get a personalized performance insight and realistic target for your next term.';
    }

    const sorted = [...activeSems].sort((a, b) => a - b);
    const lastSem = sorted[sorted.length - 1];
    const prevSem = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const lastGpa = Number(gpaBySem[lastSem] || 0);
    const prevGpa = prevSem ? Number(gpaBySem[prevSem] || 0) : null;
    const trend = prevGpa === null ? 'steady start' : lastGpa >= prevGpa ? 'improving trend' : 'dip from previous semester';

    const nextSem = Math.min(lastSem + 1, 8);
    const targetForDistinctionNext = (((8.5 * (completed + 1)) - (latestCgpa * completed)));
    const cappedTarget = Math.max(5, Math.min(10, targetForDistinctionNext));

    if (latestCgpa >= 8.5) {
        return `You are already in Distinction (${latestCgpa.toFixed(2)} CGPA). Keep Sem ${nextSem} at ${(Math.max(8.0, lastGpa)).toFixed(1)}+ to preserve your current standing.`;
    }

    if (targetForDistinctionNext <= 10) {
        return `Current CGPA is ${latestCgpa.toFixed(2)} with a ${trend}. A realistic target for Sem ${nextSem} is ${cappedTarget.toFixed(1)}+ to move toward Distinction while ${missingCount} semester${missingCount === 1 ? '' : 's'} remain.`;
    }

    return `Current CGPA is ${latestCgpa.toFixed(2)} with a ${trend}. Focus on a strong Sem ${nextSem} target around ${(Math.max(7.0, lastGpa + 0.4)).toFixed(1)}+ to strengthen First Class momentum across the remaining ${missingCount} semester${missingCount === 1 ? '' : 's'}.`;
}

const SemesterPlannerCard = ({ onClick, remainingSems, activeSems, targetCgpa }: { onClick: () => void, remainingSems: number, activeSems: number[], targetCgpa: string | null }) => (
    <div
        onClick={onClick}
        className="bg-bg-card border border-border p-6 md:p-8 rounded-[40px] relative overflow-hidden flex flex-col justify-between shadow-sm cursor-pointer group hover:border-primary/30 transition-all hover:shadow-xl min-h-[320px] h-full"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-1/5 blur-2xl -mr-16 -mt-16 group-hover:bg-accent-1/10 transition-colors" />
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-accent-1/10 flex items-center justify-center text-accent-1 text-xl">
                        <FiTarget />
                    </div>
                    <h3 className="text-2xl font-black">Semester Planner</h3>
                </div>
                {targetCgpa && (
                    <div className="bg-accent-1/10 border border-accent-1/20 px-3 py-1 rounded-full text-[10px] font-black text-accent-1 uppercase tracking-wider">
                        Target: {targetCgpa}
                    </div>
                )}
            </div>

            <p className="text-text-muted font-medium mb-6 leading-relaxed text-sm">
                {remainingSems > 0
                    ? `Set a target CGPA and we'll calculate the performance needed in your remaining ${remainingSems} semester${remainingSems !== 1 ? 's' : ''} to hit it.`
                    : "Review your completed journey and see how your target CGPA evolved over time."
                }
            </p>

            {/* Mini Progress Grid */}
            <div className="bg-bg-primary/50 backdrop-blur-sm rounded-[2rem] p-4 border border-border/50 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Academic Journey</p>
                    <span className="text-[10px] font-black text-accent-1">{8 - remainingSems}/8</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                        const isDone = activeSems.includes(s);
                        return (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? 'bg-accent-1 shadow-[0_0_8px_rgba(230,122,56,0.4)]' : 'bg-border/30'}`}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest group-hover:gap-3 transition-all">
                {remainingSems > 0 ? 'Start Planning' : 'View Roadmap'} <Icon icon="solar:alt-arrow-right-bold-duotone" />
            </div>
        </div>
    </div>
);


const ReferAndEarnCard = ({ user, referralCode, setReferralCode, handleApplyReferral, handleCopyCode, referralLoading, copySuccess }: any) => (
    <div className="bg-gradient-to-br from-bg-card to-bg-card-alt border border-border p-8 rounded-[40px] shadow-sm relative overflow-hidden flex flex-col justify-between group h-full">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                    <FiUserPlus />
                </div>
                <h3 className="text-2xl font-black">Refer & Earn</h3>
            </div>
            <p className="text-text-muted font-medium mb-6 leading-relaxed">
                Invite 10 friends to join Saffron and unlock <span className="text-primary font-bold">1 Year of Pro</span> for free!
            </p>

            {user?.referral_code && (
                <div className="bg-bg-primary rounded-3xl p-6 border border-border mb-8 group/code relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/code:opacity-10 transition-opacity">
                        <Icon icon="solar:share-bold-duotone" className="w-12 h-12" />
                    </div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Share Your Link</p>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-2xl md:text-3xl font-black tracking-widest text-primary font-mono">{user.referral_code}</span>
                        <button
                            onClick={handleCopyCode}
                            className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-card-alt rounded-2xl transition-all text-text-muted hover:text-primary border border-border/50 shadow-sm font-black text-[10px] uppercase tracking-wider"
                        >
                            <Icon icon={copySuccess ? "solar:check-read-bold" : "solar:copy-bold-duotone"} className="w-5 h-5 transition-transform group-active:scale-95" />
                            {copySuccess ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    {/* Referral Progress */}
                    <div className="mt-6 pt-6 border-t border-border/50">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Your Progress</span>
                            <span className="text-sm font-black text-primary">{(user.referrals_count || 0)}/10 Friends</span>
                        </div>
                        <div className="h-2 bg-bg-card border border-border rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, ((user.referrals_count || 0) / 10) * 100)}%` }}
                                className="h-full bg-gradient-to-r from-primary to-accent-1 shadow-[0_0_10px_rgba(212,80,10,0.3)]"
                            />
                        </div>
                        <p className="text-[9px] font-bold text-text-muted mt-2">
                            {(user.referrals_count || 0) < 10
                                ? `${10 - (user.referrals_count || 0)} more friends to unlock 1 Year of Pro!`
                                : "🎉 Milestone Reached! Contact support to claim your 1 Year Pro."}
                        </p>
                    </div>
                </div>
            )}

            {!user?.applied_referral_code ? (
                <div className="flex items-center gap-2 mt-auto">
                    <input
                        type="text"
                        placeholder="Friend's Code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                        onClick={handleApplyReferral}
                        disabled={referralLoading || !referralCode}
                        className="px-6 py-3 bg-primary text-white font-black text-sm rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center gap-2 shrink-0"
                    >
                        {referralLoading ? <Icon icon="solar:refresh-bold" className="animate-spin" /> : 'Apply'}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-success bg-success/10 border border-success/20 px-4 py-3 rounded-2xl mt-auto">
                    <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-tight">Referral Reward Active</span>
                </div>
            )}
        </div>
    </div>
);

import { persistenceService } from '@/lib/persistenceService';

export default function HomePage() {
    const router = useRouter();
    const { user, isDemo, isDemoGPA, logout, homeData, setHomeData, setStats } = useUser();
    const { resetFlow, setSource, startQuickAddFromHome, startUploadMissingFromHome, startFriendMode, setMode } = useCalcFlow();
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [semestersPresent, setSemestersPresent] = useState<number[]>([]);
    const [semesterGpas, setSemesterGpas] = useState<Array<{ semester: number; gpa: number }>>([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [simulatorLoading, setSimulatorLoading] = useState(false);
    const [simulatorSubjects, setSimulatorSubjects] = useState<Record<string, { grade: string; credits: number }>>({});
    const [simulatorCurrentGpa, setSimulatorCurrentGpa] = useState(0);
    const [simulatorIsSingle, setSimulatorIsSingle] = useState(true);
    const [reportExporting, setReportExporting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [targetCgpaDisplay, setTargetCgpaDisplay] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [referralLoading, setReferralLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTarget = localStorage.getItem('saffron_target_cgpa');
            if (savedTarget) setTargetCgpaDisplay(parseFloat(savedTarget).toFixed(2));
        }
    }, []);

    const handleApplyReferral = async () => {
        if (!user || !referralCode.trim()) return;
        setReferralLoading(true);
        try {
            const res = await fetch('http://localhost:8000/referrals/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referral_code: referralCode.trim().toUpperCase(),
                    firebase_uid: user.id
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                setStats({ is_pro: true, applied_referral_code: referralCode.trim().toUpperCase() });
                setReferralCode('');
            } else {
                showToast(data.detail || 'Failed to apply referral code', 'error');
            }
        } catch (err) {
            showToast('Something went wrong. Please try again.', 'error');
        } finally {
            setReferralLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (!user?.referral_code) return;
        navigator.clipboard.writeText(user.referral_code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    // Phase 5: Persistence & Sync Effect
    useEffect(() => {
        const syncAndFetchStats = async () => {
            if (!user?.firebase_uid || isDemo || syncing) return;

            setSyncing(true);
            try {
                // 1. Sync local data to backend (one-time logic handled by server set union)
                await persistenceService.syncToBackend(user.firebase_uid);

                // 2. Fetch fresh stats (streaks, badges, pro status)
                const stats = await persistenceService.getUserStats(user.firebase_uid);

                // 3. Update Global Context
                setStats({
                    is_pro: stats.is_pro,
                    streak_count: stats.streak_count,
                    badges: stats.badges,
                    scan_count: stats.scan_count,
                    referral_code: stats.referral_code,
                    referrals_count: stats.referrals_count
                });
            } catch (err) {
                console.error('Phase 5 Sync Failed:', err);
            } finally {
                setSyncing(false);
            }
        };

        syncAndFetchStats();
    }, [user?.firebase_uid, isDemo]);

    useEffect(() => {
        // Always re-fetch when user changes — prevents stale data across account switches
        const loadReports = async () => {
            if (!user || isDemo) {
                setReports([]);
                setSemestersPresent([]);
                setSemesterGpas([]);
                return;
            }

            setReportsLoading(true);

            try {
                const res = await fetch(`http://localhost:8000/reports/user/${encodeURIComponent(user.id)}`);
                if (!res.ok) throw new Error('Failed to load reports');
                const data: HomeReportsResponse = await res.json();

                const reportsVal = Array.isArray(data?.reports) ? data.reports : [];
                const semsVal = Array.isArray(data?.semesters_present) ? data.semesters_present : [];
                const gpasVal = Array.isArray(data?.semester_gpas) ? data.semester_gpas : [];

                setReports(reportsVal);
                setSemestersPresent(semsVal);
                setSemesterGpas(gpasVal);
                setHomeData({ reports: reportsVal, semesters_present: semsVal, semester_gpas: gpasVal });
            } catch (err) {
                console.error('Failed to load home reports:', err);
                setReports([]);
                setSemestersPresent([]);
                setSemesterGpas([]);
            } finally {
                setReportsLoading(false);
            }
        };

        loadReports();
    }, [user?.id, isDemo]);

    const activeSems = useMemo(() => {
        const fromReports = Array.from(
            new Set((reports || []).map((r) => Number(r.semester)).filter((s) => Number.isFinite(s) && s > 0))
        ).sort((a, b) => a - b);

        if (fromReports.length > 0) return fromReports;
        if (semestersPresent.length > 0) {
            return Array.from(new Set(semestersPresent)).sort((a, b) => a - b);
        }
        return user?.semestersCalculated || [];
    }, [reports, semestersPresent, user]);

    const latestReport = useMemo(() => {
        if (!reports.length) return null;
        return [...reports].sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (tb !== ta) return tb - ta;
            return b.id - a.id;
        })[0];
    }, [reports]);

    const gpaBySem = useMemo(() => {
        const m: Record<number, number> = {};

        // Prefer backend-computed semester snapshot first (latest normalized subjects).
        for (const row of semesterGpas) {
            const sem = Number(row.semester);
            if (!Number.isFinite(sem) || sem <= 0) continue;
            m[sem] = Number(row.gpa || 0);
        }

        // Fallback: latest report per semester, never max historical GPA.
        // reports is loaded in descending created_at/id order.
        for (const r of reports) {
            const sem = Number(r.semester);
            if (!Number.isFinite(sem) || sem <= 0) continue;
            if (!(sem in m)) {
                m[sem] = Number(r.gpa || 0);
            }
        }
        return m;
    }, [reports, semesterGpas]);

    const latestCgpa = latestReport ? Number(latestReport.cgpa || 0) : 0;
    const latestGpa = latestReport ? Number(latestReport.gpa || 0) : 0;
    const latestSem = latestReport ? Number(latestReport.semester || 0) : 0;
    const currentClass = classFromCgpa(latestCgpa);

    const activeSemsCount = activeSems.length;
    let activeState: DashboardState = 'zero';
    if (activeSemsCount === 0) activeState = 'zero';
    else if (activeSemsCount === 1) activeState = 'single';
    else if (activeSemsCount > 1 && activeSemsCount < 8) activeState = 'partial';
    else if (activeSemsCount === 8) activeState = 'complete';

    useEffect(() => {
        if (!user && !isDemo && typeof window !== 'undefined') {
            router.push('/auth');
        }
    }, [user, isDemo, router]);

    const missingSems = useMemo(
        () => [1, 2, 3, 4, 5, 6, 7, 8].filter((sem) => !activeSems.includes(sem)),
        [activeSems]
    );

    const missingCount = Math.max(0, 8 - activeSems.length);
    const aiInsightText = useMemo(() => {
        return buildAiInsight({
            activeSems,
            gpaBySem,
            latestCgpa,
            missingCount,
        });
    }, [activeSems, gpaBySem, latestCgpa, missingCount]);

    if (!user && !isDemo) {
        return null;
    }

    const handleStartCalc = () => {
        resetFlow();
        if (isDemoGPA) {
            setMode('single_sem');
        }
        setSource('fresh');
        router.push('/calculate/who');
    };

    const handleQuickAddSemester = (semester: number) => {
        startQuickAddFromHome(semester);
        router.push(`/calculate/add-semester/${semester}`);
    };

    const handleViewSemester = (semester: number) => {
        router.push(`/home/semester/${semester}`);
    };

    const handleFriendCalc = () => {
        resetFlow();
        startFriendMode();
        router.push('/calculate/who');
    };

    const handleUploadAllMissing = () => {
        if (missingSems.length === 0) return;
        startUploadMissingFromHome(missingSems);
        router.push('/calculate/input');
    };

    const handleEditAll = () => {
        router.push('/home/edit-all');
    };

    const handleTrySimulator = async () => {
        if (!user || isDemo) {
            handleStartCalc();
            return;
        }

        // Phase 5: Feature Lock
        if (!user.is_pro) {
            showToast("Upgrade to Saffron Pro to unlock the Semester Planner & Goal Simulator!", "info");
            return;
        }

        setSimulatorLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/reports/user/${encodeURIComponent(user.id)}/subjects`);
            if (!res.ok) throw new Error('Failed to load simulator data');
            const data: HomeSubjectsResponse = await res.json();
            const flatSubjects = Array.isArray(data?.subjects) ? data.subjects : [];

            const mappedSubjects = flatSubjects.reduce<Record<string, { grade: string; credits: number; subject_code: string }>>((acc, subject, index) => {
                const code = String(subject.subject_code || '').trim().toUpperCase();
                if (!code) return acc;
                acc[`${code}__${index}`] = {
                    grade: String(subject.grade || '').toUpperCase(),
                    credits: Number(subject.credits || 0),
                    subject_code: code,
                };
                return acc;
            }, {});

            const latestSnapshotGpa = activeSemsCount === 1 ? latestGpa : latestCgpa;
            setSimulatorSubjects(mappedSubjects);
            setSimulatorCurrentGpa(Number.isFinite(latestSnapshotGpa) ? latestSnapshotGpa : 0);
            setSimulatorIsSingle(activeSemsCount === 1);
            setIsSimulatorOpen(true);
        } catch (err) {
            console.error('Failed to open simulator:', err);
            handleStartCalc();
        } finally {
            setSimulatorLoading(false);
        }
    };

    const handleDownloadDegreeReport = async () => {
        if (!user || isDemo) return;

        // Phase 5: Feature Lock
        if (!user.is_pro) {
            showToast("Pro Feature: Full Degree PDF Export is only for Saffron Pro users!", "info");
            return;
        }

        if (typeof window === 'undefined' || reportExporting) return;

        setReportExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 12;
            const contentWidth = pageWidth - margin * 2;
            const colors = {
                brand: [212, 84, 25] as const,
                soft: [250, 223, 208] as const,
                ink: [30, 41, 59] as const,
                line: [230, 232, 236] as const,
                zebra: [248, 249, 251] as const,
                white: [255, 255, 255] as const,
            };

            const semSummary = activeSems.map((sem) => ({
                sem,
                gpa: Number(gpaBySem[sem] || 0),
            }));

            const drawFooter = () => {
                pdf.setDrawColor(...colors.line);
                pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
                pdf.setTextColor(...colors.ink);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(8);
                const footerText = `Generated by AI Powered CGPA Calculator${user?.name ? ` for ${user.name}` : ''}`;
                pdf.text(footerText, margin, pageHeight - 6);
            };

            let y = 16;
            pdf.setFillColor(...colors.brand);
            pdf.roundedRect(margin, y - 8, contentWidth, 24, 2, 2, 'F');
            pdf.setTextColor(...colors.white);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text('Degree Report', margin + 4, y + 1);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            if (user?.name) {
                pdf.text(`Student: ${user.name}`, margin + 4, y + 9);
            }

            pdf.setFontSize(8.5);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 4, y + 1, { align: 'right' });
            if (user?.email) {
                pdf.text(user.email, pageWidth - margin - 4, y + 9, { align: 'right' });
            }
            y += 24;

            pdf.setFillColor(...colors.soft);
            pdf.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
            pdf.setTextColor(...colors.ink);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Summary', margin + 3, y + 5);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`CGPA: ${latestCgpa > 0 ? latestCgpa.toFixed(2) : '0.00'}`, margin + 3, y + 11);
            pdf.text(`Class: ${currentClass}`, margin + 55, y + 11);
            pdf.text(`Semesters: ${activeSems.length}/8`, margin + 110, y + 11);
            y += 26;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Semester-wise GPA', margin, y);
            y += 6;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            semSummary.forEach((row) => {
                if (y > pageHeight - 20) {
                    drawFooter();
                    pdf.addPage();
                    y = 16;
                }
                pdf.setFillColor(...colors.zebra);
                pdf.roundedRect(margin, y - 4, contentWidth, 7, 1.5, 1.5, 'F');
                pdf.text(`Semester ${row.sem}`, margin + 3, y);
                pdf.text(row.gpa.toFixed(2), pageWidth - margin - 6, y, { align: 'right' });
                y += 8;
            });

            drawFooter();

            const fileName = `Degree-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            showToast('Degree report downloaded successfully!', 'success');
            setTimeout(() => {
                anchor.remove();
                URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            console.error('Degree report download failed:', err);
            showToast('Unable to download the degree report right now.', 'error');
        } finally {
            setReportExporting(false);
        }
    };

    const displayName = user?.name || 'Guest Explorer';
    const includedSemsText = activeSems.length > 0 ? activeSems.join(', ') : 'None';

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary relative overflow-hidden font-outfit">
            <ParticleBackground />

            {/* Subtle background glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-50">
                <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(212,80,10,0.06)_0%,transparent_70%)] rounded-full blur-[80px] animate-pulse" />
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-6 pb-32">

                {/* Navbar */}
                <nav className="flex flex-wrap justify-between items-center gap-3 py-6 mb-8 border-b border-border/50">
                    <div className="text-xl font-black tracking-tighter cursor-pointer" onClick={() => router.push('/')}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1">CGPA</span> Intel
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                        {/* Streak Badge (Phase 5) */}
                        {user && user.streak_count > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setIsAchievementModalOpen(true)}
                                className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:bg-orange-500/20 transition-all"
                                title={`${user.streak_count} day streak! Click for details.`}
                            >
                                <span className="text-lg">🔥</span>
                                <span className="font-black text-orange-600 dark:text-orange-400 text-sm">{user.streak_count}</span>
                            </motion.div>
                        )}

                        {/* Syncing Indicator */}
                        {syncing && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted animate-pulse">
                                <Icon icon="solar:refresh-bold-duotone" className="animate-spin" />
                                SYNCING
                            </div>
                        )}

                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <button
                                onClick={() => setShowProfileMenu((prev) => !prev)}
                                className="font-bold flex items-center gap-2 min-w-0"
                            >
                                <span className="truncate max-w-[120px] sm:max-w-[180px]">{displayName}</span>
                                <FiChevronDown className="w-4 h-4 text-text-muted" />
                            </button>
                        </div>
                        {!user && (
                            <button onClick={() => router.push('/auth')} className="text-sm font-bold text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/10 transition-colors shadow-sm">
                                Save Progress
                            </button>
                        )}
                        {showProfileMenu && (
                            <div className="absolute top-24 right-3 sm:right-6 md:right-0 bg-bg-card border border-border rounded-2xl p-2 w-[min(18rem,calc(100vw-1.5rem))] shadow-xl z-30">
                                {user?.is_pro && (
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            handleStartCalc();
                                        }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-card-alt font-semibold"
                                    >
                                        + New Calculation
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false);
                                        handleFriendCalc();
                                    }}
                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-card-alt font-semibold flex items-center gap-2"
                                >
                                    <FiUserPlus className="w-4 h-4" /> Calculate for a friend
                                </button>
                                {user && (
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            logout();
                                            router.push('/');
                                        }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-card-alt font-semibold text-text-muted"
                                    >
                                        Sign Out
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </nav>

                <AnimatePresence>
                    {reportsLoading && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center text-text-muted font-semibold">
                            Loading your saved report data...
                        </motion.div>
                    )}

                    {/* STATE 1: Zero Data */}
                    {activeState === 'zero' && (
                        <motion.div key="zero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full">
                            <div className="bg-gradient-to-br from-bg-card to-bg-card-alt p-12 md:p-20 rounded-[40px] border border-border shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <FiActivity className="w-10 h-10 text-primary" />
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-text-primary drop-shadow-sm">
                                    Start your CGPA story.
                                </h1>
                                <p className="text-xl text-text-muted font-medium mb-10 max-w-xl mx-auto">
                                    You have no marksheets uploaded yet. Let's calculate your first semester GPA in seconds.
                                </p>
                                <button
                                    onClick={handleStartCalc}
                                    className="px-10 py-5 bg-gradient-to-r from-primary to-[#E65C00] text-white font-black text-xl rounded-full shadow-[0_20px_40px_rgba(212,80,10,0.3)] hover:scale-105 hover:shadow-[0_25px_50px_rgba(212,80,10,0.4)] transition-all flex items-center gap-3 relative overflow-hidden border border-primary/20"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                    <span>Calculate First Semester</span>
                                </button>
                            </div>

                            {/* Section for New Users to see Referral & Planner immediately */}
                            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ReferAndEarnCard
                                    user={user}
                                    referralCode={referralCode}
                                    setReferralCode={setReferralCode}
                                    handleApplyReferral={handleApplyReferral}
                                    handleCopyCode={handleCopyCode}
                                    referralLoading={referralLoading}
                                    copySuccess={copySuccess}
                                />
                                <SemesterPlannerCard
                                    onClick={() => {
                                        if (!user?.is_pro) {
                                            showToast("The Semester Planner & Goal Setting is a Saffron Pro feature!", "info");
                                        } else {
                                            router.push('/home/planner');
                                        }
                                    }}
                                    remainingSems={8 - activeSems.length}
                                    activeSems={activeSems}
                                    targetCgpa={targetCgpaDisplay}
                                />
                            </div>

                            {/* Achievements Section */}
                            <BadgeShowcase
                                reports={reports}
                                onViewFull={() => setIsAchievementModalOpen(true)}
                            />
                        </motion.div>
                    )}

                    {/* STATE 2: Single Sem Only */}
                    {activeState === 'single' && (
                        <motion.div key="single" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A - PERFORMANCE SUMMARY */}
                            <div className="bg-bg-card border border-border p-10 md:p-14 rounded-[40px] shadow-lg relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-2">PERFORMANCE SUMMARY</h3>
                                <h1 className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#E67A38] leading-none">
                                    {latestGpa > 0 ? latestGpa.toFixed(2) : '0.00'}
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest">Semester {latestSem || activeSems[0]} GPA</p>
                                <p className="text-xs text-text-muted font-semibold">This number is for this semester only, not overall CGPA.</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                                    <FiAward className="w-4 h-4" /> {currentClass}
                                </div>

                                <div className="mt-8 flex flex-col md:flex-row items-center gap-3 bg-accent-1/10 text-primary border border-accent-1/20 px-6 py-4 rounded-2xl max-w-2xl text-sm font-medium">
                                    <FiAlertCircle className="w-6 h-6 shrink-0" />
                                    <p className="text-left">
                                        <strong>This is your Sem {activeSems[0]} GPA only — not your full CGPA yet.</strong><br />
                                        Add other semesters to calculate your overall CGPA.
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                            </div>

                            {/* SECTION B - SEMESTER JOURNEY */}
                            <JourneyRow
                                activeSems={activeSems}
                                gpaBySem={gpaBySem}
                                missingSems={missingSems}
                                onAddSemester={handleQuickAddSemester}
                                onOpenSemester={handleViewSemester}
                                onUploadAllMissing={handleUploadAllMissing}
                                onEditAll={handleEditAll}
                                isDemoGPA={isDemoGPA}
                                showToast={showToast}
                                user={user}
                                semestersPresent={activeSems}
                            />

                            {/* SECTION C - QUICK INSIGHTS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-bg-card border border-border p-8 rounded-[32px] relative overflow-hidden shadow-sm flex flex-col">
                                    <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-6">QUICK INSIGHTS</h3>
                                    <h3 className="text-2xl font-black flex items-center gap-3 mb-2">
                                        <FiFileText className="text-primary" /> Sem {activeSems[0]} Breakdown
                                    </h3>
                                    <p className="text-text-primary font-medium mb-6">14 subjects · 0 arrears · 21.5 credits</p>
                                    <div className="flex gap-4 mt-auto">
                                        <div className="bg-bg-primary border border-border p-4 rounded-xl flex-1">
                                            <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Best</p>
                                            <p className="font-bold">CS8601 (O)</p>
                                        </div>
                                        <div className="bg-bg-primary border border-border p-4 rounded-xl flex-1">
                                            <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Lowest</p>
                                            <p className="font-bold">CS8604 (B+)</p>
                                        </div>
                                    </div>
                                </div>

                                <ReferAndEarnCard
                                    user={user}
                                    referralCode={referralCode}
                                    setReferralCode={setReferralCode}
                                    handleApplyReferral={handleApplyReferral}
                                    handleCopyCode={handleCopyCode}
                                    referralLoading={referralLoading}
                                    copySuccess={copySuccess}
                                />

                                <SemesterPlannerCard
                                    onClick={() => {
                                        if (!user?.is_pro) {
                                            showToast("The Semester Planner & Goal Setting is a Saffron Pro feature!", "info");
                                        } else {
                                            router.push('/home/planner');
                                        }
                                    }}
                                    remainingSems={8 - activeSems.length}
                                    activeSems={activeSems}
                                    targetCgpa={targetCgpaDisplay}
                                />
                            </div>

                            {/* Achievements Section */}
                            <BadgeShowcase
                                reports={reports}
                                onViewFull={() => setIsAchievementModalOpen(true)}
                            />
                        </motion.div>
                    )}

                    {/* STATE 3: Partial Sems */}
                    {activeState === 'partial' && (
                        <motion.div key="partial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A - PERFORMANCE SUMMARY */}
                            <div className="bg-bg-card border border-border p-10 md:p-14 rounded-[40px] shadow-lg relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-2">PERFORMANCE SUMMARY</h3>
                                <h1
                                    title={`Overall CGPA based on Sem ${includedSemsText} (${activeSems.length} uploaded, ${missingCount} missing)`}
                                    className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#E67A38] leading-none"
                                >
                                    {latestCgpa > 0 ? latestCgpa.toFixed(2) : '0.00'}
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest">CGPA so far · Sem 1 to {Math.max(0, ...activeSems)}</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm mb-6">
                                    <FiAward className="w-4 h-4" /> {currentClass}
                                </div>
                                <div className="text-sm font-semibold text-text-muted bg-bg-primary border border-border rounded-xl px-4 py-3">
                                    Overall CGPA includes Sem {includedSemsText} ({activeSems.length} sems, {missingCount} missing).
                                </div>

                                {/* ASCII stylized visual progress */}
                                <div className="w-full max-w-3xl flex items-center justify-center gap-4 py-6 border-t border-border/50">
                                    <div className="flex-1 h-3 bg-bg-primary border border-border rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-accent-1 rounded-full" style={{ width: `${Math.round((activeSems.length / 8) * 100)}%` }} />
                                    </div>
                                    <span className="font-jetbrains font-bold text-primary text-xl">{Math.round((activeSems.length / 8) * 100)}%</span>
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                            </div>

                            {/* SECTION B - SEMESTER JOURNEY */}
                            <JourneyRow
                                activeSems={activeSems}
                                gpaBySem={gpaBySem}
                                missingSems={missingSems}
                                onAddSemester={handleQuickAddSemester}
                                onOpenSemester={handleViewSemester}
                                onUploadAllMissing={handleUploadAllMissing}
                                onEditAll={handleEditAll}
                                isDemoGPA={isDemoGPA}
                                showToast={showToast}
                                user={user}
                                semestersPresent={activeSems}
                            />

                            {/* SECTION C - INSIGHTS */}
                            <div className="px-2">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-4">INSIGHTS</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="col-span-full bg-gradient-to-br from-bg-card to-bg-card-alt border border-primary/20 p-8 rounded-[40px] relative overflow-hidden flex flex-col justify-between shadow-sm mb-4">
                                        <div>
                                            <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                                <FiStar className="text-primary" /> AI Insight
                                            </h3>
                                            <p className="text-text-primary text-lg font-medium leading-relaxed italic border-l-4 border-primary/30 pl-4 py-1">
                                                {aiInsightText}
                                            </p>
                                        </div>
                                    </div>

                                    <ReferAndEarnCard
                                        user={user}
                                        referralCode={referralCode}
                                        setReferralCode={setReferralCode}
                                        handleApplyReferral={handleApplyReferral}
                                        handleCopyCode={handleCopyCode}
                                        referralLoading={referralLoading}
                                        copySuccess={copySuccess}
                                    />

                                    <SemesterPlannerCard
                                        onClick={() => {
                                            if (!user?.is_pro) {
                                                showToast("The Semester Planner & Goal Setting is a Saffron Pro feature!", "info");
                                            } else {
                                                router.push('/home/planner');
                                            }
                                        }}
                                        remainingSems={8 - activeSems.length}
                                        activeSems={activeSems}
                                        targetCgpa={targetCgpaDisplay}
                                    />

                                    {/* Placement Section for Partial */}
                                    <div className="col-span-full mt-4">
                                        <PlacementEligiblityCard cgpa={latestCgpa} isPro={user?.is_pro || false} />
                                    </div>
                                </div>
                            </div>

                            {/* Achievements Section */}
                            <BadgeShowcase
                                reports={reports}
                                onViewFull={() => setIsAchievementModalOpen(true)}
                            />
                        </motion.div>
                    )}

                    {/* STATE 4: All 8 Sems Complete */}
                    {activeState === 'complete' && (
                        <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A - PERFORMANCE SUMMARY */}
                            <div className="bg-gradient-to-br from-bg-card to-[#FFF0E5] border border-primary/30 p-10 md:p-14 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-[#D4500A] uppercase mb-2 opacity-80">PERFORMANCE SUMMARY</h3>
                                <h1
                                    title="Overall degree CGPA across all completed semesters"
                                    className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4500A] to-accent-1 leading-none drop-shadow-sm"
                                >
                                    {latestCgpa > 0 ? latestCgpa.toFixed(2) : '0.00'}
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest text-text-primary">Final Degree CGPA</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm mb-4">
                                    <FiAward className="w-4 h-4" /> {currentClass}
                                </div>

                                <div className="w-full max-w-sm mt-6 relative z-20">
                                    <button
                                        onClick={handleDownloadDegreeReport}
                                        disabled={reportExporting}
                                        className="w-full px-8 py-5 bg-primary text-white font-black text-lg rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <FiDownload className="w-6 h-6" /> {reportExporting ? 'Exporting...' : 'Download Degree Report'}
                                    </button>
                                </div>
                                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] bg-[radial-gradient(circle,rgba(212,80,10,0.15)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none z-0" />
                            </div>

                            {/* SECTION B - SEMESTER JOURNEY */}
                            <JourneyRow
                                activeSems={activeSems}
                                gpaBySem={gpaBySem}
                                missingSems={missingSems}
                                onAddSemester={handleQuickAddSemester}
                                onOpenSemester={handleViewSemester}
                                onUploadAllMissing={handleUploadAllMissing}
                                onEditAll={handleEditAll}
                                isDemoGPA={isDemoGPA}
                                showToast={showToast}
                                user={user}
                                semestersPresent={activeSems}
                            />

                            {/* SECTION C - INSIGHTS */}
                            <div className="px-2">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-4">INSIGHTS</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Swapped with Component */}
                                    {/* Swapped with Component */}
                                    <div className="col-span-full">
                                        <PlacementEligiblityCard cgpa={latestCgpa} isPro={user?.is_pro || false} />
                                    </div>

                                    {/* Refer & Earn Card */}
                                    <ReferAndEarnCard
                                        user={user}
                                        referralCode={referralCode}
                                        setReferralCode={setReferralCode}
                                        handleApplyReferral={handleApplyReferral}
                                        handleCopyCode={handleCopyCode}
                                        referralLoading={referralLoading}
                                        copySuccess={copySuccess}
                                    />

                                    <SemesterPlannerCard
                                        onClick={() => {
                                            if (!user?.is_pro) {
                                                showToast("The Semester Planner & Goal Setting is a Saffron Pro feature!", "info");
                                            } else {
                                                router.push('/home/planner');
                                            }
                                        }}
                                        remainingSems={8 - activeSems.length}
                                        activeSems={activeSems}
                                        targetCgpa={targetCgpaDisplay}
                                    />
                                </div>
                            </div>

                            {/* Achievements Section */}
                            <BadgeShowcase onViewFull={() => setIsAchievementModalOpen(true)} />
                        </motion.div>
                    )}

                </AnimatePresence >

                <AnimatePresence>
                    {isSimulatorOpen && (
                        <WhatIfSimulator
                            isOpen={isSimulatorOpen}
                            initialSubjects={simulatorSubjects}
                            currentGpa={simulatorCurrentGpa}
                            isSingle={simulatorIsSingle}
                            onClose={() => setIsSimulatorOpen(false)}
                        />
                    )}
                </AnimatePresence>
            </div >
            {/* Achievement Detail Modal */}
            <AchievementDetailModal
                isOpen={isAchievementModalOpen}
                onClose={() => setIsAchievementModalOpen(false)}
            />
            <NotificationToast
                isVisible={!!toast}
                message={toast?.message || ''}
                type={toast?.type || 'info'}
                onClose={() => setToast(null)}
            />
        </main >
    );
}

function JourneyRow({
    activeSems,
    gpaBySem,
    missingSems,
    onAddSemester,
    onOpenSemester,
    onUploadAllMissing,
    onEditAll,
    isDemoGPA,
    showToast,
    user,
    semestersPresent,
}: {
    activeSems: number[];
    gpaBySem: Record<number, number>;
    missingSems: number[];
    onAddSemester: (sem: number) => void;
    onOpenSemester: (sem: number) => void;
    onUploadAllMissing: () => void;
    onEditAll?: () => void;
    isDemoGPA?: boolean;
    showToast: (msg: string, type: 'info' | 'success' | 'error') => void;
    user: any;
    semestersPresent: number[];
}) {

    const handleTryAction = (sem: number) => {
        if (!user && semestersPresent.length > 0) {
            showToast("The free trial is limited to single-semester GPA calculation. Sign up to unlock full 8-semester CGPA tracking!", 'info');
            return;
        }
        onAddSemester(sem);
    };

    return (
        <div className="bg-bg-card border border-border p-6 md:p-8 rounded-[32px] overflow-hidden md:overflow-x-auto shadow-sm">
            <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-8">SEMESTER JOURNEY</h3>
            <div className="grid grid-cols-4 gap-3 md:flex md:gap-4 md:min-w-max pb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                    const isActive = activeSems.includes(sem);
                    return (
                        <div key={sem} className="flex flex-col items-center gap-2 md:gap-3 relative group/sem">
                            {isActive ? (
                                <>
                                    <button
                                        onClick={() => onOpenSemester(sem)}
                                        title="Click to edit semester"
                                        aria-label={`Edit Semester ${sem}`}
                                        className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 border border-primary/30 rounded-2xl flex flex-col items-center justify-center text-primary shadow-sm hover:bg-primary/20 transition-all hover:scale-105"
                                    >
                                        <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5 md:mb-1" />
                                        <span className="text-xs md:text-sm font-bold">{(gpaBySem[sem] || 0).toFixed(2)}</span>
                                    </button>
                                    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-text-primary text-white text-[10px] font-bold px-2 py-1 opacity-0 translate-y-1 transition-all duration-150 group-hover/sem:opacity-100 group-hover/sem:translate-y-0 group-focus-within/sem:opacity-100 group-focus-within/sem:translate-y-0">
                                        Click to edit semester
                                    </span>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleTryAction(sem)}
                                    title={`Add Semester ${sem}`}
                                    className="w-16 h-16 md:w-20 md:h-20 bg-bg-primary border border-border border-dashed rounded-2xl flex items-center justify-center text-text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-colors group relative shadow-sm"
                                >
                                    <FiPlus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                    {/* Pulse effect on the immediate next missing semester */}
                                    {sem === Math.max(0, ...activeSems) + 1 && (
                                        <span className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-50" />
                                    )}
                                </button>
                            )}
                            <span className="text-xs font-bold text-text-muted tracking-widest uppercase">Sem {sem}</span>
                        </div>
                    );
                })}
                {!isDemoGPA && (
                    <button
                        onClick={onUploadAllMissing}
                        className="hidden md:flex flex-col items-center justify-center gap-2 w-20 h-20 bg-primary/5 border border-primary/20 rounded-2xl text-primary hover:bg-primary/10 transition-all font-bold group"
                    >
                        <FiUpload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-[10px] uppercase tracking-tighter">All</span>
                    </button>
                )}
            </div>
            {/* Added instructions snippet for Journey row click behaviors */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-xs text-text-muted font-medium pt-4 border-t border-border/50">
                <span className="flex items-center gap-2"><div className="bg-primary/10 text-primary p-1 rounded"><FiCheckCircle className="w-3 h-3" /></div> Click a filled box to open semester details</span>
                <span className="flex items-center gap-2"><div className="bg-bg-primary border border-dashed border-border p-1 rounded"><FiPlus className="w-3 h-3" /></div> Click + to directly add that semester</span>
            </div>
            {missingSems.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm font-bold text-primary">{missingSems.length} sems missing</p>
                    <button
                        onClick={onUploadAllMissing}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-95 w-full sm:w-auto"
                    >
                        <FiUpload className="w-4 h-4" /> Upload all missing at once
                    </button>
                </div>
            )}
            {activeSems.length > 0 && onEditAll && (
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={onEditAll}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg-primary hover:border-primary/40 hover:text-primary font-bold text-sm"
                    >
                        <FiEdit3 className="w-4 h-4" /> Edit all semesters
                    </button>
                </div>
            )}
        </div>
    );
}
