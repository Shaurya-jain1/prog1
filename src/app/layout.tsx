import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
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
  themeColor: "#1a56db",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={manrope.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
      <body className="min-h-screen bg-gray-50">
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
