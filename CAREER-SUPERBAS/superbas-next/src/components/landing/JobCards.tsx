"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Truck, Bike, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const jobs = [
  {
    title: "Supir Truck",
    sub: "Armada CDD, WB & Big Mama",
    icon: Truck,
    reqs: ["SIM B1 / B2 Umum", "Pengalaman unit CDD / WB / Big Mama", "Sehat jasmani & rohani"],
    href: "/driver/",
    featured: false,
  },
  {
    title: "Kurir",
    sub: "Rider (Motor) & Driver (Mobil)",
    icon: Bike,
    reqs: ["SIM A / SIM C aktif", "Smartphone minimal RAM 3GB", "Mengenal area pengantaran"],
    href: "/kurir/",
    featured: true,
    badge: "Populer",
  },
  {
    title: "Daily Worker",
    sub: "Tenaga Harian Lepas",
    icon: Users,
    reqs: ["Laki-laki, usia produktif", "Penempatan nasional", "Siap kerja shifting"],
    href: "/daily-worker/",
    featured: false,
  },
];

export function JobCardsSection() {
  return (
    <section id="lowongan" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3 text-center">
            Posisi Tersedia
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">
            Pilih Karir Terbaikmu
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {jobs.map((job, i) => (
            <ScrollReveal key={job.title} delay={i * 0.1}>
              <div
                className={`relative glass rounded-3xl p-7 flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:border-bas-500/30 group ${
                  job.featured ? "border-bas-500/20 glow-purple" : ""
                }`}
              >
                {job.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-bas-500 to-accent-blue text-xs font-semibold">
                    {job.badge}
                  </span>
                )}

                <div className="w-12 h-12 rounded-2xl bg-bas-500/10 border border-bas-500/20 flex items-center justify-center mb-5 group-hover:bg-bas-500/20 transition-colors">
                  <job.icon className="w-6 h-6 text-bas-400" />
                </div>

                <h3 className="font-display text-xl font-bold mb-1">{job.title}</h3>
                <p className="text-white/40 text-sm mb-5">{job.sub}</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {job.reqs.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-white/50">
                      <span className="w-1 h-1 rounded-full bg-bas-400 mt-2 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>

                <Link
                  href={job.href}
                  className="btn-primary py-3 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Daftar Sekarang
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
