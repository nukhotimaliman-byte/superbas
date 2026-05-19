"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { User, Lock, Bell, Moon, LogOut, ChevronRight } from "lucide-react";

export default function SettingsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const menuItems = [
    { icon: User, label: "Edit Profil", desc: "Nama, foto, nomor HP" },
    { icon: Lock, label: "Ganti Password", desc: "Perbarui kata sandi" },
  ];

  return (
    <div className="space-y-4 max-w-md">
      {/* Profile card */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center font-display font-bold text-lg`}>
          U
        </div>
        <div>
          <p className="font-display font-semibold">Nama Karyawan</p>
          <p className="text-xs text-white/40">{config.label} · BAS-2026-001</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="glass rounded-2xl divide-y divide-white/5">
        {menuItems.map((item) => (
          <button key={item.label} className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <item.icon className="w-4 h-4 text-white/50" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-white/30">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="glass rounded-2xl divide-y divide-white/5">
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <Moon className="w-4 h-4 text-white/50" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Mode Gelap</p>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? `bg-gradient-to-r ${config.gradient}` : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <Bell className="w-4 h-4 text-white/50" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Notifikasi</p>
          </div>
          <button onClick={() => setNotifications(!notifications)} className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? `bg-gradient-to-r ${config.gradient}` : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-red-400 hover:bg-red-500/5 transition-colors">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Keluar dari Akun</span>
      </button>

      <p className="text-center text-xs text-white/20">Super-BAS v2.0 · Next Generation</p>
    </div>
  );
}
