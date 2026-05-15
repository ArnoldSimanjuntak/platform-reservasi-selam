import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar, { type NavbarInitialAuthState } from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import BottomNav from "@/components/BottomNav";
import SessionTimeout from "@/components/SessionTimeout";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const dynamic = 'force-dynamic';

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
  title: "SulutDive — Reservasi Selam Lembeh",
  description:
    "Platform reservasi selam Selat Lembeh dengan carrying capacity. Temukan guide spesialis makro, sewa kapal, dan perlengkapan selam terbaik di Bitung, Sulawesi Utara.",
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

async function getInitialNavbarAuthState(): Promise<NavbarInitialAuthState> {
  const fallback: NavbarInitialAuthState = {
    user: null,
    role: null,
    providerVerified: false,
    isLoading: false,
  };

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return fallback;

    const navbarUser = {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    };

    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = userRecord?.role ?? null;
    if (!role) {
      return {
        user: navbarUser,
        role: null,
        providerVerified: false,
        isLoading: true,
      };
    }

    let providerVerified = false;
    if (role === "provider") {
      const { data: provider } = await supabase
        .from("providers")
        .select("verification_status, is_active")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      providerVerified = provider?.verification_status === "verified" && !!provider?.is_active;
    }

    return {
      user: navbarUser,
      role,
      providerVerified,
      isLoading: false,
    };
  } catch {
    return fallback;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialNavbarAuthState = await getInitialNavbarAuthState();

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
            Browser memicu event ini sangat awal — jika React belum mount,
            event akan hilang selamanya. Script ini menyimpannya ke global. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                window.__deferredInstallPrompt = e;
              }, { once: true });
            `,
          }}
        />
      </head>
      <body
        className={`${jakarta.variable} font-sans antialiased bg-neutral text-deepSea max-md:pb-16`}
      >
        <Navbar initialAuthState={initialNavbarAuthState} />
        {children}
        <Footer />
        <BottomNav initialAuthState={initialNavbarAuthState} />
        <InstallPrompt />
        <SessionTimeout />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
