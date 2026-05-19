"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Pak Hendra", role: "Driver CDD — Jakarta", quote: "Sangat Mudah & Cepat!", desc: "Proses pendaftarannya sangat mudah dan cepat. Dalam 2 hari saya sudah dihubungi admin. Sekarang sudah hampir 1 tahun bekerja." },
  { name: "Pak Sugianto", role: "Kurir Motor — Surabaya", quote: "Benar-Benar Gratis!", desc: "Awalnya ragu karena gratis, tapi ternyata memang benar-benar tidak ada biaya. Gaji juga tepat waktu setiap bulan." },
  { name: "Pak Ridwan", role: "Driver Wingbox — Bandung", quote: "Profesional Sekali!", desc: "Tim BAS sangat profesional. Dari pendaftaran sampai penempatan, semuanya jelas dan terorganisir dengan baik." },
  { name: "Pak Darmawan", role: "Daily Worker — Semarang", quote: "Praktis dari HP!", desc: "Saya suka sistem online-nya. Tidak perlu bolak-balik ke kantor. Upload dokumen dari HP langsung bisa." },
  { name: "Pak Agus", role: "Kurir Mobil — Medan", quote: "Recommended!", desc: "Sudah 8 bulan jadi kurir melalui BAS. Lingkungan kerja bagus dan pendapatan stabil." },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3 text-center">Testimoni</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">Kata Mereka yang Sudah Bergabung</h2>
        </ScrollReveal>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 px-6 snap-x snap-mandatory scrollbar-hide">
        {testimonials.map((t, i) => (
          <ScrollReveal key={i} delay={i * 0.1} className="snap-center">
            <div className="glass rounded-2xl p-6 min-w-[300px] max-w-[340px] shrink-0 hover:border-bas-500/20 transition-all relative">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="font-display font-semibold mb-2">{t.quote}</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">{t.desc}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display font-bold text-sm">
                  {t.name.charAt(4)}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-white/40">{t.role}</p>
                </div>
              </div>
              <span className="absolute top-4 right-5 text-5xl text-bas-500/10 font-serif leading-none">❝</span>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
