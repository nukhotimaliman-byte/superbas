import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck, Package, HardHat, MapPin, Clock, Users,
  ArrowRight, Search, Briefcase, Star, Shield, ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Lowongan Kerja — Super-BAS | PT Barokah Amanah Sentosa",
  description:
    "Cari lowongan kerja terbaru untuk Driver, Kurir, dan Daily Worker di PT Barokah Amanah Sentosa. Gaji kompetitif, jenjang karir jelas.",
  openGraph: {
    title: "Lowongan Kerja — Super-BAS",
    description: "Driver, Kurir, Daily Worker — Daftar sekarang!",
    type: "website",
  },
};

const jobs = [
  {
    id: "driver-cdd",
    title: "Driver CDD",
    portal: "driver",
    icon: Truck,
    color: "from-blue-500 to-blue-600",
    accent: "text-blue-400",
    bgAccent: "bg-blue-500/10",
    location: "Jakarta, Tangerang, Bekasi",
    type: "Full-time",
    salary: "Rp 4.5 - 6 Juta/bulan",
    requirements: ["SIM B1 aktif", "Usia maks. 45 tahun", "Sehat jasmani & rohani"],
    benefits: ["BPJS Kesehatan & TK", "Uang makan harian", "Bonus performa"],
    slots: 15,
  },
  {
    id: "driver-wingbox",
    title: "Driver Wingbox",
    portal: "driver",
    icon: Truck,
    color: "from-blue-600 to-indigo-600",
    accent: "text-blue-400",
    bgAccent: "bg-blue-500/10",
    location: "Jakarta, Bogor",
    type: "Full-time",
    salary: "Rp 5 - 7 Juta/bulan",
    requirements: ["SIM B2 aktif", "Pengalaman min. 1 tahun", "Menguasai rute Jabodetabek"],
    benefits: ["BPJS Kesehatan & TK", "Uang makan harian", "Lembur dibayar"],
    slots: 8,
  },
  {
    id: "kurir-motor",
    title: "Kurir Motor",
    portal: "kurir",
    icon: Package,
    color: "from-cyan-500 to-teal-600",
    accent: "text-cyan-400",
    bgAccent: "bg-cyan-500/10",
    location: "Jabodetabek",
    type: "Full-time",
    salary: "Rp 3.5 - 5 Juta/bulan",
    requirements: ["SIM C aktif", "Memiliki motor sendiri", "HP Android min. 4G"],
    benefits: ["Insentif per paket", "Uang bensin", "Bonus performa"],
    slots: 25,
  },
  {
    id: "kurir-mobil",
    title: "Kurir Mobil",
    portal: "kurir",
    icon: Package,
    color: "from-teal-500 to-emerald-600",
    accent: "text-teal-400",
    bgAccent: "bg-teal-500/10",
    location: "Jakarta, Tangerang",
    type: "Full-time",
    salary: "Rp 4 - 5.5 Juta/bulan",
    requirements: ["SIM A aktif", "Memiliki mobil pick-up/box", "Berpengalaman"],
    benefits: ["Insentif per paket", "Uang bensin", "BPJS"],
    slots: 10,
  },
  {
    id: "daily-worker-packer",
    title: "Daily Worker — Packer",
    portal: "daily-worker",
    icon: HardHat,
    color: "from-purple-500 to-violet-600",
    accent: "text-purple-400",
    bgAccent: "bg-purple-500/10",
    location: "DC Jakarta Utara, DC Tangerang",
    type: "Harian",
    salary: "Rp 120.000 - 150.000/hari",
    requirements: ["Usia 18-40 tahun", "Sehat jasmani", "Siap kerja shift"],
    benefits: ["Makan siang", "Transportasi", "Lembur dibayar"],
    slots: 50,
  },
  {
    id: "daily-worker-sortir",
    title: "Daily Worker — Sortir",
    portal: "daily-worker",
    icon: HardHat,
    color: "from-violet-500 to-purple-700",
    accent: "text-violet-400",
    bgAccent: "bg-violet-500/10",
    location: "DC Bekasi, DC Bogor",
    type: "Harian",
    salary: "Rp 110.000 - 140.000/hari",
    requirements: ["Usia 18-40 tahun", "Teliti & cekatan", "Siap kerja malam"],
    benefits: ["Makan siang", "Transportasi", "Uang shift malam"],
    slots: 40,
  },
];

export default function JobBoardPage() {
  return (
    <div className="min-h-screen bg-bas-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bas-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display font-bold text-xs">
              BAS
            </div>
            <span className="font-display font-bold text-sm">Super-BAS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-bas-500 to-accent-blue text-xs font-medium"
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-6">
            <Briefcase className="w-3 h-3" />
            {jobs.reduce((a, j) => a + j.slots, 0)}+ posisi tersedia
          </div>
          <h1 className="font-display text-3xl lg:text-5xl font-bold leading-tight mb-4">
            Temukan{" "}
            <span className="bg-gradient-to-r from-bas-400 to-accent-blue bg-clip-text text-transparent">
              Karir Impian
            </span>{" "}
            Anda
          </h1>
          <p className="text-white/40 lg:text-lg max-w-xl mx-auto">
            Bergabung dengan PT Barokah Amanah Sentosa. Gaji kompetitif, lingkungan kerja profesional, jenjang karir jelas.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Karyawan Aktif", value: "1,200+" },
            { icon: MapPin, label: "Lokasi DC", value: "12" },
            { icon: Star, label: "Rating Karyawan", value: "4.8/5" },
            { icon: Shield, label: "Tahun Beroperasi", value: "5+" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <s.icon className="w-5 h-5 text-white/30 mx-auto mb-2" />
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Job listings */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="font-display text-xl font-bold mb-6">
          Lowongan Terbuka
        </h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="glass rounded-2xl overflow-hidden hover:border-white/10 transition-all group"
            >
              {/* Card header */}
              <div className={`bg-gradient-to-r ${job.color} p-4 flex items-center gap-3`}>
                <job.icon className="w-6 h-6" />
                <div className="flex-1">
                  <h3 className="font-display font-bold text-sm">{job.title}</h3>
                  <p className="text-xs text-white/70">{job.type}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-medium">
                  {job.slots} slot
                </span>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {job.salary}
                  </span>
                </div>

                {/* Requirements */}
                <div>
                  <p className="text-[10px] text-white/30 font-medium mb-1.5">PERSYARATAN</p>
                  <ul className="space-y-1">
                    {job.requirements.map((r) => (
                      <li key={r} className="text-xs text-white/50 flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-white/20" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits */}
                <div className="flex flex-wrap gap-1.5">
                  {job.benefits.map((b) => (
                    <span key={b} className={`text-[10px] px-2 py-0.5 rounded-full ${job.bgAccent} ${job.accent}`}>
                      {b}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={`/login?portal=${job.portal}`}
                  className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${job.color} text-sm font-medium flex items-center justify-center gap-2 opacity-90 hover:opacity-100 transition-opacity`}
                >
                  Lamar Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <p>&copy; 2026 PT Barokah Amanah Sentosa. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/jobs" className="hover:text-white transition-colors">Lowongan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
