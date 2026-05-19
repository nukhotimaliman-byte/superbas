"use client";

import { useState } from "react";
import { Shield, Key, Database, Users, Save, Globe } from "lucide-react";

export default function OwnerSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-[9px] text-white/15 font-mono tracking-widest">SYSTEM CONFIGURATION</p>

      {/* Database */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4">
        <div className="flex items-center gap-2"><Database className="w-5 h-5 text-amber-400" /><h2 className="font-display font-semibold text-sm">Database</h2></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-white/25 font-mono mb-1">HOST</label>
            <input type="text" defaultValue="46.250.232.197" className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500/30" readOnly />
          </div>
          <div>
            <label className="block text-[10px] text-white/25 font-mono mb-1">PORT</label>
            <input type="text" defaultValue="3306" className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500/30" readOnly />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-amber-400" /><h2 className="font-display font-semibold text-sm">Security</h2></div>
        <div>
          <label className="block text-[10px] text-white/25 font-mono mb-1">OWNER PASSWORD</label>
          <div className="flex gap-2">
            <input type="password" defaultValue="••••••••" className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/30" />
            <button className="px-3 py-2 rounded-lg bg-white/[0.03] text-xs font-medium hover:bg-white/[0.06] transition-colors flex items-center gap-1"><Key className="w-3 h-3" /> Change</button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-white/25 font-mono mb-1">ALLOWED ORIGINS (CORS)</label>
          <input type="text" defaultValue="https://superbas-next.vercel.app, https://super-bas.com" className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500/30" />
        </div>
      </div>

      {/* Admin accounts */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4">
        <div className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /><h2 className="font-display font-semibold text-sm">Admin Accounts</h2></div>
        {["admin_driver", "admin_kurir", "admin_dw"].map(a => (
          <div key={a} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
            <span className="text-sm font-mono">{a}</span>
            <span className="text-[10px] text-emerald-400">● Active</span>
          </div>
        ))}
      </div>

      <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-medium text-sm flex items-center justify-center gap-2 text-black font-bold">
        <Save className="w-4 h-4" /> Save Configuration
      </button>
    </div>
  );
}
