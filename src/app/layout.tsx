import type { Metadata } from "next";
import { Strait } from "next/font/google";
import "./globals.css";

const strait = Strait({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-strait",
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
    <html lang="en" className={strait.variable}>
      <body className={`${strait.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
