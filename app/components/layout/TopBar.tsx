"use client";

import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";
import Sidebar from "./Sidebar";

export default function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>

          {/* Desktop Title */}
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-slate-400">
              PERSONAL OPERATING SYSTEM
            </p>

            <p className="text-sm font-semibold text-slate-800">
              Your daily progress
            </p>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden">
            <p className="text-base font-bold text-slate-900">
              LifeOS
            </p>
          </div>

          {/* Right Side */}
          <div className="ml-auto flex items-center gap-3">

            <button
              type="button"
              className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={20} />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500" />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              S
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">

          {/* Dark Background */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Mobile Sidebar */}
          <div className="relative z-[101] h-full w-72 max-w-[85vw]">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 z-[102] rounded-full bg-slate-700 p-2 text-white shadow-lg"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>

            <Sidebar
              mobile={true}
              onNavigate={() => setMobileMenuOpen(false)}
            />

          </div>
        </div>
      )}
    </>
  );
}