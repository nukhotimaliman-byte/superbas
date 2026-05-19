"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Rocket, LayoutGrid, Users, BarChart3, Globe,
  Settings, Menu, X, LogOut, Bell, Zap,
} from "lucide-react";

const ownerTabs = [
  { id: "mission", label: "Mission Control", icon: Rocket, href: "" },
  { id: "portals", label: "Portals", icon: LayoutGrid, href: "/portals" },
  { id: "workforce", label: "Workforce", icon: Users, href: "/workforce" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
  { id: "cms", label: "CMS", icon: Globe, href: "/cms" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050510] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — NASA dark theme */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-[#0a0a1a] border-r border-white/[0.03] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-sm tracking-tight">COMMAND CENTER</p>
              <p className="text-[10px] text-white/20 font-mono tracking-widest">SUPER-BAS // OWNER</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status indicator */}
        <div className="mx-5 mt-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-4 space-y-0.5">
          <p className="text-[9px] text-white/15 font-mono tracking-widest px-3 mb-2 mt-2">NAVIGATION</p>
          {ownerTabs.map((tab) => {
            const href = `/owner${tab.href}`;
            const isActive = tab.href === ""
              ? pathname === "/owner" || pathname === "/owner/"
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.id}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-400 font-medium border border-amber-500/10"
                    : "text-white/25 hover:text-white/60 hover:bg-white/[0.02]"
                )}
              >
                <tab.icon className={cn("w-4 h-4 shrink-0", isActive && "text-amber-400")} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.03]">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-[#050510]/90 backdrop-blur-2xl border-b border-white/[0.03] px-4 py-3 flex items-center gap-3 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/40 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 lg:hidden" />
            <h1 className="font-display font-semibold text-sm">
              {ownerTabs.find(t => t.href === "" ? pathname === "/owner" : pathname.startsWith(`/owner${t.href}`))?.label || "Command Center"}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-white/20 font-mono hidden sm:block">
              {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} //
              {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button className="relative text-white/30 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] flex items-center justify-center font-bold text-black">5</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-bold text-black">O</div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
