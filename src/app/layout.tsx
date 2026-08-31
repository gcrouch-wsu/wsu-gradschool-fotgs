import type { Metadata } from "next";
import { WsuHeader } from "@/components/WsuHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faculty Of The Graduate School FOTGS",
  description: "Faculty Of The Graduate School FOTGS appointment dashboard",
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
