export default function DashboardLoading() {
    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center bg-gray-50">
            <div className="container mx-auto max-w-4xl">
                {/* Header Skeleton */}
                <div className="mb-8 space-y-2">
                    <div className="h-10 bg-gray-200 rounded-lg w-64 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card Skeleton */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-80 animate-pulse">
                            <div className="h-28 bg-gray-200" />
                            <div className="pt-14 pb-6 px-6 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-gray-300 absolute top-16" />
                                <div className="h-6 w-32 bg-gray-200 rounded mt-4" />
                                <div className="h-4 w-40 bg-gray-200 rounded mt-2" />
                            </div>
                        </div>
                    </div>

                    {/* Main Content Skeleton */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-28 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
                            <div className="h-28 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
                        </div>
                        <div className="h-64 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
