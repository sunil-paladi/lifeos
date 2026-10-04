import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ProgramProvider } from "./context/ProgramContext";
import { WorkoutProvider } from "./context/WorkoutContext";
import AppShell from "./components/layout/AppShell";

export const metadata: Metadata = {
  title: "LifeOS",
  applicationName: "LifeOS",
  description: "Your personal fitness and wellness companion.",
  appleWebApp: {
    capable: true,
    title: "LifeOS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f4",
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
      <body className="min-h-full bg-background font-sans text-foreground">

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