"use client";

import { use, useState } from "react";
import { Search, Filter, ChevronDown, Eye, Check, X, Phone, MoreHorizontal } from "lucide-react";

const allCandidates = [
  { id: 1, name: "Ahmad Sudirman", nik: "3201xxxx0001", phone: "0812xxxx1001", position: "Driver CDD", status: "pending", date: "19/05/2026", docs: 5 },
  { id: 2, name: "Budi Hartono", nik: "3201xxxx0002", phone: "0813xxxx1002", position: "Kurir Motor", status: "approved", date: "19/05/2026", docs: 7 },
  { id: 3, name: "Citra Dewi", nik: "3201xxxx0003", phone: "0857xxxx1003", position: "Daily Worker", status: "rejected", date: "18/05/2026", docs: 3 },
  { id: 4, name: "Deni Saputra", nik: "3201xxxx0004", phone: "0821xxxx1004", position: "Driver Wingbox", status: "pending", date: "18/05/2026", docs: 6 },
  { id: 5, name: "Eko Prasetyo", nik: "3201xxxx0005", phone: "0878xxxx1005", position: "Kurir Mobil", status: "approved", date: "17/05/2026", docs: 7 },
  { id: 6, name: "Fitri Handayani", nik: "3201xxxx0006", phone: "0856xxxx1006", position: "Daily Worker", status: "pending", date: "17/05/2026", docs: 4 },
  { id: 7, name: "Gunawan Wibowo", nik: "3201xxxx0007", phone: "0819xxxx1007", position: "Driver CDD", status: "approved", date: "16/05/2026", docs: 7 },
  { id: 8, name: "Hendra Wijaya", nik: "3201xxxx0008", phone: "0838xxxx1008", position: "Kurir Motor", status: "pending", date: "16/05/2026", docs: 5 },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function CandidatesPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = allCandidates.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.nik.includes(search);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIK..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "Semua" },
            { id: "pending", label: "Menunggu" },
            { id: "approved", label: "Disetujui" },
            { id: "rejected", label: "Ditolak" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f.id
                  ? "bg-gradient-to-r from-red-500 to-orange-600 text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-white/40">{filtered.length} kandidat ditemukan</p>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs">
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">NIK</th>
                <th className="text-left px-4 py-3 font-medium">Posisi</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Berkas</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-white/30 sm:hidden">{c.nik}</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs hidden sm:table-cell">{c.nik}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{c.position}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${(c.docs / 7) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-white/40">{c.docs}/7</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${statusColors[c.status]}`}>
                      {c.status === "pending" ? "Menunggu" : c.status === "approved" ? "Disetujui" : "Ditolak"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors" title="Lihat">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors" title="Terima">
                        <Check className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors" title="Tolak">
                        <X className="w-4 h-4" />
                      </button>
                      <a href={`https://wa.me/${c.phone}`} target="_blank" className="p-1.5 rounded-lg hover:bg-green-500/10 text-white/30 hover:text-green-400 transition-colors" title="WhatsApp">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
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
