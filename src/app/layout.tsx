import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LineHai? — Apni baari ghar se lein",
  description:
    "Virtual queue and token management system for government offices, hospitals, and public service centers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LineHai?",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D0A2E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${manrope.variable} ${plusJakarta.variable} ${dmSans.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href="https://unpkg.com/phosphor-icons@1.4.2/src/css/phosphor.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) {
                      r.unregister();
                      r.active && r.active.postMessage && r.active.postMessage('skipWaiting');
                    }
                  });
                  caches.keys().then(function(names) {
                    for (var n of names) caches.delete(n);
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f5f2ed]">
        <BackButton />
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  for (var r of regs) r.unregister();
                });
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js?v=2');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
