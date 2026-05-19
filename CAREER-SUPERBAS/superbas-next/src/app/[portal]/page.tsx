"use client";

import { use } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Counter } from "@/components/ui/Counter";
import {
  FileCheck, Clock, AlertCircle, CheckCircle2,
  TrendingUp, Calendar, ArrowUpRight, Camera,
} from "lucide-react";

export default function PortalHomePage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const stats = [
    { label: "Berkas Lengkap", value: 85, suffix: "%", icon: FileCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Hari Aktif", value: 142, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Absensi Bulan Ini", value: 22, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Aduan Pending", value: 0, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  const quickActions = [
    { label: "Absensi Masuk", href: `/${portal}/absensi`, icon: Camera, desc: "Foto selfie untuk presensi" },
    { label: "Upload Berkas", href: `/${portal}/berkas`, icon: FileCheck, desc: "Lengkapi dokumen" },
    { label: "Lihat Slip Gaji", href: `/${portal}/slipgaji`, icon: TrendingUp, desc: "Slip bulan ini" },
    { label: "Buat Aduan", href: `/${portal}/aduan`, icon: AlertCircle, desc: "Laporkan masalah" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
        }} />
        <div className="relative z-10">
          <p className="text-white/70 text-sm mb-1">Selamat datang kembali 👋</p>
          <h2 className="font-display text-xl font-bold">Dashboard {config.label}</h2>
          <p className="text-white/60 text-sm mt-2">Status: <span className="text-emerald-300 font-medium">Aktif</span></p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="font-display text-2xl font-bold">
              <Counter end={s.value} />{s.suffix || ""}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-display font-semibold mb-3 text-sm">Aksi Cepat</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="glass rounded-2xl p-4 group hover:border-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <a.icon className="w-5 h-5 text-white/50" />
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
              <p className="font-medium text-sm">{a.label}</p>
              <p className="text-white/30 text-xs mt-0.5">{a.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="font-display font-semibold mb-3 text-sm">Aktivitas Terakhir</h3>
        <div className="glass rounded-2xl divide-y divide-white/5">
          {[
            { text: "Absensi masuk berhasil", time: "Hari ini, 07:30", icon: CheckCircle2, color: "text-emerald-400" },
            { text: "Slip gaji Mei 2026 tersedia", time: "2 hari lalu", icon: TrendingUp, color: "text-blue-400" },
            { text: "Berkas KTP diverifikasi", time: "5 hari lalu", icon: FileCheck, color: "text-amber-400" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <a.icon className={`w-4 h-4 ${a.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{a.text}</p>
                <p className="text-xs text-white/30">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
