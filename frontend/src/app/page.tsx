'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import UploadSection from '@/components/UploadSection';
import ProgressBar from '@/components/ProgressBar';
import ResultsSection from '@/components/ResultsSection';
import PreviewSection from '@/components/PreviewSection';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

type Stage = 'idle' | 'uploading' | 'ocr' | 'preview' | 'calculating' | 'done';

export default function Home() {
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

        // Smart Merging Logic: Prioritize Passing Grades for Revaluations
        newSubjects.forEach((newSub: any) => {
          const existingIdx = combinedSubjects.findIndex(s => s.subject_code === newSub.subject_code);
          if (existingIdx > -1) {
            const existingGrade = combinedSubjects[existingIdx].grade;
            const newGrade = newSub.grade;

            const isExistingPassing = !['U', 'RA', 'SA', 'W', 'AB', '-'].includes(existingGrade);
            const isNewPassing = !['U', 'RA', 'SA', 'W', 'AB', '-'].includes(newGrade);

            // If new is pass and existing is fail, overwrite
            if (isNewPassing && !isExistingPassing) {
              combinedSubjects[existingIdx] = newSub;
            }
            // Otherwise keep existing (first attempt usually preferred unless reval is better)
          } else {
            combinedSubjects.push(newSub);
          }
        });

        // Sum confidences for average later
        overallConfidence += data.confidence?.overall || 0;

        // Find highest semester across all marksheets
        const sem = data.semester_info?.semester || 0;
        if (sem > highestSem) {
          highestSem = sem;
          if (data.semester_info?.regulation) regulationStr = data.semester_info.regulation;
        }
      }

      // Finalize combined data
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

  const handleBack = () => {
    setStage('idle');
    setOcrData(null);
    setImageUrls([]);
    setError(null);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem 1rem',
        background: 'var(--background)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Particle background */}
      <ParticleBackground />

      {/* Aurora blobs (Saffron OS Optimized) */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div
          className="animate-aurora"
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-5%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(212,80,10,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="animate-aurora delay-1000"
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-5%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(247,197,159,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            animationDelay: '5s',
          }}
        />
        <div
          className="animate-aurora delay-500"
          style={{
            position: 'absolute',
            top: '25%',
            right: '10%',
            width: '40%',
            height: '45%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(100px)',
            animationDelay: '10s',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <header style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '3rem' }}>
          {/* Badge */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span className="chip chip-saffron border-primary/20 bg-primary/5 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2" />
              Anna University
            </span>
            <span className="chip chip-emerald border-success/20 bg-success/5 text-success">
              ⚡ 7-Layer AI OCR
            </span>
            <span className="chip chip-peach border-accent-1/20 bg-accent-1/5 text-accent-1">
              Regulation 2021
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-text-primary"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              marginBottom: '1.2rem',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Anna University
            <br />
            <span className="text-gradient">CGPA Calculator</span>
          </h1>

          <p
            className="text-text-muted"
            style={{
              fontSize: '1.15rem',
              maxWidth: 580,
              margin: '0 auto 1rem',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            Upload your marksheet screenshot. Our AI extracts grades,
            lets you preview & correct, then calculates GPA, CGPA, and Percentage instantly.
          </p>

          {/* Feature row */}
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { icon: '🔍', text: 'AI OCR', color: 'text-primary' },
              { icon: '👁', text: 'Preview & Edit', color: 'text-accent-2' },
              { icon: '⚡', text: 'Instant Calc', color: 'text-success' },
              { icon: '📊', text: 'Detailed Report', color: 'text-data' },
            ].map((f) => (
              <div key={f.text} className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest ${f.color}`}>
                <span className="text-lg">{f.icon}</span>
                <span className="opacity-80">{f.text}</span>
              </div>
            ))}
          </div>
        </header>

        {/* ── PROGRESS BAR ── */}
        <ProgressBar stage={stage} />

        {/* ── STATUS MESSAGE (during active processing) ── */}
        {statusMsg && stage !== 'idle' && stage !== 'preview' && stage !== 'done' && (
          <div
            className="text-text-muted"
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                boxShadow: '0 0 12px var(--color-primary)',
              }}
              className="animate-ping-custom"
            />
            {statusMsg}
          </div>
        )}

        {/* ── SECTIONS ── */}

        {/* Initial Upload State */}
        {stage === 'idle' && (
          <div className="animate-fade-up">
            <UploadSection onFilesSelected={handleFilesSelected} />
            {error && (
              <div
                className="mt-8 p-6 bg-accent-2/10 border border-accent-2/30 text-accent-2 rounded-[24px] text-center font-bold shadow-xl shadow-accent-2/5"
              >
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* OCR Loading spinner */}
        {(stage === 'uploading' || stage === 'ocr') && (
          <div
            className="animate-scale-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              paddingTop: '5rem',
              paddingBottom: '5rem',
            }}
          >
            {/* Orbital loader */}
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <div
                className="animate-spin-slow"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--color-primary)',
                  borderRightColor: 'var(--color-success)',
                }}
              />
              <div
                className="animate-spin-reverse"
                style={{
                  position: 'absolute',
                  inset: 16,
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--color-accent-1)',
                  borderLeftColor: 'var(--color-accent-2)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(16,185,129,0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
                className="animate-pulse-glow"
              >
                {stage === 'uploading' ? '⬆' : '🔍'}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p className="text-2xl font-black text-text-primary tracking-tight mb-2">
                {stage === 'uploading' ? 'Uploading Marksheet' : 'Scanning with AI OCR'}
              </p>
              <p className="text-text-muted font-bold">
                {stage === 'uploading'
                  ? 'Securely transmitting to 7-layer OCR pipeline...'
                  : 'Deep-scanning grades and subject metadata...'}
              </p>
            </div>

            {/* Mini progress shimmer */}
            <div
              className="bg-bg-card-alt border border-border"
              style={{
                width: 320,
                height: 8,
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                className="animate-shimmer"
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, var(--color-primary), var(--color-success), transparent)',
                  backgroundSize: '200% 100%',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        )}

        {/* Calculating spinner */}
        {stage === 'calculating' && (
          <div
            className="animate-scale-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2rem',
              paddingTop: '5rem',
              paddingBottom: '5rem',
            }}
          >
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <div
                className="animate-spin-slow"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--color-data)',
                }}
              />
              <div
                className="bg-data/10 border border-data/20"
                style={{
                  position: 'absolute',
                  inset: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
              >
                ⚡
              </div>
            </div>
            <p className="text-2xl font-black text-data tracking-tight">Computing Intelligence...</p>
            <p className="font-bold text-text-muted">Synchronizing with Anna University R2021 Schema</p>
          </div>
        )}

        {/* Preview */}
        {stage === 'preview' && ocrData && imageUrls.length > 0 && (
          <PreviewSection
            imageUrls={imageUrls}
            ocrData={ocrData}
            onConfirm={handleConfirm}
            onBack={() => setStage('idle')}
          />
        )}

        {/* Results */}
        {stage === 'done' && results && (
          <ResultsSection data={results} onReset={handleReset} />
        )}

        {/* ── FOOTER ── */}
        <footer
          className="border-t border-border/50"
          style={{
            textAlign: 'center',
            marginTop: '6rem',
            paddingTop: '3rem',
            paddingBottom: '3rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {['R2013', 'R2017', 'R2021', 'R2025'].map((r) => (
              <span key={r} className="px-4 py-1.5 bg-bg-card-alt border border-border text-[10px] font-black tracking-[0.2em] text-text-muted rounded-full">
                {r}
              </span>
            ))}
          </div>
          <p className="text-sm font-bold text-text-muted/60 tracking-wider">
            AI-Powered CGPA Calculator · Anna University · Future-Ready Intel
          </p>
        </footer>
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
