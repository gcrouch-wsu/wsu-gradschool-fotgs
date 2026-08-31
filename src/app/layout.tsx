import type { Metadata } from "next";
import { WsuHeader } from "@/components/WsuHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Faculty Of The Graduate School (FOTGS) | Washington State University",
    template: "%s | WSU Graduate School",
  },
  description: "Washington State University Faculty Of The Graduate School (FOTGS) appointment dashboard and faculty directory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WsuHeader />
        {children}
      </body>
    </html>
  );
}
