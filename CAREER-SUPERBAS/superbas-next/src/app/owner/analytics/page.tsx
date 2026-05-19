"use client";

import { Counter } from "@/components/ui/Counter";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function OwnerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <p className="text-[9px] text-white/15 font-mono tracking-widest">ANALYTICS DASHBOARD</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "CONVERSION RATE", value: 71, suffix: "%", change: "+2.3%", up: true },
          { label: "AVG ONBOARDING", value: 4.2, suffix: " days", change: "-0.5d", up: false },
          { label: "MONTHLY HIRES", value: 167, change: "+23", up: true },
          { label: "COST PER HIRE", value: 125, prefix: "Rp ", suffix: "k", change: "-12%", up: false },
        ].map(m => (
          <div key={m.label} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-[9px] text-white/15 font-mono tracking-wider mb-2">{m.label}</p>
            <p className="font-display text-2xl font-bold">{m.prefix || ""}<Counter end={m.value} />{m.suffix || ""}</p>
            <span className={`text-[10px] font-mono flex items-center gap-0.5 mt-1 ${m.up ? "text-emerald-400" : "text-red-400"}`}>
              {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {m.change}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <p className="text-[9px] text-white/15 font-mono tracking-widest mb-4">HIRING TREND (12 MONTHS)</p>
          <div className="h-48 flex items-end gap-1.5">
            {[65, 78, 92, 105, 88, 120, 134, 98, 142, 156, 128, 167].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-amber-500/50 to-orange-500/30 hover:from-amber-500 hover:to-orange-500 transition-all cursor-crosshair" style={{ height: `${(v / 167) * 100}%` }} />
                <span className="text-[8px] text-white/15 font-mono">{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <p className="text-[9px] text-white/15 font-mono tracking-widest mb-4">PORTAL DISTRIBUTION</p>
          <div className="space-y-4 mt-4">
            {[
              { label: "Driver", pct: 39, color: "from-blue-500 to-blue-600", count: 487 },
              { label: "Kurir", pct: 31, color: "from-cyan-500 to-teal-600", count: 392 },
              { label: "Daily Worker", pct: 30, color: "from-purple-500 to-violet-600", count: 368 },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">{p.label}</span>
                  <span className="font-mono text-white/50">{p.count} ({p.pct}%)</span>
                </div>
                <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
