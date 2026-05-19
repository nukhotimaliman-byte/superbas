"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="glass-strong rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Siap Bergabung?
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Pilih posisi dan mulai karirmu bersama BAS sekarang juga.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: "Daftar Driver", href: "/driver/" },
                { label: "Daftar Kurir", href: "/kurir/" },
                { label: "Daftar Daily Worker", href: "/daily-worker/" },
              ].map((cta) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="btn-primary px-6 py-3 rounded-xl text-sm font-medium"
                >
                  <span className="relative z-10">{cta.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
