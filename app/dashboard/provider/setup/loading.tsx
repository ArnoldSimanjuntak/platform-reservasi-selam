import { Anchor } from "lucide-react";

export default function SetupLoading() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 pb-12 pt-28 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto">
                {/* Header Skeleton */}
                <div className="text-center mb-8 flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                        <Anchor className="w-8 h-8 text-blue-300" />
                    </div>
                    <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full max-w-xs" />
                </div>

                {/* Main Form Skeleton */}
                <div className="bg-white py-8 px-6 shadow-lg border border-gray-100 rounded-3xl animate-pulse">
                    <div className="space-y-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i}>
                                <div className="h-5 bg-gray-200 rounded w-40 mb-1.5" />
                                <div className={`w-full bg-gray-100 rounded-xl ${i === 4 ? "h-32" : "h-12"}`} />
                            </div>
                        ))}
                        <div className="pt-2">
                            <div className="w-full h-12 bg-gray-200 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
