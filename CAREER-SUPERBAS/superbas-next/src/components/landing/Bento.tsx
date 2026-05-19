"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { DollarSign, Smartphone, Shield, Zap, Globe, CheckCircle } from "lucide-react";

const items = [
  { icon: DollarSign, title: "Gaji Kompetitif", desc: "Penghasilan menarik dengan sistem pembayaran tepat waktu. Bonus dan insentif tambahan untuk performa terbaik.", large: true },
  { icon: Smartphone, title: "100% Online", desc: "Seluruh proses pendaftaran dilakukan secara digital tanpa perlu datang ke kantor." },
  { icon: Shield, title: "Data Aman", desc: "Data pribadi Anda terenkripsi dan dijamin keamanannya sesuai standar privasi." },
  { icon: Zap, title: "Respons Cepat", desc: "Tim admin kami merespons setiap pendaftaran dalam waktu 1x24 jam kerja." },
  { icon: Globe, title: "Se-Indonesia", desc: "Penempatan tersedia di 25+ kota besar di seluruh Indonesia." },
  { icon: CheckCircle, title: "Tanpa Pungutan Biaya", desc: "Pendaftaran 100% GRATIS. Tidak ada biaya administrasi, tidak ada potongan gaji, tidak ada biaya tersembunyi.", large: true },
];

export function BentoSection() {
  return (
    <section id="keunggulan" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3 text-center">Mengapa BAS?</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">Keunggulan Bergabung</h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.08} className={item.large ? "md:col-span-2" : ""}>
              <div className="glass rounded-2xl p-6 h-full hover:border-bas-500/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-bas-500/10 border border-bas-500/20 flex items-center justify-center mb-4 group-hover:bg-bas-500/20 transition-colors">
                  <item.icon className="w-5 h-5 text-bas-400" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
