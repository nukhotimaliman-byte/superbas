"use client";

import { use, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileSearch, MessageSquare,
  BarChart3, Settings, Menu, X, LogOut, Shield,
  ChevronDown, Bell,
} from "lucide-react";

const adminTabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "" },
  { id: "candidates", label: "Kandidat", icon: Users, href: "/candidates" },
  { id: "documents", label: "Dokumen", icon: FileSearch, href: "/documents" },
  { id: "broadcast", label: "Broadcast", icon: MessageSquare, href: "/broadcast" },
  { id: "analytics", label: "Analitik", icon: BarChart3, href: "/analytics" },
  { id: "settings", label: "Pengaturan", icon: Settings, href: "/settings" },
];

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal } = use(params);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bas-950 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-bas-950 border-r border-white/5 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <Link href={`/${portal}/admin`} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Admin CMS</p>
              <p className="text-[10px] text-white/30 capitalize">{portal.replace("-", " ")}</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {adminTabs.map((tab) => {
            const href = `/${portal}/admin${tab.href}`;
            const isActive = tab.href === ""
              ? pathname === `/${portal}/admin` || pathname === `/${portal}/admin/`
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.id}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-gradient-to-r from-red-500 to-orange-600 text-white font-medium shadow-lg"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <Link href={`/${portal}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" /> Kembali ke Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-bas-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/50 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-sm">
            {adminTabs.find(t => t.href === "" ? pathname === `/${portal}/admin` : pathname.startsWith(`/${portal}/admin${t.href}`))?.label || "Admin"}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative text-white/40 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center font-bold">3</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-xs font-bold">A</div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
