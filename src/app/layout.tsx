import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RootAuthProvider } from "@/components/auth/RootAuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: dataMigrationScript }} />
      </head>
      <body className="min-h-full bg-app text-fg">
        <RootAuthProvider>{children}</RootAuthProvider>
      </body>
    </html>
  );
}
