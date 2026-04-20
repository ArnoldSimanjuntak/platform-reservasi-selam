import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import CartSidebar from "@/components/CartSidebar";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-neutral text-deepSea max-md:pb-16`}
      >
        <Navbar />
        <CartSidebar />
        {children}
        <Footer />
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
