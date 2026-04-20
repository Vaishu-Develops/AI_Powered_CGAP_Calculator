'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { useCalcFlow } from '@/context/CalcFlowContext';
import { useUser } from '@/context/UserContext';
import LoadingSaffron from '@/components/LoadingSaffron';

const GRADES = ['S', 'O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'SA', 'W', 'AB', 'F', '-'];
const FAILING = new Set(['U', 'RA', 'SA', 'W', 'AB', 'F', '-']);

const GP: Record<string, number> = {
  S: 10,
  O: 10,
  'A+': 9,
  A: 8,
  'B+': 7,
  B: 6,
  C: 5,
  U: 0,
  RA: 0,
  SA: 0,
  W: 0,
  AB: 0,
  F: 0,
  '-': 0,
};

type SubjectRow = {
  subject_code: string;
  grade: string;
  credits: number;
  original_semester: number;
  is_arrear?: boolean;
};

type ApiSubject = {
  subject_code?: string;
  grade?: string;
  credits?: number;
  is_arrear?: boolean;
};

export default function EditAllPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isDemo } = useUser();
  const { setTarget, setMode, setInputMethod, setSource, setPreselectedSemester, setPreselectedSemesters } = useCalcFlow();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bySemester, setBySemester] = useState<Record<number, SubjectRow[]>>({});
  const [activeSem, setActiveSem] = useState<number>(1);

  useEffect(() => {
    if (!user || isDemo) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/reports/user/${encodeURIComponent(user.id)}/subjects`);
        if (!res.ok) throw new Error('Failed to load semester data');
        const data = await res.json();

        const next: Record<number, SubjectRow[]> = {};
        const source = data?.by_semester || {};
        for (const semKey of Object.keys(source)) {
          const sem = Number(semKey);
          if (!Number.isFinite(sem) || sem <= 0) continue;
          next[sem] = (source[semKey] || []).map((s: ApiSubject) => ({
            subject_code: String(s.subject_code || '').toUpperCase(),
            grade: String(s.grade || '').toUpperCase(),
            credits: Number(s.credits || 0),
            original_semester: sem,
            is_arrear: Boolean(s.is_arrear),
          }));
        }

        setBySemester(next);
        const firstSem = Object.keys(next).map(Number).sort((a, b) => a - b)[0] || 1;
        const requestedSem = Number(searchParams.get('sem') || 0);
        if (requestedSem > 0 && next[requestedSem]) {
          setActiveSem(requestedSem);
        } else {
          setActiveSem(firstSem);
        }

      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unable to load editable semester data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, isDemo, searchParams]);

  const semesters = useMemo(() => Object.keys(bySemester).map(Number).sort((a, b) => a - b), [bySemester]);

  const gpaBySem = useMemo(() => {
    const out: Record<number, number> = {};
    for (const sem of semesters) {
      const rows = bySemester[sem] || [];
      const weighted = rows.reduce((sum, r) => {
        const grade = String(r.grade || '').toUpperCase();
        if (FAILING.has(grade)) return sum;
        return sum + (GP[grade] || 0) * Number(r.credits || 0);
      }, 0);
      const credits = rows.reduce((sum, r) => {
        const grade = String(r.grade || '').toUpperCase();
        if (FAILING.has(grade)) return sum;
        return sum + Number(r.credits || 0);
      }, 0);
      out[sem] = credits > 0 ? Math.round((weighted / credits) * 100) / 100 : 0;
    }
    return out;
  }, [bySemester, semesters]);

  const cgpa = useMemo(() => {
    const validSems = semesters.filter((sem) => (bySemester[sem] || []).length > 0);
    if (validSems.length === 0) return 0;
    const weighted = validSems.reduce((sum, sem) => {
      const rows = bySemester[sem] || [];
      return sum + rows.reduce((acc, r) => {
        const grade = String(r.grade || '').toUpperCase();
        if (FAILING.has(grade)) return acc;
        return acc + (GP[grade] || 0) * Number(r.credits || 0);
      }, 0);
    }, 0);
    const credits = validSems.reduce((sum, sem) => {
      const rows = bySemester[sem] || [];
      return sum + rows.reduce((acc, r) => {
        const grade = String(r.grade || '').toUpperCase();
        if (FAILING.has(grade)) return acc;
        return acc + Number(r.credits || 0);
      }, 0);
    }, 0);
    return credits > 0 ? Math.round((weighted / credits) * 100) / 100 : 0;
  }, [bySemester, semesters]);

  const updateRow = (index: number, patch: Partial<SubjectRow>) => {
    setBySemester((prev) => {
      const rows = [...(prev[activeSem] || [])];
      rows[index] = { ...rows[index], ...patch };
      return { ...prev, [activeSem]: rows };
    });
  };

  const addRow = () => {
    setBySemester((prev) => ({
      ...prev,
      [activeSem]: [
        ...(prev[activeSem] || []),
        {
          subject_code: '',
          grade: 'U',
          credits: 0,
          original_semester: activeSem,
          is_arrear: false,
        },
      ],
    }));
  };

  const removeRow = (index: number) => {
    setBySemester((prev) => ({
      ...prev,
      [activeSem]: (prev[activeSem] || []).filter((_, i) => i !== index),
    }));
  };

  const persistAllSemesters = async () => {
    if (!user || isDemo) return;
    const sems = Object.keys(bySemester).map(Number).sort((a, b) => a - b);
    for (const sem of sems) {
      const subjects = (bySemester[sem] || [])
        .filter((r) => r.subject_code.trim())
        .map((r) => ({
          subject_code: String(r.subject_code || '').toUpperCase().trim(),
          grade: String(r.grade || '').toUpperCase(),
          credits: Number(r.credits || 0),
          original_semester: sem,
          is_arrear: Boolean(r.is_arrear),
        }));

      if (subjects.length === 0) continue;

      const gpa = Number(gpaBySem[sem] || 0);
      const totalCredits = subjects.reduce((sum, s) => sum + Number(s.credits || 0), 0);

      const payload = {
        firebase_uid: user.id,
        email: user.email,
        name: user.name,
        semester: sem,
        regulation: '2021',
        branch: 'CSE',
        gpa,
        cgpa,
        total_credits: totalCredits,
        subjects,
      };

      const res = await fetch('http://localhost:8000/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to save Semester ${sem}`);
      }
    }
  };

  const handleSaveAll = async () => {
    if (!user || isDemo) return;
    setSaving(true);
    setError(null);

    try {
      await persistAllSemesters();
      router.push('/home');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewImpact = async () => {
    if (!user || isDemo) return;
    setSaving(true);
    setError(null);

    try {
      // Preview impact should reflect persisted edits only.
      await persistAllSemesters();
      setTarget('me');
      setMode('multi_sem');
      setInputMethod('manual');
      setSource('fresh');
      setPreselectedSemester(null);
      setPreselectedSemesters([]);
      router.push('/calculate/input?source=edit-all&view=results');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to preview impact';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSaffron message="Preparing Workspace..." />;
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <button onClick={() => router.push('/home')} className="inline-flex items-center gap-2 font-bold text-text-muted hover:text-text-primary self-start">
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-center sm:text-left">Edit All Semesters</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              disabled={saving}
              onClick={handlePreviewImpact}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary/5 flex-1 sm:flex-none disabled:opacity-60"
            >
              Preview Impact
            </button>
            <button
              disabled={saving}
              onClick={handleSaveAll}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-bold disabled:opacity-60 flex-1 sm:flex-none"
            >
              <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-500 font-semibold">{error}</div>}

        {/* Edit Table */}
        <div className="mb-5 flex flex-wrap gap-2">
          {semesters.map((sem) => (
            <button
              key={sem}
              onClick={() => setActiveSem(sem)}
              className={`px-4 py-2 rounded-full text-sm font-bold border ${activeSem === sem ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-primary'}`}
            >
              Sem {sem}
            </button>
          ))}
        </div>

        <div className="bg-bg-card border border-border rounded-[24px] p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-black">Semester {activeSem}</h2>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-widest text-text-muted font-bold">GPA Preview</p>
              <p className="text-2xl font-black text-primary">{Number(gpaBySem[activeSem] || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto border border-border rounded-2xl">
            <table className="w-full min-w-[760px]">
              <thead className="bg-bg-primary text-xs uppercase tracking-widest text-text-muted">
                <tr>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Grade</th>
                  <th className="text-left px-3 py-2">Credits</th>
                  <th className="text-left px-3 py-2">Arrear</th>
                  <th className="text-left px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(bySemester[activeSem] || []).map((row, index) => (
                  <tr key={`${activeSem}-${index}`} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      <input
                        value={row.subject_code}
                        onChange={(e) => updateRow(index, { subject_code: e.target.value.toUpperCase() })}
                        className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.grade}
                        onChange={(e) => updateRow(index, { grade: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border"
                      >
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.credits}
                        onChange={(e) => updateRow(index, { credits: Number(e.target.value || 0) })}
                        className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-border"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(row.is_arrear)}
                        onChange={(e) => updateRow(index, { is_arrear: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeRow(index)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10">
                        <FiTrash2 className="w-4 h-4" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {(bySemester[activeSem] || []).map((row, index) => (
              <div key={`${activeSem}-${index}`} className="rounded-2xl border border-border bg-bg-primary/50 p-3 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Code</p>
                  <input
                    value={row.subject_code}
                    onChange={(e) => updateRow(index, { subject_code: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-2 rounded-lg bg-bg-primary border border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Grade</p>
                    <select
                      value={row.grade}
                      onChange={(e) => updateRow(index, { grade: e.target.value })}
                      className="w-full px-2 py-2 rounded-lg bg-bg-primary border border-border"
                    >
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Credits</p>
                    <input
                      type="number"
                      min={0}
                      value={row.credits}
                      onChange={(e) => updateRow(index, { credits: Number(e.target.value || 0) })}
                      className="w-full px-2 py-2 rounded-lg bg-bg-primary border border-border"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(row.is_arrear)}
                      onChange={(e) => updateRow(index, { is_arrear: e.target.checked })}
                    />
                    Arrear
                  </label>
                  <button onClick={() => removeRow(index)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10">
                    <FiTrash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button onClick={addRow} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary font-bold hover:bg-primary/5 w-full sm:w-auto">
              <FiPlus className="w-4 h-4" /> Add Subject
            </button>
            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-widest text-text-muted font-bold">Overall CGPA Preview</p>
              <p className="text-2xl font-black text-primary">{cgpa.toFixed(2)}</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
