import type { Metadata, Viewport } from "next";

import { RegisterServiceWorker } from "@/components/register-sw";
import { language } from "@/lib/language";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aram — a private check-in",
  description:
    "A gentle voice check-in for women. Speech and replies stay on this device. Nothing you say is saved.",
  applicationName: "Aram",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#221e1b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={language.locale} dir={language.direction} className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
