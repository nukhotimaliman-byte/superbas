"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function GantiRekPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");

  return (
    <div className="space-y-6 max-w-md">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-1">Ganti Rekening</h2>
        <p className="text-white/40 text-xs">Ajukan perubahan rekening gaji</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80">Pengajuan ganti rekening memerlukan persetujuan admin. Proses verifikasi membutuhkan 1-3 hari kerja.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Nama Bank</label>
          <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500">
            <option value="">Pilih bank</option>
            <option value="bca">BCA</option><option value="bni">BNI</option>
            <option value="bri">BRI</option><option value="mandiri">Mandiri</option>
            <option value="cimb">CIMB Niaga</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Nomor Rekening</label>
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Masukkan nomor rekening" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 placeholder:text-white/20" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Nama Pemilik Rekening</label>
          <input type="text" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Sesuai buku tabungan" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 placeholder:text-white/20" />
        </div>
        <button className={`w-full py-3 rounded-xl bg-gradient-to-r ${config.gradient} font-medium text-sm flex items-center justify-center gap-2`}>
          <RefreshCw className="w-4 h-4" /> Ajukan Perubahan
        </button>
      </div>
    </div>
  );
}
