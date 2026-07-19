import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";
import { OfflineBanner } from "@/components/offline-banner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DhanTracker — Rule-Based Trading Journal",
    template: "%s | DhanTracker",
  },
  description:
    "A professional trading journal for rule-based traders. Track trades, manage watchlists, and analyze your performance.",
  keywords: [
    "trading journal",
    "stock tracker",
    "NSE",
    "India stocks",
    "trade ledger",
    "watchlist",
    "rule based trading",
  ],
  authors: [{ name: "DhanTracker" }],
  openGraph: {
    title: "DhanTracker — Rule-Based Trading Journal",
    description:
      "Professional trading journal with Trade Ledger, Custom Watchlists, Dashboard & Research tools.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${playfair.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased min-h-screen bg-background">
        <NextTopLoader
          color="hsl(218, 70%, 40%)"
          height={2}
          showSpinner={false}
          shadow={false}
          easing="ease"
          speed={200}
        />
        <Providers>{children}</Providers>
        <OfflineBanner />
      </body>
    </html>
  );
}