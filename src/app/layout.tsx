import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: VTF Justina HUM and DIN Next LT Arabic would be loaded from font files
// For now using system fonts that approximate the brand typography

export const metadata: Metadata = {
  title: "Will's Bleach Calculator | Will's Friends",
  description: "Discover how much bleach equivalent you're absorbing from chlorinated tap water every year. Get personalized results and learn about water filtration solutions for your family.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iClosed widget loaded dynamically in ResultsDisplay component */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
