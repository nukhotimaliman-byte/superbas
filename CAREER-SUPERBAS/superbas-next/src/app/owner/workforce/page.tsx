"use client";

import { Counter } from "@/components/ui/Counter";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { useState } from "react";

const workers = [
  { name: "Ahmad Sudirman", portal: "Driver", position: "CDD", location: "DC Jakarta Utara", status: "active", days: 142 },
  { name: "Budi Hartono", portal: "Kurir", position: "Motor", location: "DC Tangerang", status: "active", days: 89 },
  { name: "Citra Dewi", portal: "Daily Worker", position: "Packer", location: "DC Bekasi", status: "inactive", days: 45 },
  { name: "Deni Saputra", portal: "Driver", position: "Wingbox", location: "DC Jakarta Utara", status: "active", days: 210 },
  { name: "Eko Prasetyo", portal: "Kurir", position: "Mobil", location: "DC Bogor", status: "active", days: 67 },
  { name: "Fitri Handayani", portal: "Daily Worker", position: "Sortir", location: "DC Tangerang", status: "active", days: 34 },
  { name: "Gunawan Wibowo", portal: "Driver", position: "CDD", location: "DC Bekasi", status: "active", days: 178 },
  { name: "Hendra Wijaya", portal: "Kurir", position: "Motor", location: "DC Jakarta Utara", status: "suspended", days: 156 },
];

const portalColors: Record<string, string> = {
  Driver: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Kurir: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Daily Worker": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};
const statusColors: Record<string, string> = {
  active: "text-emerald-400",
  inactive: "text-white/30",
  suspended: "text-red-400",
};

export default function WorkforcePage() {
  const [search, setSearch] = useState("");
  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.portal.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workforce..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/30 placeholder:text-white/15" />
        </div>
      </div>

      <p className="text-[9px] text-white/15 font-mono tracking-widest">{filtered.length} RECORDS</p>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-white/20 text-[10px] font-mono tracking-wider">
                <th className="text-left px-4 py-3">NAME</th>
                <th className="text-left px-4 py-3">PORTAL</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">POSITION</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">LOCATION</th>
                <th className="text-left px-4 py-3">DAYS</th>
                <th className="text-left px-4 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w, i) => (
                <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${portalColors[w.portal]}`}>{w.portal}</span>
                  </td>
                  <td className="px-4 py-3 text-white/40 hidden md:table-cell">{w.position}</td>
                  <td className="px-4 py-3 text-white/30 text-xs hidden lg:table-cell flex items-center gap-1">
                    <MapPin className="w-3 h-3 inline" /> {w.location}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{w.days}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs capitalize ${statusColors[w.status]}`}>● {w.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
