'use client';

import { useState, useCallback } from 'react';

interface UploadSectionProps {
    onUploadSuccess: (data: any) => void;
    onLoading: (isLoading: boolean) => void;
}

export default function UploadSection({ onUploadSuccess, onLoading }: UploadSectionProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFiles(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await handleFiles(e.target.files[0]);
        }
    };

    const handleFiles = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG).');
            return;
        }
        setError(null);
        onLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/calculate-cgpa/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to process image');
            }

            const data = await response.json();
            onUploadSuccess(data);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            onLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-12">
            <div
                className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300
          ${isDragging
                        ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                        : 'border-slate-300 hover:border-blue-400 bg-white/50'
                    }
          glass
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                    <div className={`
            p-4 rounded-full bg-blue-100 text-blue-600 mb-2 transition-transform duration-500
            ${isDragging ? 'rotate-180 scale-110' : ''}
          `}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-800">
                        Upload Marksheet
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                        Drag & drop your Anna University marksheet screenshot here, or click to browse.
                    </p>

                    <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95">
                        <span>Select Image</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleChange}
                        />
                    </label>

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium animate-pulse">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
