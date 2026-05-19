"use client";

import { Counter } from "@/components/ui/Counter";
import { Truck, Package, HardHat, ArrowUpRight, Users, FileCheck, AlertTriangle } from "lucide-react";

const portals = [
  {
    id: "driver", label: "Driver Portal", icon: Truck,
    gradient: "from-blue-500 to-blue-600",
    stats: { total: 487, approved: 423, pending: 31, rejected: 33, docsComplete: 89 },
  },
  {
    id: "kurir", label: "Kurir Portal", icon: Package,
    gradient: "from-cyan-500 to-teal-600",
    stats: { total: 392, approved: 356, pending: 18, rejected: 18, docsComplete: 92 },
  },
  {
    id: "daily-worker", label: "Daily Worker Portal", icon: HardHat,
    gradient: "from-purple-500 to-violet-600",
    stats: { total: 368, approved: 298, pending: 45, rejected: 25, docsComplete: 76 },
  },
];

export default function PortalsPage() {
  return (
    <div className="space-y-6">
      <p className="text-[9px] text-white/15 font-mono tracking-widest">PORTAL OVERVIEW</p>
      {portals.map(p => (
        <div key={p.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className={`bg-gradient-to-r ${p.gradient} p-5 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <p.icon className="w-6 h-6" />
              <h2 className="font-display font-bold">{p.label}</h2>
            </div>
            <a href={`/${p.id}/admin`} className="px-3 py-1.5 rounded-lg bg-white/20 text-xs font-medium flex items-center gap-1 hover:bg-white/30 transition-colors">
              Open Admin <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total", value: p.stats.total, icon: Users },
              { label: "Approved", value: p.stats.approved, icon: FileCheck },
              { label: "Pending", value: p.stats.pending, icon: AlertTriangle },
              { label: "Rejected", value: p.stats.rejected, icon: AlertTriangle },
              { label: "Docs Complete", value: p.stats.docsComplete, suffix: "%" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-display text-xl font-bold"><Counter end={s.value} />{s.suffix || ""}</p>
                <p className="text-[10px] text-white/25 font-mono">{s.label.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
