import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConnectionBanner } from "@/components/mobile/connection-banner";
import { NativeRuntime } from "@/components/mobile/native-runtime";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Athletic Performance Platform",
  description: "Measure, compare, improve, and compete — scholastic athletic records",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0f14",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-dvh">
          <NativeRuntime />
          <ConnectionBanner />
          {children}
        </div>
      </body>
    </html>
  );
}
