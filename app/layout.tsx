import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "./components/theme/ThemeProvider";
import { ProgramProvider } from "./context/ProgramContext";
import { WorkoutProvider } from "./context/WorkoutContext";
import AppShell from "./components/layout/AppShell";

export const metadata: Metadata = {
  title: "ConsistFit",
  applicationName: "ConsistFit",
  description: "Your personal fitness and wellness companion.",
  appleWebApp: {
    capable: true,
    title: "ConsistFit",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1a33",
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
      data-theme="system"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("lifeos-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch{}})()',
          }}
        />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <ProgramProvider>
            <WorkoutProvider>
              <AppShell>{children}</AppShell>
            </WorkoutProvider>
          </ProgramProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}