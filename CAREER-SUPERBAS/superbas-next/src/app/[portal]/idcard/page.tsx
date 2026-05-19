"use client";

import { use } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { CreditCard, Download, Shield } from "lucide-react";

export default function IDCardPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-1">ID Card Digital</h2>
        <p className="text-white/40 text-xs">Kartu identitas karyawan BAS</p>
      </div>

      {/* ID Card preview */}
      <div className="max-w-sm mx-auto">
        <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} p-6 relative overflow-hidden shadow-2xl`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" />
              <span className="font-display font-bold text-sm">PT Barokah Amanah Sentosa</span>
            </div>
            <div className="w-20 h-24 bg-white/20 rounded-lg mb-3 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white/40" />
            </div>
            <p className="font-display font-bold text-lg">Nama Karyawan</p>
            <p className="text-white/70 text-sm">{config.label}</p>
            <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-white/50">NIK</p><p className="font-mono">3201xxxxxxxxxx</p></div>
              <div><p className="text-white/50">ID</p><p className="font-mono">BAS-2026-001</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${config.gradient} text-sm font-medium inline-flex items-center gap-2`}>
          <Download className="w-4 h-4" /> Download ID Card
        </button>
      </div>
    </div>
  );
}
