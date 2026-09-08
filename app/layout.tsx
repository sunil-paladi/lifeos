import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ProgramProvider } from "./context/ProgramContext";
import { WorkoutProvider } from "./context/WorkoutContext";

import AppShell from "./components/layout/AppShell";

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
      className="h-full antialiased"
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