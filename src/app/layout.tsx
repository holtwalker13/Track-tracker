import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { UI_THEME_BOOT_SCRIPT } from "@/lib/ui-theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Athletic Performance Platform",
  description: "Measure, compare, improve, and compete — scholastic athletic records",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: UI_THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
