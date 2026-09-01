import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { WsuHeader } from "@/components/WsuHeader";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-wsu-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-wsu-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-wsu-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Faculty of the Graduate School | Washington State University",
    template: "%s | WSU Graduate School",
  },
  description: "Washington State University Faculty of the Graduate School appointment dashboard and faculty directory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
      <body>
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-50 -translate-y-24 rounded-md bg-white px-4 py-2 text-sm font-semibold text-wsu-gray-dark shadow-md transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <WsuHeader />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
