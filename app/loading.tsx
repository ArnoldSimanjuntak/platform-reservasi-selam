export default function AppLoading() {
    return (
        <main className="min-h-[70vh] px-4 pb-16 pt-28" aria-label="Memuat halaman">
            <div className="mx-auto w-full max-w-6xl animate-pulse">
                <div className="skeleton h-4 w-28 rounded-full" />
                <div className="skeleton mt-4 h-10 w-full max-w-md rounded-xl" />
                <div className="skeleton mt-3 h-4 w-full max-w-2xl rounded-full" />
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="surface-card overflow-hidden">
                            <div className="skeleton aspect-[4/3]" />
                            <div className="space-y-3 p-5">
                                <div className="skeleton h-5 w-3/4 rounded" />
                                <div className="skeleton h-4 w-full rounded" />
                                <div className="skeleton h-4 w-2/3 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
