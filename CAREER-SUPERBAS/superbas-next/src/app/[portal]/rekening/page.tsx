"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Landmark, CheckCircle2 } from "lucide-react";

export default function RekeningPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [bank] = useState({ name: "BCA", number: "123xxxxxxx", holder: "Nama Karyawan" });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-1">Rekening Gaji</h2>
        <p className="text-white/40 text-xs">Rekening yang terdaftar untuk penerimaan gaji</p>
      </div>
      <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-6 max-w-md mx-auto relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Landmark className="w-5 h-5" />
            <span className="font-display font-bold text-sm">{bank.name}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-300 ml-auto" />
          </div>
          <p className="font-mono text-xl tracking-widest mb-4">{bank.number}</p>
          <p className="text-white/70 text-sm">a/n {bank.holder}</p>
        </div>
      </div>
    </div>
  );
}
