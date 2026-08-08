import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { ProgramProvider } from "./context/ProgramContext";
import { WorkoutProvider } from "./context/WorkoutContext";

import AppShell from "./components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeOS",
  description: "Your Personal Operating System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">

        <ProgramProvider>
          <WorkoutProvider>
            <AppShell>
              {children}
            </AppShell>
          </WorkoutProvider>
        </ProgramProvider>

      </body>
    </html>
  );
}