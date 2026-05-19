"use client";

import { use } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { MapPin, Navigation, Clock, Phone } from "lucide-react";

const locations = [
  { name: "DC Jakarta Utara", address: "Jl. Raya Cakung No. 45, Cakung", hours: "06:00 - 22:00", phone: "021-xxxx-xxxx" },
  { name: "DC Tangerang", address: "Jl. Gatot Subroto Km 3, Cikupa", hours: "06:00 - 22:00", phone: "021-xxxx-xxxx" },
  { name: "DC Bekasi", address: "Jl. Raya Narogong No. 12, Cileungsi", hours: "06:00 - 22:00", phone: "021-xxxx-xxxx" },
];

export default function LokasiPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-semibold mb-1">Lokasi Distribution Center</h2>
        <p className="text-white/40 text-xs">Daftar DC penempatan kerja</p>
      </div>
      {locations.map((loc, i) => (
        <div key={i} className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm">{loc.name}</p>
              <p className="text-xs text-white/40">{loc.address}</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {loc.hours}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {loc.phone}</span>
          </div>
          <button className="w-full py-2 rounded-lg bg-white/5 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/10 transition-colors">
            <Navigation className="w-3 h-3" /> Buka di Google Maps
          </button>
        </div>
      ))}
    </div>
  );
}
