import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { ConnectionBanner } from "@/components/mobile/connection-banner";
import { NativeRuntime } from "@/components/mobile/native-runtime";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
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

const themeInitScript = `(function(){try{var t=localStorage.getItem('sap-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <div className="min-h-dvh">
            <NativeRuntime />
            <ConnectionBanner />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
