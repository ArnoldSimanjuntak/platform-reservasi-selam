import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import BottomNav from "@/components/BottomNav";
import SessionTimeout from "@/components/SessionTimeout";
import AuthNavigationProvider from "@/components/AuthNavigationProvider";
import PushNotificationManager from "@/components/PushNotificationManager";
import PushInAppBanner from "@/components/PushInAppBanner";
import { getServerNavbarAuthState } from "@/lib/auth/navbar-state";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  title: "SulutDive - Aplikasi Booking Wisata Selam Lembeh",
  description:
    "Aplikasi booking wisata selam berbasis PWA untuk layanan kapal, guide atau instruktur, penyewaan alat selam, provider, dan admin di kawasan Lembeh.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SulutDive",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "sulutdive",
    "selat lembeh",
    "muck diving",
    "macro photography",
    "bitung",
    "sulawesi utara",
    "reservasi selam",
    "carrying capacity",
    "konservasi laut",
  ],
  authors: [{ name: "SulutDive Platform" }],
};

export const viewport: Viewport = {
  themeColor: "#023E8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render navbar dengan state sesi yang sudah selesai dibaca di server.
  // Client tetap menyinkronkan perubahan sesi setelah hydration, tetapi tidak
  // lagi memulai setiap pemuatan halaman dengan skeleton tanpa batas waktu.
  const initialAuthState = await getServerNavbarAuthState();

  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        {/* Script kritis: Tangkap beforeinstallprompt SEBELUM React hydration.
            Browser memicu event ini sangat awal. Jika React belum mount,
            event akan hilang selamanya. Script ini menyimpannya ke global. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__deferredInstallPrompt = e;
              }, { once: true });
            `,
          }}
        />
      </head>
      <body
        className={`${jakarta.variable} font-sans antialiased text-deepSea max-md:pb-16`}
      >
        <AuthNavigationProvider initialAuthState={initialAuthState}>
          <Navbar />
          {children}
          <Footer />
          <BottomNav />
          <InstallPrompt />
          <SessionTimeout />
          <ServiceWorkerRegistration />
          <PushNotificationManager />
          <PushInAppBanner />
        </AuthNavigationProvider>
      </body>
    </html>
  );
}
