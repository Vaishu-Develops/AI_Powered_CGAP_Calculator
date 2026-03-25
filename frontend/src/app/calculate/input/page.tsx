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

const FAILING_GRADES = new Set(['U', 'RA', 'SA', 'W', 'AB', '-']);

function isPassingGrade(grade?: string) {
  return !!grade && !FAILING_GRADES.has(String(grade).toUpperCase());
}

function normalizeSubjectsByHome(rawSubjectsPerFile: any[][], fileSems: number[]) {
  const normalizedPerFile: any[][] = rawSubjectsPerFile.map(() => []);
  const semToFirstSlide = new Map<number, number>();
  fileSems.forEach((sem, idx) => {
    if (!semToFirstSlide.has(sem)) semToFirstSlide.set(sem, idx);
  });

  type HomeRef = { homeSem: number; slideIdx: number; rowIdx: number };
  const homeMap: Record<string, HomeRef> = {};

  const order = rawSubjectsPerFile
    .map((_, idx) => ({ idx, sem: fileSems[idx] || 99 }))
    .sort((a, b) => (a.sem - b.sem) || (a.idx - b.idx));

  for (const { idx: slideIdx } of order) {
    const subjects = rawSubjectsPerFile[slideIdx] || [];

    for (const raw of subjects) {
      const code = String(raw.subject_code || '').toUpperCase().trim();
      if (!code) continue;

      const credits = typeof raw.credits === 'number' ? raw.credits : null;
      const semFromRow = Number(raw.original_semester || raw.semester || fileSems[slideIdx] || 0) || fileSems[slideIdx] || 0;
      // Key by code only; we resolve credits compatibility below to handle OCR misses
      const key = code;

      if (!homeMap[key]) {
        const targetSlide = semToFirstSlide.get(semFromRow) ?? slideIdx;
        const base = { ...raw, subject_code: code, home_semester: semFromRow };
        normalizedPerFile[targetSlide].push(base);
        homeMap[key] = {
          homeSem: semFromRow,
          slideIdx: targetSlide,
          rowIdx: normalizedPerFile[targetSlide].length - 1,
        };
        continue;
      }

      const home = homeMap[key];
      // If both entries have explicit credits and they differ, treat as a different subject
      // (same code, different credit weight = curriculum change or different course)
      if (home.slideIdx !== undefined) {
        const existingEntry = normalizedPerFile[home.slideIdx][home.rowIdx];
        const existingCredits = existingEntry && typeof existingEntry.credits === 'number' ? existingEntry.credits : null;
        if (existingCredits !== null && credits !== null && existingCredits !== credits) {
          // Different subject with same code — add as new entry
          const targetSlide = semToFirstSlide.get(semFromRow) ?? slideIdx;
          const base = { ...raw, subject_code: code, home_semester: semFromRow };
          normalizedPerFile[targetSlide].push(base);
          homeMap[`${code}::${credits}`] = {
            homeSem: semFromRow,
            slideIdx: targetSlide,
            rowIdx: normalizedPerFile[targetSlide].length - 1,
          };
          continue;
        }
      }
      const existing = normalizedPerFile[home.slideIdx][home.rowIdx];
      if (!existing) continue;

      const currentPassing = isPassingGrade(raw.grade);
      const existingPassing = isPassingGrade(existing.grade);
      const sameHomeSem = semFromRow === home.homeSem;

      // Same-sem duplicate: prefer revaluation override, then better confidence.
      if (sameHomeSem) {
        if (raw.overridden_by_revaluation && !existing.overridden_by_revaluation) {
          normalizedPerFile[home.slideIdx][home.rowIdx] = { ...existing, ...raw, subject_code: code };
        } else if ((Number(raw.confidence) || 0) > (Number(existing.confidence) || 0)) {
          normalizedPerFile[home.slideIdx][home.rowIdx] = { ...existing, ...raw, subject_code: code };
        }
        continue;
      }

      // Later-sem arrear appearance: DO NOT keep in later table.
      // Update only the home-sem record with latest passing grade when available.
      if (currentPassing) {
        normalizedPerFile[home.slideIdx][home.rowIdx] = {
          ...existing,
          grade: String(raw.grade || existing.grade).toUpperCase(),
          confidence: Math.max(Number(existing.confidence) || 0, Number(raw.confidence) || 0),
          cleared_in_semester: semFromRow,
          cleared_badge: `cleared Sem ${semFromRow}`,
          cleared_source_grade: raw.grade,
          is_cleared_arrear: true,
        };
      } else if (!existingPassing) {
        // Still uncleared arrear; keep on home sem only, retain lowest-state grade.
        normalizedPerFile[home.slideIdx][home.rowIdx] = {
          ...existing,
          grade: String(existing.grade || raw.grade || 'U').toUpperCase(),
          confidence: Math.max(Number(existing.confidence) || 0, Number(raw.confidence) || 0),
        };
      }
    }
  }

  return {
    subjectsPerFile: normalizedPerFile,
    combinedSubjects: normalizedPerFile.flat(),
  };
}

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
  const [fileSemestersState, setFileSemestersState] = useState<number[]>([]); // New state for PreviewSection
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
      const rawSubjectsPerFile: any[][] = files.map(() => []);
      const fileSems: number[] = files.map((_, idx) => (slotMap && slotMap[idx]) ? slotMap[idx] : 0);
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
        if (!fileSems[i]) fileSems[i] = detectedSem || (i + 1);

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
        // Keep per-file raw extraction; we will run a home-subject normalization pass after all files are scanned.
        rawSubjectsPerFile[i] = Array.isArray(newSubjects) ? [...newSubjects] : [];

        overallConfidence += data.confidence?.overall || 0;
        if (detectedSem > highestSem) {
          highestSem = detectedSem;
          if (data.semester_info?.regulation) regulationStr = data.semester_info.regulation;
        }
      }

      const { subjectsPerFile, combinedSubjects } = normalizeSubjectsByHome(rawSubjectsPerFile, fileSems);
      const avgConfidence = files.length > 0 ? overallConfidence / files.length : 0;
      const mergedData = {
        subjects: combinedSubjects,
        subjects_per_file: subjectsPerFile,
        semester_info: { semester: highestSem > 0 ? highestSem : undefined, regulation: regulationStr || undefined },
        confidence: { overall: avgConfidence },
        status: 'preview_ready'
      };

      setFileSemestersState(fileSems); // Store semester mapping for PreviewSection

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

      // ── Compute semester_gpas on frontend using the SAME formula as Preview table ──
      // This ensures the Semester Journey chart always matches what the user saw in Preview.
      const GP_MAP: Record<string, number> = {
        'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5,
        'U': 0, 'RA': 0, 'SA': 0, 'W': 0, 'AB': 0, 'F': 0, '-': 0,
      };
      const FAIL_GRADES = new Set(['U', 'RA', 'SA', 'W', 'AB', 'F', '-']);

      // Merge edited subjects into the backend result to ensure the Subject Analysis table shows all edits
      const mergedSubjects: Record<string, any> = { ...(data.subjects || {}) };
      for (const subj of editedSubjects) {
        const code = (subj.subject_code || subj.code || '').trim().toUpperCase();
        if (!code) continue;

        const grade = String(subj.grade || '').toUpperCase();
        const credits = Number(subj.credits || 0);
        const gradePoints = Number(subj.grade_points ?? GP_MAP[grade] ?? 0);
        const weighted = gradePoints * credits;
        const semesterTag = Number(subj.semester || subj.home_semester || subj.original_semester || 1);
        const status = !FAIL_GRADES.has(grade) && gradePoints > 0 ? 'PASS' : 'FAIL';

        mergedSubjects[code] = {
          grade,
          grade_points: gradePoints,
          credits,
          weighted,
          status,
          is_arrear: subj.is_arrear ?? false,
          original_semester: semesterTag,
          marks: subj.marks ?? mergedSubjects[code]?.marks,
        };
      }
      data.subjects = mergedSubjects;

      const semBuckets: Record<number, { weighted: number; credits: number }> = {};
      for (const subj of Object.values(mergedSubjects)) {
        const sem = Number((subj as any).original_semester || 1);
        const grade = String((subj as any).grade || '').toUpperCase();
        const credits = Number((subj as any).credits || 0);
        const gp = Number((subj as any).grade_points ?? GP_MAP[grade] ?? 0);

        if (!semBuckets[sem]) semBuckets[sem] = { weighted: 0, credits: 0 };

        // Pass-only formula — identical to Preview table's calcGPA
        if (!FAIL_GRADES.has(grade) && credits > 0) {
          semBuckets[sem].weighted += gp * credits;
          semBuckets[sem].credits += credits;
        }
      }

      const frontendSemGpas = Object.keys(semBuckets)
        .map(Number)
        .sort((a, b) => a - b)
        .map(sem => ({
          semester: sem,
          gpa: semBuckets[sem].credits > 0
            ? Math.round((semBuckets[sem].weighted / semBuckets[sem].credits) * 100) / 100
            : 0,
          credits: semBuckets[sem].credits,
        }));

      // Override backend's semester_gpas with our frontend-computed values
      data.semester_gpas = frontendSemGpas;

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
            {state.inputMethod === 'ocr' && (
              <div className="max-w-4xl mx-auto mb-8 rounded-[24px] border border-[#FADFD0] bg-[#FFF7F2] p-5 md:p-6">
                <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#D25419] mb-2">Before Upload</div>
                <p className="text-[#38352F] font-semibold text-sm md:text-base leading-relaxed">
                  Upload clear, original images only. WhatsApp-compressed images, blurry photos, low-quality screenshots,
                  messy fonts, and partially cropped marksheets are often unreadable by AI and can produce wrong grades.
                </p>
                <p className="text-[#7C7670] text-xs md:text-sm mt-2 font-medium">
                  Best results: straight image, good lighting, full table visible, and readable subject code and grade columns.
                </p>
              </div>
            )}

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
              <ManualEntryGrid
                isMultiSem={state.mode !== 'single_sem'}
                onCalculate={handleManualCalculate}
              />
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
          <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
            {/* Spinning saffron ring */}
            <div className="relative w-20 h-20 mb-8">
              <div
                className="absolute inset-0 rounded-full border-[3px] border-border/20"
              />
              <div
                className="absolute inset-0 rounded-full border-[3px] border-transparent"
                style={{
                  borderTopColor: '#D4500A',
                  borderRightColor: '#E8863A',
                  animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                }}
              />
              <div
                className="absolute inset-2 rounded-full border-[2px] border-transparent"
                style={{
                  borderBottomColor: '#F5A623',
                  borderLeftColor: '#D4500A80',
                  animation: 'spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse',
                }}
              />
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                  style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* Animated text with bouncing dots */}
            <h3 className="text-2xl font-black tracking-tight text-text-primary mb-3">
              Crunching Numbers
              <span className="inline-flex ml-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="text-primary"
                    style={{
                      animation: 'bounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`,
                      display: 'inline-block',
                    }}
                  >.</span>
                ))}
              </span>
            </h3>
            <p className="text-sm text-text-muted font-medium">
              Your GPA is being computed with precision
            </p>
          </div>
        )}

        {stage === 'preview' && ocrData && imageUrls.length > 0 && (
          <PreviewSection
            imageUrls={imageUrls}
            ocrData={ocrData}
            fileSemesters={fileSemestersState}
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
