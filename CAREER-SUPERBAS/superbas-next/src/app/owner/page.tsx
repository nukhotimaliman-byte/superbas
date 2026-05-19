"use client";

import { Counter } from "@/components/ui/Counter";
import {
  Users, Briefcase, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Activity, Zap,
  Truck, Package, HardHat, CheckCircle2, Clock,
} from "lucide-react";

const portalStats = [
  { id: "driver", label: "Driver", icon: Truck, total: 487, active: 423, pending: 31, color: "from-blue-500 to-blue-600", accent: "text-blue-400" },
  { id: "kurir", label: "Kurir", icon: Package, total: 392, active: 356, pending: 18, color: "from-cyan-500 to-teal-600", accent: "text-cyan-400" },
  { id: "daily-worker", label: "Daily Worker", icon: HardHat, total: 368, active: 298, pending: 45, color: "from-purple-500 to-violet-600", accent: "text-purple-400" },
];

export default function MissionControlPage() {
  const totalWorkforce = portalStats.reduce((a, p) => a + p.total, 0);
  const totalActive = portalStats.reduce((a, p) => a + p.active, 0);
  const totalPending = portalStats.reduce((a, p) => a + p.pending, 0);

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Workforce", value: totalWorkforce, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10", change: "+23", up: true },
          { label: "Active Today", value: totalActive, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", change: "+12", up: true },
          { label: "Pending Review", value: totalPending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", change: "-5", up: false },
          { label: "Alerts", value: 3, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", change: "0", up: true },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <span className={`text-[10px] font-mono ${s.up ? "text-emerald-400" : "text-red-400"}`}>
                {s.up ? "▲" : "▼"} {s.change}
              </span>
            </div>
            <p className="font-display text-2xl font-bold"><Counter end={s.value} /></p>
            <p className="text-white/25 text-[11px] mt-0.5 font-mono tracking-wide">{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Portal cards */}
      <div>
        <p className="text-[9px] text-white/15 font-mono tracking-widest mb-3">PORTAL STATUS</p>
        <div className="grid lg:grid-cols-3 gap-3">
          {portalStats.map(p => (
            <div key={p.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{p.label}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                  </div>
                </div>
                <a href={`/${p.id}/admin`} className="ml-auto text-white/20 hover:text-white transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="font-display font-bold text-lg"><Counter end={p.total} /></p>
                  <p className="text-[9px] text-white/25 font-mono">TOTAL</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="font-display font-bold text-lg text-emerald-400"><Counter end={p.active} /></p>
                  <p className="text-[9px] text-white/25 font-mono">ACTIVE</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="font-display font-bold text-lg text-amber-400"><Counter end={p.pending} /></p>
                  <p className="text-[9px] text-white/25 font-mono">PENDING</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity feed + System health */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <p className="text-[9px] text-white/15 font-mono tracking-widest mb-3">LIVE ACTIVITY FEED</p>
          <div className="space-y-2">
            {[
              { text: "Driver: Ahmad Sudirman — KTP diverifikasi", time: "2 min ago", type: "success" },
              { text: "Kurir: Registrasi baru — Budi Hartono", time: "5 min ago", type: "info" },
              { text: "DW: Absensi masuk — Citra Dewi (DC Tangerang)", time: "8 min ago", type: "info" },
              { text: "Driver: SIM ditolak — Deni Saputra (expired)", time: "12 min ago", type: "warning" },
              { text: "Kurir: Slip gaji Mei dipublikasikan", time: "15 min ago", type: "success" },
              { text: "DW: Aduan baru — peralatan kurang lengkap", time: "20 min ago", type: "alert" },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === "success" ? "bg-emerald-400" : a.type === "warning" ? "bg-amber-400" : a.type === "alert" ? "bg-red-400" : "bg-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">{a.text}</p>
                  <p className="text-[10px] text-white/20 font-mono">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <p className="text-[9px] text-white/15 font-mono tracking-widest mb-3">SYSTEM HEALTH</p>
          <div className="space-y-3">
            {[
              { label: "API Response", value: "42ms", status: "good" },
              { label: "Database", value: "Connected", status: "good" },
              { label: "Storage", value: "67% used", status: "warning" },
              { label: "SSL Certificate", value: "Valid (89d)", status: "good" },
              { label: "CDN", value: "Active", status: "good" },
            ].map(h => (
              <div key={h.label} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                <span className="text-xs text-white/40">{h.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{h.value}</span>
                  <span className={`w-2 h-2 rounded-full ${h.status === "good" ? "bg-emerald-400" : "bg-amber-400"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
