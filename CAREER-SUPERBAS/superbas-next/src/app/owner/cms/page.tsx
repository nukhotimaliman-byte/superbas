"use client";

import { useState } from "react";
import { Globe, Eye, EyeOff, Save, Trash2, Plus, AlertTriangle } from "lucide-react";

export default function CMSPage() {
  const [maintenance, setMaintenance] = useState(false);

  const pages = [
    { title: "Landing Page", path: "/", status: "published", lastEdit: "19 Mei 2026" },
    { title: "Login Page", path: "/login", status: "published", lastEdit: "18 Mei 2026" },
    { title: "Driver Portal", path: "/driver", status: "published", lastEdit: "17 Mei 2026" },
    { title: "Kurir Portal", path: "/kurir", status: "published", lastEdit: "17 Mei 2026" },
    { title: "Daily Worker Portal", path: "/daily-worker", status: "published", lastEdit: "17 Mei 2026" },
  ];

  return (
    <div className="space-y-6">
      {/* Maintenance toggle */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Maintenance Mode</p>
              <p className="text-xs text-white/25">Menonaktifkan semua portal untuk publik</p>
            </div>
          </div>
          <button onClick={() => setMaintenance(!maintenance)} className={`w-12 h-7 rounded-full transition-colors relative ${maintenance ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-white/10"}`}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${maintenance ? "left-[26px]" : "left-1"}`} />
          </button>
        </div>
      </div>

      {/* Pages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] text-white/15 font-mono tracking-widest">MANAGED PAGES</p>
          <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-xs font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> New Page
          </button>
        </div>
        <div className="space-y-2">
          {pages.map(p => (
            <div key={p.path} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex items-center gap-4 hover:border-white/[0.08] transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                <Globe className="w-5 h-5 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-white/25 font-mono">{p.path}</p>
              </div>
              <span className="text-[10px] text-white/20 hidden sm:block">{p.lastEdit}</span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Eye className="w-3 h-3" /> Live
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEO section */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4">
        <p className="text-[9px] text-white/15 font-mono tracking-widest">SEO SETTINGS</p>
        <div>
          <label className="block text-xs text-white/25 mb-1.5">Site Title</label>
          <input type="text" defaultValue="Super-BAS — Platform Rekrutmen PT Barokah Amanah Sentosa" className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/30" />
        </div>
        <div>
          <label className="block text-xs text-white/25 mb-1.5">Meta Description</label>
          <textarea defaultValue="Platform rekrutmen terpadu untuk Driver, Kurir, dan Daily Worker PT Barokah Amanah Sentosa." rows={2} className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/30 resize-none" />
        </div>
        <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-medium flex items-center gap-2">
          <Save className="w-4 h-4" /> Update SEO
        </button>
      </div>
    </div>
  );
}
