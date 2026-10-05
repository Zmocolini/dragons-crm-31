import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RootAuthProvider } from "@/components/auth/RootAuthProvider";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { I18nRuntime } from "@/components/layout/I18nRuntime";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dragon Delivery CRM 3.1 — More than delivery",
  description:
    "Premium fleet CRM pentru managementul curierilor, activărilor, plăților și rapoartelor.",
  applicationName: "Dragons CRM",
  appleWebApp: {
    capable: true,
    title: "Dragons CRM",
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// Bump când vrei să forțezi wipe-ul datelor test din localStorage la toți userii.
const DATA_SCHEMA_VERSION = "4";

const dataMigrationScript = `
(function(){
  try {
    var KEY = 'crm31-schema-version';
    if (localStorage.getItem(KEY) === '${DATA_SCHEMA_VERSION}') return;
    var wipe = [
      'crm31-couriers','crm31-couriers-deleted',
      'crm31-candidates',
      'crm31-interviews','crm31-interview-notes','crm31-interview-activities',
      'crm31-interview-checklist','crm31-interview-overrides','crm31-interview-deleted',
      'crm31-interview-seed-loaded',
      'crm31-activations','crm31-activation-events',
      'crm31-payments','crm31-payment-patches','crm31-payment-activities',
      'crm31-payment-notes','crm31-payment-documents','crm31-payment-deleted',
      'crm31-documents','crm31-document-patches','crm31-document-deleted',
      'crm31-document-activity','crm31-document-notes',
      'crm31-reports-history',
      'crm31-sessions','crm31-security','crm31-activity',
      'crm31-candidate-stages','crm31-candidate-notes','crm31-candidate-activities',
      'crm31-candidate-lost','crm31-candidate-converted','crm31-candidate-deleted',
      'crm31-candidate-overrides','crm31-candidate-responsibles',
      'crm31-settings'
    ];
    for (var i = 0; i < wipe.length; i++) localStorage.removeItem(wipe[i]);
    localStorage.setItem(KEY, '${DATA_SCHEMA_VERSION}');
  } catch(e){}
})();
`;

// Ascunde pagina până se aplică traducerea (evită clipirea în română); după 2s se arată oricum.
const langScript = `
(function(){
  try {
    var l = localStorage.getItem('crm31-lang');
    if (l === 'en' || l === 'ru' || l === 'hi') {
      var h = document.documentElement;
      h.setAttribute('data-i18n-pending', '1');
      setTimeout(function(){ h.removeAttribute('data-i18n-pending'); }, 2000);
    }
  } catch(e){}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: dataMigrationScript }} />
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
      </head>
      <body className="min-h-full bg-app text-fg" suppressHydrationWarning>
        <RootAuthProvider>{children}</RootAuthProvider>
        <CookieBanner />
        <I18nRuntime />
      </body>
    </html>
  );
}
