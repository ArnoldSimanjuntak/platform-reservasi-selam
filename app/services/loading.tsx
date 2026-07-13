export default function ServicesLoading() {
    return (
        <main className="min-h-screen bg-neutral pb-24">
            <div className="h-72 bg-deepSea sm:h-80" />
            <section className="relative z-10 mx-auto -mt-12 grid w-full max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="surface-card overflow-hidden">
                        <div className="skeleton aspect-[4/3]" />
                        <div className="space-y-3 p-5">
                            <div className="skeleton h-5 w-3/4 rounded" />
                            <div className="skeleton h-4 w-full rounded" />
                            <div className="skeleton h-4 w-1/2 rounded" />
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
}
