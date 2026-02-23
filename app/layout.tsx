import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google"; // Changed from Geist to Inter as per user pref usually, or keep Geist if preferred? User didn't specify font but Inter is safe. The previous layout used Inter.
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lembeh Dive - Muck Diving & Macro Photography Specialist",
  description:
    "Pusat reservasi selam Selat Lembeh. Temukan guide spesialis makro, sewa kapal, dan perlengkapan selam terbaik di Bitung.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LembehDive",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "lembeh strait",
    "muck diving",
    "macro photography",
    "onderwater",
    "bitung",
    "sulawesi utara",
    "dive resort",
  ],
  authors: [{ name: "Lembeh Dive Platform" }],
};

export const viewport: Viewport = {
  themeColor: "#023E8A", // Deep Ocean Blue
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-neutral text-deepSea`}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
