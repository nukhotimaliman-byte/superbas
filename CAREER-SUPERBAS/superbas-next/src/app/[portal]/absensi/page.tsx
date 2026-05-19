"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Camera, MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function AbsensiPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [capturing, setCapturing] = useState(false);

  const history = [
    { date: "19 Mei 2026", masuk: "07:30", pulang: "16:00", status: "hadir" },
    { date: "18 Mei 2026", masuk: "07:25", pulang: "16:05", status: "hadir" },
    { date: "17 Mei 2026", masuk: "-", pulang: "-", status: "izin" },
    { date: "16 Mei 2026", masuk: "07:28", pulang: "16:00", status: "hadir" },
    { date: "15 Mei 2026", masuk: "07:35", pulang: "16:10", status: "terlambat" },
  ];

  return (
    <div className="space-y-6">
      {/* Camera section */}
      <div className="glass rounded-2xl p-6 text-center">
        <div className="w-48 h-48 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 mx-auto flex items-center justify-center mb-4 relative overflow-hidden">
          <div className="text-center">
            <Camera className="w-10 h-10 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30">Klik untuk ambil foto</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-4">
          <MapPin className="w-3 h-3" />
          <span>Lokasi: Menunggu GPS...</span>
        </div>
        <button
          onClick={() => setCapturing(!capturing)}
          className={`px-8 py-3 rounded-xl bg-gradient-to-r ${config.gradient} font-medium text-sm`}
        >
          {capturing ? "Mengirim..." : "Absen Masuk"}
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="font-display font-semibold mb-3 text-sm">Riwayat Absensi</h3>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-white/5 text-xs text-white/40 font-medium">
            <span>Tanggal</span>
            <span>Masuk</span>
            <span>Pulang</span>
            <span className="text-right">Status</span>
          </div>
          {history.map((h, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-white/5 last:border-0 text-sm">
              <span className="text-xs">{h.date}</span>
              <span className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3 text-white/30" /> {h.masuk}
              </span>
              <span className="text-xs">{h.pulang}</span>
              <span className="text-right">
                {h.status === "hadir" && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Hadir
                  </span>
                )}
                {h.status === "izin" && (
                  <span className="text-xs text-amber-400">Izin</span>
                )}
                {h.status === "terlambat" && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-400">
                    <XCircle className="w-3 h-3" /> Telat
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
