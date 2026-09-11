import type { Metadata, Viewport } from "next";
import { Courier_Prime, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const mono = Courier_Prime({ weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-mono", display: "swap" });
const hand = Caveat({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Cardpost", template: "%s · Cardpost" },
  description: "Slow mail. Write a card, it takes real days to arrive.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Cardpost", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1B2A4A", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${hand.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
