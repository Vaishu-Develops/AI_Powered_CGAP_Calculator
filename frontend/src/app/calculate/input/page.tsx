'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import UploadSection from '@/components/UploadSection';
import ProgressBar from '@/components/ProgressBar';
import ResultsSection from '@/components/ResultsSection';
import PreviewSection from '@/components/PreviewSection';
import { useCalcFlow } from '@/context/CalcFlowContext';
import ManualEntryGrid from '@/components/ManualEntryGrid';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

type Stage = 'idle' | 'uploading' | 'ocr' | 'preview' | 'calculating' | 'done';

export default function InputPage() {
  const router = useRouter();
  const { state } = useCalcFlow();

  // Enforce flow: If user bypassed steps, redirect to start
  useEffect(() => {
    if (!state.target || !state.mode || !state.inputMethod) {
      router.push('/calculate/who');
    }
  }, [state, router]);

  const [stage, setStage] = useState<Stage>('idle');
  const [results, setResults] = useState<any>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef<File[]>([]);

  // ── Step 1: Files Selected → Upload to /preview-ocr/ sequentially ──
  const handleFilesSelected = async (files: File[]) => {
    filesRef.current = files;

    // Create preview URLs for all uploaded images
    const urls = files.map(f => URL.createObjectURL(f));
    setImageUrls(urls);

    setError(null);
    setResults(null);
    setOcrData(null);

    // Stage: uploading
    setStage('uploading');
    setStatusMsg(`Uploading ${files.length} marksheet(s)...`);
    await sleep(300);

    // Stage: OCR
    setStage('ocr');

    try {
      let combinedSubjects: any[] = [];
      let overallConfidence = 0;
      let highestSem = 0;
      let regulationStr = '';

      for (let i = 0; i < files.length; i++) {
        setStatusMsg(`Scanning file ${i + 1} of ${files.length}...`);
        const formData = new FormData();
        formData.append('file', files[i]);

        const res = await fetch('http://localhost:8000/preview-ocr/', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || `OCR failed for file ${i + 1}`);
        }

        const data = await res.json();
        const newSubjects = data.subjects || [];

        // Smart Merging Logic: Always keep the PASSING grade for duplicate subject codes
        // This handles arrear-clearing across semesters regardless of file upload order
        newSubjects.forEach((newSub: any) => {
          const existingIdx = combinedSubjects.findIndex(s => s.subject_code === newSub.subject_code);
          if (existingIdx > -1) {
            const existingGrade = combinedSubjects[existingIdx].grade;
            const newGrade = newSub.grade;

            const FAILING = ['U', 'RA', 'SA', 'W', 'AB', '-'];
            const isExistingPassing = !FAILING.includes(existingGrade);
            const isNewPassing = !FAILING.includes(newGrade);

            // Always prefer the passing result
            if (isNewPassing && !isExistingPassing) {
              // New is pass, existing is fail → overwrite with pass
              combinedSubjects[existingIdx] = newSub;
            } else if (!isNewPassing && isExistingPassing) {
              // New is fail, existing is pass → KEEP existing (don't overwrite)
              // This is the key fix: don't let a later RA overwrite a pass
            } else if (isNewPassing && isExistingPassing) {
              // Both pass → keep existing (first occurrence is fine)
            }
            // Both fail → keep existing
          } else {
            combinedSubjects.push(newSub);
          }
        });

        overallConfidence += data.confidence?.overall || 0;
        const sem = data.semester_info?.semester || 0;
        if (sem > highestSem) {
          highestSem = sem;
          if (data.semester_info?.regulation) regulationStr = data.semester_info.regulation;
        }
      }

      const avgConfidence = files.length > 0 ? overallConfidence / files.length : 0;

      const mergedData = {
        subjects: combinedSubjects,
        semester_info: {
          semester: highestSem > 0 ? highestSem : undefined,
          regulation: regulationStr || undefined
        },
        confidence: { overall: avgConfidence },
        status: "preview_ready"
      };

      setOcrData(mergedData);
      setStage('preview');
      setStatusMsg(`Review ${combinedSubjects.length} extracted subjects`);
    } catch (e: any) {
      setError(e.message || 'Failed to scan marksheets. Is the backend running?');
      setStage('idle');
    }
  };

  // ── Manual Calculation Flow ──
  const handleManualCalculate = async (customSubjects: any[], metadata: { semester: number; branch: string; regulation: string }) => {
    setStage('calculating');
    setStatusMsg(`Computing ${metadata.branch.toUpperCase()} CGPA...`);

    try {
      await sleep(400);

      const payload = {
        subjects: customSubjects,
        semester: metadata.semester,
        regulation: metadata.regulation,
        branch: metadata.branch
      };

      const res = await fetch('http://localhost:8000/calculate-from-data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Calculation failed');
      }

      const data = await res.json();
      setResults(data);
      setStage('done');
      setStatusMsg('Done!');
    } catch (e: any) {
      setError(e.message || 'Calculation error.');
      setStage('idle');
    }
  };

  // ── Step 2: Confirmed from Preview → Calculate ──
  const handleConfirm = async (editedSubjects: any[]) => {
    setStage('calculating');
    setStatusMsg('Computing CGPA...');

    try {
      await sleep(400);

      const payload = {
        subjects: editedSubjects,
        semester: ocrData?.semester_info?.semester || 1,
        regulation: ocrData?.semester_info?.regulation || "2021"
      };

      const res = await fetch('http://localhost:8000/calculate-from-data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Calculation failed');
      }

      const data = await res.json();
      setResults(data);
      setStage('done');
      setStatusMsg('Done!');
    } catch (e: any) {
      setError(e.message || 'Calculation error. Make sure the backend is running.');
      setStage('preview');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setResults(null);
    setOcrData(null);
    setImageUrls([]);
    setError(null);
    setStatusMsg('');
    filesRef.current = [];
  };

  if (!state.inputMethod) return null; // Prevent flicker while redirecting

  return (
    <main className="min-h-screen bg-bg py-12 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-1/5 rounded-full blur-[120px] pointer-events-none" />

      <ParticleBackground />

      <div className="relative z-10 max-w-6xl mx-auto">
        <header className="text-center py-12 mb-4">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-card border border-border text-[0.65rem] font-black uppercase tracking-[0.2em] text-text-muted shadow-sm">
            <span className="flex items-center gap-1.5 underline decoration-primary/30 decoration-2 underline-offset-2">
              {state.target === 'me' ? 'My Report' : `${state.friendName}'s Report`}
            </span>
            <span className="opacity-30">•</span>
            <span className={state.mode === 'single_sem' ? 'text-primary' : 'text-accent-1'}>
              {state.mode === 'single_sem' ? 'Single Sem' : 'Multi Sem CGPA'}
            </span>
            <span className="opacity-30">•</span>
            <span className="text-text-primary px-2 py-0.5 rounded-md bg-bg-card-alt border border-border/50">
              {state.inputMethod === 'ocr' ? 'AI OCR' : 'Manual Entry'}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            {state.inputMethod === 'ocr' ? 'Scan Marksheets' : 'Provide Grades'}
          </h1>
          <p className="text-text-muted font-medium text-lg max-w-xl mx-auto leading-relaxed">
            {state.inputMethod === 'ocr'
              ? 'Upload screenshots of your marksheets and let Saffron Engine extract the data.'
              : 'Manually enter your subject codes and grades for a precise calculation.'}
          </p>
        </header>

        {stage !== 'idle' && stage !== 'done' && <ProgressBar stage={stage} />}

        {/* Status Message */}
        {statusMsg && stage !== 'idle' && stage !== 'preview' && stage !== 'done' && (
          <div className="text-center mb-10 font-bold text-text-primary bg-bg-card border border-border inline-block px-6 py-2 rounded-full mx-auto flex justify-center w-fit shadow-sm">
            {statusMsg}
          </div>
        )}

        {/* ── INTERFACES ── */}

        {stage === 'idle' && (
          <div className="animate-fade-up">
            {state.inputMethod === 'ocr' ? (
              <UploadSection onFilesSelected={handleFilesSelected} />
            ) : (
              <ManualEntryGrid onCalculate={handleManualCalculate} />
            )}

            {error && (
              <div className="max-w-xl mx-auto mt-8 p-6 bg-accent-2/10 border border-accent-2/30 text-accent-2 rounded-[24px] text-center font-bold">
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* OCR Loading & Calculating states (hidden to save space in code block, existing spinners work fine) */}
        {(stage === 'uploading' || stage === 'ocr') && (
          <div className="text-center py-20 text-2xl font-bold animate-pulse text-primary">Scanning Document...</div>
        )}

        {stage === 'calculating' && (
          <div className="text-center py-20 text-2xl font-bold animate-pulse text-data">Calculating Results...</div>
        )}

        {stage === 'preview' && ocrData && imageUrls.length > 0 && (
          <PreviewSection
            imageUrls={imageUrls}
            ocrData={ocrData}
            onConfirm={handleConfirm}
            onBack={() => setStage('idle')}
          />
        )}

        {stage === 'done' && results && (
          <ResultsSection data={results} onReset={handleReset} />
        )}
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
