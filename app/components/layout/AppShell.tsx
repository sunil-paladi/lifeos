"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Desktop / Mobile Sidebar */}
      <div className="relative z-50">
        <Sidebar />
      </div>

      {/* Main Application Area */}
      <div className="relative min-h-screen lg:ml-64">

        {/* Top Bar */}
        <div className="relative z-30">
          <TopBar />
        </div>

        {/* Page Content */}
        <main className="relative z-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>

      </div>

    </div>
  );
}