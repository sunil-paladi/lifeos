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
    <div className="min-h-screen bg-slate-100 text-slate-900">

      <Sidebar />

      <div className="min-h-screen lg:ml-64">

        <TopBar />

        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>

      </div>

    </div>
  );
}