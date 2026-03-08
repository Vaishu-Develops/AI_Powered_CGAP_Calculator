'use client';

interface ProgressBarProps {
    stage: 'idle' | 'uploading' | 'ocr' | 'preview' | 'calculating' | 'done';
}

const stages = [
    { key: 'uploading', label: 'Upload', icon: '⬆', desc: 'Receiving file' },
    { key: 'ocr', label: 'OCR Scan', icon: '🔍', desc: 'Extracting grades' },
    { key: 'preview', label: 'Preview', icon: '👁', desc: 'Review & confirm' },
    { key: 'calculating', label: 'Calculate', icon: '⚡', desc: 'Computing CGPA' },
    { key: 'done', label: 'Result', icon: '✓', desc: 'All done!' },
];

const stageOrder = ['uploading', 'ocr', 'preview', 'calculating', 'done'];

export default function ProgressBar({ stage }: ProgressBarProps) {
    if (stage === 'idle') return null;

    const currentIdx = stageOrder.indexOf(stage);

    return (
        <div className="w-full max-w-3xl mx-auto mb-8 animate-fade-up">
            {/* Track */}
            <div className="flex items-center justify-between gap-0 relative">
                {stages.map((s, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    const pending = i > currentIdx;

                    return (
                        <div key={s.key} className="flex items-center flex-1 last:flex-none">
                            {/* Node */}
                            <div className="flex flex-col items-center gap-1.5 relative z-10">
                                {/* Outer ping ring */}
                                {active && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div
                                            className="animate-ping-custom rounded-full"
                                            style={{
                                                width: 44,
                                                height: 44,
                                                background: 'var(--glow)',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Circle */}
                                <div
                                    className="relative flex items-center justify-center rounded-full font-bold transition-all duration-500"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        background: done
                                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-success))'
                                            : active
                                                ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent-1))'
                                                : 'var(--bg-card-alt)',
                                        border: done
                                            ? 'none'
                                            : active
                                                ? '2px solid var(--color-primary)'
                                                : '1px solid var(--border)',
                                        boxShadow: active
                                            ? '0 0 20px var(--glow)'
                                            : 'none',
                                        fontSize: done ? '16px' : '14px',
                                        color: done || active ? '#fff' : 'var(--text-muted)',
                                    }}
                                >
                                    {done ? '✓' : s.icon}
                                </div>

                                {/* Labels */}
                                <div className="text-center">
                                    <p
                                        className="text-xs font-bold tracking-tight"
                                        style={{
                                            color: done
                                                ? 'var(--color-success)'
                                                : active
                                                    ? 'var(--color-primary)'
                                                    : 'var(--text-muted)',
                                        }}
                                    >
                                        {s.label}
                                    </p>
                                    <p
                                        className="text-[10px] font-medium hidden sm:block mt-0.5"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        {s.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Connector line */}
                            {i < stages.length - 1 && (
                                <div
                                    className="flex-1 mx-1 mt-[-16px]"
                                    style={{
                                        height: 3,
                                        background: 'var(--border)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: 999
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-success))',
                                            transform: `scaleX(${i < currentIdx ? 1 : 0})`,
                                            transformOrigin: 'left',
                                            transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
