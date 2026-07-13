export default function AdminLoading() {
    return (
        <main className="mx-auto min-h-[70vh] w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8" aria-label="Memuat panel admin">
            <div className="animate-pulse">
                <div className="skeleton h-8 w-64 rounded-lg" />
                <div className="skeleton mt-3 h-4 w-80 max-w-full rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="surface-card h-28 p-4">
                        <div className="skeleton h-9 w-9 rounded-xl" />
                        <div className="skeleton mt-3 h-5 w-12 rounded" />
                    </div>
                ))}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
                {[0, 1, 2].map((item) => (
                    <div key={item} className="surface-card h-48 p-6">
                        <div className="skeleton h-12 w-12 rounded-xl" />
                        <div className="skeleton mt-5 h-5 w-36 rounded" />
                        <div className="skeleton mt-3 h-4 w-full rounded" />
                    </div>
                ))}
            </div>
        </main>
    );
}
