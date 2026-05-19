"use client";

import { use, useState } from "react";
import { Search, FileCheck, AlertCircle, Eye, Download, ImageIcon } from "lucide-react";

const docs = [
  { name: "Ahmad Sudirman", type: "KTP", status: "verified", date: "19/05" },
  { name: "Budi Hartono", type: "SIM A", status: "verified", date: "19/05" },
  { name: "Citra Dewi", type: "Pas Photo", status: "pending", date: "18/05" },
  { name: "Deni Saputra", type: "SKCK", status: "rejected", date: "18/05" },
  { name: "Eko Prasetyo", type: "KTP", status: "verified", date: "17/05" },
  { name: "Fitri Handayani", type: "SIM C", status: "pending", date: "17/05" },
];

export default function DocumentsPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const [search, setSearch] = useState("");
  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.type.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari dokumen..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 placeholder:text-white/20" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((d, i) => (
          <div key={i} className="glass rounded-2xl p-4 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.status === "verified" ? "bg-emerald-500/10" : d.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                {d.status === "verified" ? <FileCheck className="w-5 h-5 text-emerald-400" /> : d.status === "pending" ? <ImageIcon className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-white/40">{d.type} · {d.date}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg bg-white/5 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                <Eye className="w-3 h-3" /> Preview
              </button>
              {d.status === "pending" && (
                <button className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-xs font-medium flex items-center justify-center gap-1">
                  <FileCheck className="w-3 h-3" /> Verifikasi
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
