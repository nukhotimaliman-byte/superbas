"use client";

import { use, useState } from "react";
import { Shield, Key, Globe, Database, Save } from "lucide-react";

export default function AdminSettingsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Config */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-red-400" />
          <h2 className="font-display font-semibold">Konfigurasi API</h2>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">API Endpoint</label>
          <input type="text" defaultValue={`https://super-bas.com/${portal}/api/`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-red-500/50" readOnly />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Database Host</label>
          <input type="text" defaultValue="46.250.232.197" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-red-500/50" readOnly />
        </div>
      </div>

      {/* Security */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-red-400" />
          <h2 className="font-display font-semibold">Keamanan</h2>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Admin Password</label>
          <div className="flex gap-2">
            <input type="password" defaultValue="••••••••" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50" />
            <button className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1">
              <Key className="w-3 h-3" /> Update
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">CORS Origins</label>
          <input type="text" defaultValue="https://superbas-next.vercel.app" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-red-500/50" />
        </div>
      </div>

      {/* Maintenance mode */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-semibold">Mode Maintenance</h2>
              <p className="text-xs text-white/40">Menonaktifkan akses portal sementara</p>
            </div>
          </div>
          <button onClick={() => setMaintenance(!maintenance)} className={`w-11 h-6 rounded-full transition-colors relative ${maintenance ? "bg-gradient-to-r from-red-500 to-orange-600" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${maintenance ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <button className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 font-medium text-sm flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> Simpan Pengaturan
      </button>
    </div>
  );
}
