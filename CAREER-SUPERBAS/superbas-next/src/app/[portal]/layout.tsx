"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getPortalConfig } from "@/lib/portal-config";
import {
  Home, FileText, Camera, MessageCircle, Receipt,
  CreditCard, MapPin, Landmark, RefreshCw, AlertTriangle,
  Settings, Menu, X, ChevronLeft, LogOut,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  home: Home, "file-text": FileText, camera: Camera,
  "message-circle": MessageCircle, receipt: Receipt,
  "credit-card": CreditCard, "map-pin": MapPin,
  landmark: Landmark, "refresh-cw": RefreshCw,
  "alert-triangle": AlertTriangle, settings: Settings,
};

export default function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ portal: string }>;
}) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bas-950">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Portal tidak ditemukan</h1>
          <Link href="/" className="text-bas-400 hover:underline text-sm">Kembali ke beranda</Link>
        </div>
      </div>
    );
  }

  const bottomTabs = config.tabs.slice(0, 4); // home, berkas, absensi, chat

  return (
    <div className="min-h-screen bg-bas-950 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-bas-950 border-r border-white/5 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <Link href={`/${portal}`} className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center font-display font-bold text-xs`}
            >
              BAS
            </div>
            <div>
              <p className="font-display font-semibold text-sm">{config.label}</p>
              <p className="text-[10px] text-white/30">Super-BAS</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {config.tabs.map((tab) => {
            const Icon = iconMap[tab.icon] || Home;
            const href = `/${portal}${tab.href}`;
            const isActive =
              tab.href === ""
                ? pathname === `/${portal}` || pathname === `/${portal}/`
                : pathname.startsWith(href);

            return (
              <Link
                key={tab.id}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isActive
                    ? `bg-gradient-to-r ${config.gradient} text-white font-medium shadow-lg`
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-white/5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header (mobile) */}
        <header className="sticky top-0 z-30 bg-bas-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center font-display font-bold text-[10px] lg:hidden`}
            >
              BAS
            </div>
            <h1 className="font-display font-semibold text-sm">
              {config.tabs.find(
                (t) =>
                  t.href === "" ? pathname === `/${portal}` : pathname.startsWith(`/${portal}${t.href}`)
              )?.label || "Dashboard"}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center text-xs font-bold">
              U
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-bas-950/90 backdrop-blur-xl border-t border-white/5 flex lg:hidden z-30">
          {bottomTabs.map((tab) => {
            const Icon = iconMap[tab.icon] || Home;
            const href = `/${portal}${tab.href}`;
            const isActive =
              tab.href === ""
                ? pathname === `/${portal}` || pathname === `/${portal}/`
                : pathname.startsWith(href);

            return (
              <Link
                key={tab.id}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] transition-colors",
                  isActive ? "text-white" : "text-white/30"
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {isActive && (
                  <span
                    className={`absolute top-0 w-8 h-0.5 rounded-full bg-gradient-to-r ${config.gradient}`}
                  />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] text-white/30"
          >
            <Menu className="w-5 h-5" />
            Lainnya
          </button>
        </nav>
      </div>
    </div>
  );
}
