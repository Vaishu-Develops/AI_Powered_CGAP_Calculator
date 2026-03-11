'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import UploadSection from '@/components/UploadSection';

import ResultsSection from '@/components/ResultsSection';
import PreviewSection from '@/components/PreviewSection';
import { useCalcFlow } from '@/context/CalcFlowContext';
import ManualEntryGrid from '@/components/ManualEntryGrid';
import SemesterSelector, { SemSlot } from '@/components/SemesterSelector';
import SlotMismatchModal, { SlotMismatch } from '@/components/SlotMismatchModal';
import OcrScanScreen from '@/components/OcrScanScreen';

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
  const [semSlots, setSemSlots] = useState<SemSlot[]>([
    { sem: 1, file: null, previewUrl: null },
  ]);
  const [mismatches, setMismatches] = useState<SlotMismatch[]>([]);
  const [pendingOcrData, setPendingOcrData] = useState<any>(null);
  const filesRef = useRef<File[]>([]);

  // ── Step 1: Files Selected → Upload to /preview-ocr/ sequentially ──
  // slotMap: optional map of fileIndex → slotSem (for multi-sem mismatch detection)
  const handleFilesSelected = async (files: File[], slotMap?: number[]) => {
    filesRef.current = files;
    const urls = files.map(f => URL.createObjectURL(f));
    setImageUrls(urls);
    setError(null); setResults(null); setOcrData(null);
    setStage('uploading');
    setStatusMsg(`Uploading ${files.length} marksheet(s)...`);
    await sleep(300);
    setStage('ocr');

    try {
      const FAILING = ['U', 'RA', 'SA', 'W', 'AB', '-'];
      let bestAttempts: Record<string, { slideIdx: number; sub: any }> = {};
      let overallConfidence = 0;
      let highestSem = 0;
      let regulationStr = '';
      const foundMismatches: SlotMismatch[] = [];

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
        const detectedSem: number = data.semester_info?.semester || 0;

        // ── Layer 2: Slot mismatch detection ──
        if (slotMap && slotMap[i] && detectedSem > 0 && detectedSem !== slotMap[i]) {
          const slot = semSlots.find(s => s.sem === slotMap[i]);
          foundMismatches.push({
            slotSem: slotMap[i],
            detectedSem,
            regNo: data.semester_info?.reg_no,
            previewUrl: slot?.previewUrl ?? null,
          });
          // Don't merge subjects from a mismatched slot
          continue;
        }

        const newSubjects = data.subjects || [];
        newSubjects.forEach((newSub: any) => {
          const code = (newSub.subject_code || '').toUpperCase();
          const isPassing = !FAILING.includes(newSub.grade);
          
          if (!bestAttempts[code]) {
            bestAttempts[code] = { slideIdx: i, sub: newSub };
          } else {
            const existingSub = bestAttempts[code].sub;
            const existingPassing = !FAILING.includes(existingSub.grade);
            
            // If current is better (Fail -> Pass)
            if (!existingPassing && isPassing) {
              // Update the grade/data, but keep it on the original slide tab as per user request
              bestAttempts[code].sub = newSub;
            }
          }
        });

        overallConfidence += data.confidence?.overall || 0;
        if (detectedSem > highestSem) {
          highestSem = detectedSem;
          if (data.semester_info?.regulation) regulationStr = data.semester_info.regulation;
        }
      }

      // Reconstruct per-file structure from fused attempts
      const subjectsPerFile: any[][] = files.map(() => []);
      Object.values(bestAttempts).forEach(entry => {
        if (subjectsPerFile[entry.slideIdx]) {
           subjectsPerFile[entry.slideIdx].push(entry.sub);
        }
      });

      const combinedSubjects = Object.values(bestAttempts).map(e => e.sub);
      const avgConfidence = files.length > 0 ? overallConfidence / files.length : 0;
      const mergedData = {
        subjects: combinedSubjects,
        subjects_per_file: subjectsPerFile,
        semester_info: { semester: highestSem > 0 ? highestSem : undefined, regulation: regulationStr || undefined },
        confidence: { overall: avgConfidence },
        status: 'preview_ready'
      };

      if (foundMismatches.length > 0) {
        // Pause — show mismatch modal before proceeding to preview
        setPendingOcrData(mergedData);
        setMismatches(foundMismatches);
        setStage('idle');
        setStatusMsg('');
      } else {
        setOcrData(mergedData);
        // Do NOT setStage('preview') here. Let the OCR animation finish first.
        setStatusMsg(`Animating ${combinedSubjects.length} extracted subjects...`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to scan marksheets. Is the backend running?');
      setStage('idle');
    }
  };

  // ── Mismatch handlers ──
  const handleMismatchSkip = (slotSem: number) => {
    const remaining = mismatches.filter(m => m.slotSem !== slotSem);
    setMismatches(remaining);
    if (remaining.length === 0 && pendingOcrData) {
      setOcrData(pendingOcrData);
      setPendingOcrData(null);
      setStage('ocr');
      setStatusMsg(`Animating ${pendingOcrData.subjects.length} extracted subjects...`);
    }
  };

  const handleMismatchReplace = (slotSem: number) => {
    // Remove the mismatch from list; user will re-upload to the slot card and click Scan All again
    const remaining = mismatches.filter(m => m.slotSem !== slotSem);
    setMismatches(remaining);
    // Clear the bad file from that slot so user is forced to re-upload
    setSemSlots(prev => prev.map(s => s.sem === slotSem ? { ...s, file: null, previewUrl: null } : s));
    if (remaining.length === 0 && pendingOcrData) {
      setOcrData(pendingOcrData);
      setPendingOcrData(null);
      setStage('ocr');
      setStatusMsg(`Animating ${pendingOcrData.subjects.length} extracted subjects...`);
    }
  };

  const handleScanAnimationComplete = () => {
    setStage('preview');
    setStatusMsg(`Review extracted subjects`);
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
      {/* Slot mismatch modal — rendered at top level to overlay everything */}
      {mismatches.length > 0 && (
        <SlotMismatchModal
          mismatches={mismatches}
          onReplace={handleMismatchReplace}
          onSkip={handleMismatchSkip}
          onProceed={() => {
            if (pendingOcrData) {
              setOcrData(pendingOcrData);
              setPendingOcrData(null);
              setStage('preview');
            }
            setMismatches([]);
          }}
        />
      )}
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
              <>
                {state.mode === 'multi_sem' ? (
                  <>
                    <SemesterSelector slots={semSlots} onSlotsChange={setSemSlots} />
                    {/* Scan All button */}
                    {semSlots.some(s => s.file) && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '16px' }}>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          whileHover={{ y: -2 }}
                          onClick={() => {
                            const uploadedSlots = semSlots.filter(s => s.file);
                            const files = uploadedSlots.map(s => s.file!);
                            const slotMap = uploadedSlots.map(s => s.sem);
                            handleFilesSelected(files, slotMap);
                          }}
                          style={{
                            padding: '14px 40px',
                            borderRadius: '999px',
                            background: '#D4500A',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '15px',
                            fontFamily: 'Outfit, sans-serif',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(212,80,10,0.25)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          Scan All {semSlots.filter(s => s.file).length} Marksheet{semSlots.filter(s => s.file).length > 1 ? 's' : ''} →
                        </motion.button>
                      </div>
                    )}
                  </>
                ) : (
                  <UploadSection onFilesSelected={handleFilesSelected} />
                )}
              </>
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

        {/* OCR Loading — The Reading Room split-layout animation */}
        {(stage === 'uploading' || stage === 'ocr') && (
          <div className="animate-fade-up">
            <OcrScanScreen
              imageUrl={imageUrls[0] ?? null}
              currentFile={filesRef.current ? Array.from(filesRef.current).findIndex((_, i) => i === 0) + 1 : 1}
              totalFiles={filesRef.current?.length ?? 1}
              statusMsg={statusMsg}
              ocrData={ocrData}
              onComplete={handleScanAnimationComplete}
            />
          </div>
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
          <ResultsSection data={results} onReset={handleReset} mode={(state.mode as 'single_sem' | 'multi_sem') || 'single_sem'} context={state} />
        )}
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
