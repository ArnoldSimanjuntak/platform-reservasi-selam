import Link from "next/link";
import { WifiOff, RefreshCcw } from "lucide-react";

export const metadata = {
    title: "Offline - Sulut Dive",
};

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <WifiOff className="w-10 h-10 text-gray-400" />
                </div>

                <h1 className="text-2xl font-bold text-deepSea mb-2">
                    Anda Sedang Offline
                </h1>

                <p className="text-gray-600 mb-8">
                    Halaman ini tidak dapat diakses tanpa koneksi internet.
                    Silakan periksa koneksi Anda atau akses halaman yang sudah tersimpan.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Coba Lagi
                    </button>

                    <Link
                        href="/services"
                        className="block w-full py-3 px-4 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Lihat Katalog Offline
                    </Link>
                </div>
            </div>
        </div>
    );
}
