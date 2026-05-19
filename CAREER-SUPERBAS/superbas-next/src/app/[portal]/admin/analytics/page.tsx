"use client";

import { use } from "react";
import { Counter } from "@/components/ui/Counter";
import { TrendingUp, Users, MapPin, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function AnalyticsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);

  const metrics = [
    { label: "Conversion Rate", value: 71, suffix: "%", change: "+2.3%", up: true },
    { label: "Avg. Onboarding", value: 4.2, suffix: " hari", change: "-0.5", up: false },
    { label: "Retention 30d", value: 89, suffix: "%", change: "+1.1%", up: true },
    { label: "Cost per Hire", value: 125, prefix: "Rp ", suffix: "k", change: "-12%", up: false },
  ];

  const topLocations = [
    { name: "DC Jakarta Utara", count: 423, pct: 34 },
    { name: "DC Tangerang", count: 312, pct: 25 },
    { name: "DC Bekasi", count: 287, pct: 23 },
    { name: "DC Bogor", count: 225, pct: 18 },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="glass rounded-2xl p-4">
            <p className="text-xs text-white/40 mb-2">{m.label}</p>
            <p className="font-display text-2xl font-bold">{m.prefix || ""}<Counter end={m.value} />{m.suffix}</p>
            <span className={`text-xs flex items-center gap-0.5 mt-1 ${m.up ? "text-emerald-400" : "text-red-400"}`}>
              {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {m.change}
            </span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Pendaftaran per Bulan</h3>
          <div className="h-40 flex items-end gap-2">
            {[65, 78, 92, 105, 88, 120, 134, 98, 142, 156, 128, 167].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-red-500/60 to-orange-500/40 hover:from-red-500 hover:to-orange-500 transition-all" style={{ height: `${(v / 167) * 100}%` }} />
                <span className="text-[8px] text-white/20">{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top locations */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Top Lokasi Penempatan</h3>
          <div className="space-y-4">
            {topLocations.map(loc => (
              <div key={loc.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-white/30" /> {loc.name}</span>
                  <span className="text-white/60">{loc.count} orang</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${loc.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
