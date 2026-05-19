"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { AlertTriangle, Send, Clock, CheckCircle2 } from "lucide-react";

const categories = ["Gaji", "Penempatan", "Peralatan", "Rekan Kerja", "Lainnya"];

export default function AduanPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const history = [
    { text: "Slip gaji bulan April belum muncul", status: "resolved", date: "10 Mei 2026" },
    { text: "Peralatan kerja kurang lengkap", status: "pending", date: "15 Mei 2026" },
  ];

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold">Buat Aduan Baru</h2>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Kategori</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === c ? `bg-gradient-to-r ${config.gradient}` : "bg-white/5 text-white/40 hover:bg-white/10"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Detail Aduan</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Jelaskan detail masalah Anda..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 placeholder:text-white/20 resize-none" />
        </div>
        <button className={`w-full py-3 rounded-xl bg-gradient-to-r ${config.gradient} font-medium text-sm flex items-center justify-center gap-2`}>
          <Send className="w-4 h-4" /> Kirim Aduan
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display font-semibold mb-3 text-sm">Riwayat Aduan</h3>
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${h.status === "resolved" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                {h.status === "resolved" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{h.text}</p>
                <p className="text-xs text-white/30">{h.date}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${h.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                {h.status === "resolved" ? "Selesai" : "Proses"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
