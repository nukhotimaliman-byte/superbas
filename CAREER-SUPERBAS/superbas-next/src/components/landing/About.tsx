"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Counter } from "@/components/ui/Counter";

export function AboutSection() {
  return (
    <section id="about" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3">
            Tentang Kami
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            PT Barokah Amanah Sentosa
          </h2>
          <p className="text-white/50 max-w-2xl text-lg leading-relaxed mb-10">
            Partner logistik terpercaya yang menghubungkan ribuan tenaga kerja
            profesional dengan perusahaan-perusahaan terkemuka di Indonesia. Kami
            berkomitmen memberikan kesempatan kerja yang adil dan transparan.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-3 gap-6 max-w-lg">
          {[
            { count: 500, suffix: "+", label: "Armada" },
            { count: 200, suffix: "+", label: "Kota" },
            { count: 100000, suffix: "+", label: "Mitra Aktif" },
          ].map((m, i) => (
            <ScrollReveal key={m.label} delay={i * 0.1}>
              <div className="glass rounded-2xl p-5 text-center hover:border-bas-500/30 transition-colors">
                <Counter
                  end={m.count}
                  suffix={m.suffix}
                  className="font-display text-2xl sm:text-3xl font-bold gradient-text"
                />
                <p className="text-xs text-white/40 mt-1">{m.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
