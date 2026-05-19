"use client";

import { use } from "react";
import { Counter } from "@/components/ui/Counter";
import {
  Users, UserCheck, UserX, Clock, FileCheck, AlertTriangle,
  TrendingUp, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export default function AdminOverview({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);

  const stats = [
    { label: "Total Pelamar", value: 1247, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", change: "+12%", up: true },
    { label: "Disetujui", value: 892, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", change: "+8%", up: true },
    { label: "Ditolak", value: 156, icon: UserX, color: "text-red-400", bg: "bg-red-500/10", change: "-3%", up: false },
    { label: "Menunggu", value: 199, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", change: "+15%", up: true },
  ];

  const recentApplicants = [
    { name: "Ahmad Sudirman", position: "Driver CDD", status: "pending", date: "19 Mei" },
    { name: "Budi Hartono", position: "Kurir Motor", status: "approved", date: "19 Mei" },
    { name: "Citra Dewi", position: "Daily Worker", status: "rejected", date: "18 Mei" },
    { name: "Deni Saputra", position: "Driver Wingbox", status: "pending", date: "18 Mei" },
    { name: "Eko Prasetyo", position: "Kurir Mobil", status: "approved", date: "17 Mei" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    approved: "bg-emerald-500/10 text-emerald-400",
    rejected: "bg-red-500/10 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${s.up ? "text-emerald-400" : "text-red-400"}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </span>
            </div>
            <p className="font-display text-2xl font-bold"><Counter end={s.value} /></p>
            <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts placeholder + recent */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3 glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Tren Pendaftaran (30 Hari)</h3>
          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const h = 20 + Math.random() * 80;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-red-500/60 to-orange-500/40 transition-all hover:from-red-500 hover:to-orange-500"
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/30">
            <span>20 Apr</span><span>30 Apr</span><span>10 Mei</span><span>19 Mei</span>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Status Berkas</h3>
          <div className="space-y-3">
            {[
              { label: "KTP Terverifikasi", pct: 94, color: "from-emerald-500 to-emerald-600" },
              { label: "SIM Terverifikasi", pct: 87, color: "from-blue-500 to-blue-600" },
              { label: "Photo Terverifikasi", pct: 76, color: "from-amber-500 to-amber-600" },
              { label: "SKCK Uploaded", pct: 45, color: "from-purple-500 to-purple-600" },
            ].map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">{b.label}</span>
                  <span className="font-medium">{b.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${b.color}`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent applicants table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">Pelamar Terbaru</h3>
          <a href={`/${portal}/admin/candidates`} className="text-xs text-red-400 hover:underline">Lihat Semua →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium">Posisi</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentApplicants.map((a, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-white/60">{a.position}</td>
                  <td className="px-4 py-3 text-white/40">{a.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[a.status]}`}>
                      {statusLabels[a.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
