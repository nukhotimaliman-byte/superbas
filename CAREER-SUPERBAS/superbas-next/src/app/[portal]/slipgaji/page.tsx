"use client";

import { use } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Download, Calendar } from "lucide-react";

const slips = [
  { month: "Mei 2026", amount: "Rp 4.250.000", status: "available" },
  { month: "April 2026", amount: "Rp 4.100.000", status: "available" },
  { month: "Maret 2026", amount: "Rp 4.300.000", status: "available" },
  { month: "Februari 2026", amount: "Rp 3.950.000", status: "available" },
];

export default function SlipGajiPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-1">Slip Gaji</h2>
        <p className="text-white/40 text-xs">Download slip gaji bulanan Anda</p>
      </div>
      {slips.map((s, i) => (
        <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{s.month}</p>
            <p className="text-xs text-white/40">{s.amount}</p>
          </div>
          <button className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} text-xs font-medium flex items-center gap-1`}>
            <Download className="w-3 h-3" /> PDF
          </button>
        </div>
      ))}
    </div>
  );
}
