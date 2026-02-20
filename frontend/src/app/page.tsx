'use client';

import { useState } from 'react';
import UploadSection from '@/components/UploadSection';
import ResultsSection from '@/components/ResultsSection';

export default function Home() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">

      {/* Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-12">

        {/* Header */}
        <header className="text-center space-y-4 pt-10">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-sm font-semibold tracking-wide uppercase">
              Regulation 2021
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Anna University <span className="text-gradient">CGPA Calculator</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Instantly convert your marksheet screenshot into accurate GPA, CGPA, and Percentage.
            Powered by advanced AI OCR.
          </p>
        </header>

        {/* Upload & Loading */}
        <section>
          {!results && !loading && (
            <UploadSection onUploadSuccess={setResults} onLoading={setLoading} />
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-xl animate-pulse">
                  AI
                </div>
              </div>
              <p className="text-xl font-medium text-gray-700 animate-pulse">
                Analyzing Marksheet...
              </p>
              <p className="text-sm text-gray-500">Extracting grades and calculating credits</p>
            </div>
          )}
        </section>

        {/* Resuts */}
        {results && (
          <div className="space-y-8">
            <ResultsSection data={results} />

            <div className="text-center">
              <button
                onClick={() => setResults(null)}
                className="px-6 py-2 rounded-full text-gray-500 hover:bg-white hover:text-gray-900 transition-colors font-medium text-sm"
              >
                Calculate Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
