import Link from "next/link";
import { Anchor, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth/actions";

const adminNavItems = [
    { href: "/admin", label: "Ringkasan" },
    { href: "/admin/verifikasi", label: "Verifikasi" },
    { href: "/admin/services", label: "Layanan" },
    { href: "/admin/orders", label: "Pesanan" },
];

export default function AdminHeader({ adminName }: { adminName: string }) {
    return (
        <header className="sticky top-0 z-50 border-b border-[#0077B6] bg-[#023E8A] text-white">
            <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <Link
                    href="/admin"
                    className="flex items-center gap-2 text-xl font-black italic tracking-tighter transition-opacity hover:opacity-80"
                >
                    <Anchor className="h-5 w-5 text-cyan-400" />
                    SULUT<span className="text-cyan-400">DIVE</span>
                    <span className="ml-1 border-l border-white/20 pl-3 text-sm font-bold not-italic opacity-70">
                        Panel Admin
                    </span>
                </Link>

                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi panel admin">
                        {adminNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-2 border-l border-white/20 pl-4 text-sm font-bold sm:flex">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="max-w-36 truncate">{adminName}</span>
                    </div>

                    <form action={signOut}>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Keluar
                        </button>
                    </form>
                </div>

                <nav className="flex w-full gap-1 overflow-x-auto lg:hidden" aria-label="Navigasi panel admin mobile">
                    {adminNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
