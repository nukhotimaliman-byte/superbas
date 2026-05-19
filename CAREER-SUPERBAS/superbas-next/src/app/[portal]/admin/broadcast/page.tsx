"use client";

import { use, useState } from "react";
import { Send, Users, Clock, CheckCircle2 } from "lucide-react";

export default function BroadcastPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");

  const history = [
    { text: "Jadwal kerja bulan Juni sudah tersedia di dashboard.", target: "Semua", sent: "19/05 09:00", read: 892 },
    { text: "Batas upload SKCK diperpanjang hingga 30 Mei.", target: "Pending", sent: "17/05 10:30", read: 156 },
    { text: "Slip gaji bulan Mei sudah bisa didownload.", target: "Approved", sent: "15/05 08:00", read: 1023 },
  ];

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="font-display font-semibold">Kirim Broadcast</h2>
        <div className="flex gap-2">
          {[{ id: "all", label: "Semua" }, { id: "approved", label: "Disetujui" }, { id: "pending", label: "Menunggu" }].map(t => (
            <button key={t.id} onClick={() => setTarget(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${target === t.id ? "bg-gradient-to-r from-red-500 to-orange-600" : "bg-white/5 text-white/40"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Tulis pesan broadcast..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 placeholder:text-white/20 resize-none" />
        <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-sm font-medium flex items-center gap-2">
          <Send className="w-4 h-4" /> Kirim ke {target === "all" ? "1,247" : target === "approved" ? "892" : "199"} orang
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display font-semibold mb-3 text-sm">Riwayat Broadcast</h3>
        <div className="space-y-2">
          {history.map((h, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <p className="text-sm mb-2">{h.text}</p>
              <div className="flex gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {h.target}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {h.sent}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {h.read} dibaca</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
