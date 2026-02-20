'use client';

interface ResultsSectionProps {
    data: {
        gpa: number;
        cgpa: number;
        percentage: string;
        class: string;
        passed_subjects: number;
        total_subjects: number;
        subjects: Record<string, any>;
    };
}

export default function ResultsSection({ data }: ResultsSectionProps) {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Main Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="GPA"
                    value={data.gpa}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <MetricCard
                    label="CGPA"
                    value={data.cgpa}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <MetricCard
                    label="Percentage"
                    value={data.percentage}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <MetricCard
                    label="Class"
                    value={data.class}
                    color="text-rose-600"
                    bg="bg-rose-50"
                    isText
                />
            </div>

            {/* Summary Banner */}
            <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Result Summary</h3>
                    <p className="text-gray-500 text-sm">Based on extracted grades</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-medium">
                        Passed: {data.passed_subjects}
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium">
                        Total: {data.total_subjects}
                    </div>
                </div>
            </div>

            {/* Subject Breakdown */}
            <div className="glass rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 bg-white/50">
                    <h3 className="text-xl font-bold text-gray-800">Subject Breakdown</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {Object.entries(data.subjects).map(([subject, details]) => (
                        <div key={subject} className="p-4 hover:bg-white/60 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`
                     w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                     ${details.grade_points > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}
                   `}>
                                    {details.grade}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{subject}</p>
                                    <p className="text-xs text-gray-500">Credits: {details.credits}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-medium text-gray-700">
                                    {details.grade_points} × {details.credits} = <span className="text-blue-600">{details.weighted}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                    {Object.keys(data.subjects).length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No subjects details available.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, color, bg, isText = false }: any) {
    return (
        <div className={`glass rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md`}>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
            <p className={`font-bold ${color} ${isText ? 'text-lg leading-tight' : 'text-4xl'}`}>
                {value}
            </p>
        </div>
    );
}
