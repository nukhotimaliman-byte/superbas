"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Award, RefreshCw, Shield, Medal } from "lucide-react";

const values = [
  { icon: Award, letter: "C", title: "Commitment", desc: "Dedikasi penuh terhadap setiap mitra dan pelamar" },
  { icon: RefreshCw, letter: "A", title: "Adaptive", desc: "Fleksibel menghadapi dinamika industri logistik" },
  { icon: Shield, letter: "R", title: "Reliability", desc: "Terpercaya dalam setiap proses dan layanan" },
  { icon: Medal, letter: "E", title: "Expertise", desc: "Keahlian profesional dalam manajemen tenaga kerja" },
];

export function CareSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-center mb-14 tracking-wider">
            <span className="gradient-text">C</span>.<span className="gradient-text">A</span>.<span className="gradient-text">R</span>.<span className="gradient-text">E</span>
          </h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v, i) => (
            <ScrollReveal key={v.letter} delay={i * 0.1}>
              <div className="glass rounded-2xl p-6 text-center hover:border-bas-500/20 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-bas-500/10 border border-bas-500/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-bas-500/20 transition-colors">
                  <v.icon className="w-6 h-6 text-bas-400" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-white/40 text-sm">{v.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
