"use client";

import { use, useState } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Upload, FileCheck, AlertCircle, ChevronRight, ImageIcon } from "lucide-react";

const documents = [
  { id: "ktp", label: "KTP", required: true },
  { id: "sim", label: "SIM", required: true },
  { id: "photo", label: "Pas Photo", required: true },
  { id: "skck", label: "SKCK", required: false },
  { id: "suratsehat", label: "Surat Sehat", required: false },
  { id: "paklaring", label: "Paklaring", required: false },
  { id: "vaksin", label: "Sertifikat Vaksin", required: false },
];

export default function BerkasPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  // Simulated upload status
  const [uploads] = useState<Record<string, string>>({
    ktp: "verified",
    sim: "verified",
    photo: "pending",
  });

  const completed = Object.keys(uploads).length;
  const total = documents.filter((d) => d.required).length;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Kelengkapan Berkas</h2>
          <span className={`text-sm font-bold ${progress >= 100 ? "text-emerald-400" : "text-amber-400"}`}>
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2">
          {completed} dari {total} dokumen wajib sudah diupload
        </p>
      </div>

      {/* Document cards */}
      <div className="space-y-2">
        {documents.map((doc) => {
          const status = uploads[doc.id];
          return (
            <div
              key={doc.id}
              className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                status === "verified" ? "bg-emerald-500/10" :
                status === "pending" ? "bg-amber-500/10" :
                "bg-white/5"
              }`}>
                {status === "verified" ? (
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                ) : status === "pending" ? (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  {doc.label}
                  {doc.required && <span className="text-[10px] text-red-400">WAJIB</span>}
                </p>
                <p className="text-xs text-white/30">
                  {status === "verified" ? "Terverifikasi" :
                   status === "pending" ? "Menunggu verifikasi" :
                   "Belum diupload"}
                </p>
              </div>
              {!status && (
                <button className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.gradient} text-xs font-medium flex items-center gap-1`}>
                  <Upload className="w-3 h-3" /> Upload
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
