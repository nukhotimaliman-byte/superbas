"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

const steps = [
  { n: "1", title: "Pilih Posisi", desc: "Driver, Kurir, atau Daily Worker" },
  { n: "2", title: "Isi Formulir", desc: "Data diri lengkap secara online" },
  { n: "3", title: "Upload Berkas", desc: "KTP, SIM, Pas Photo, dll" },
  { n: "4", title: "Selesai!", desc: "Tunggu konfirmasi dari admin" },
];

export function TimelineSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3 text-center">Alur Pendaftaran</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">4 Langkah Mudah</h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-4 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-bas-500/30 via-accent-blue/30 to-accent-cyan/30" />
          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delay={i * 0.12}>
              <div className="flex flex-col items-center text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display text-xl font-bold mb-4 relative z-10 shadow-lg shadow-bas-500/20">
                  {s.n}
                </div>
                <h3 className="font-display font-semibold mb-1">{s.title}</h3>
                <p className="text-white/40 text-sm">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
