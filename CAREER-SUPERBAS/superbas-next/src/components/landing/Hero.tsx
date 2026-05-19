"use client";

import { motion } from "framer-motion";
import { Counter } from "@/components/ui/Counter";
import { ArrowRight, ChevronDown } from "lucide-react";

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-bas-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${60 + Math.random() * 40}%`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            animation: `float ${6 + Math.random() * 8}s ease-in-out ${Math.random() * 5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 mesh-animated" />
      <Particles />

      {/* Orbital rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-bas-500/10 animate-[pulse-ring_8s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-bas-400/5 animate-[pulse-ring_12s_ease-in-out_infinite_2s] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="max-w-3xl">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-bas-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Rekrutmen Terbuka 2026
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            Bergabung Bersama{" "}
            <span className="gradient-text glow-text block">
              Jaringan Logistik Terbesar
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-lg text-white/50 max-w-xl mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            Daftarkan dirimu sebagai Driver, Kurir, atau Daily Worker.
            Proses 100% online dan gratis tanpa pungutan biaya.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            <a
              href="#lowongan"
              className="btn-primary px-7 py-3.5 rounded-2xl font-medium flex items-center gap-2 text-sm"
            >
              <span className="relative z-10 flex items-center gap-2">
                Daftar Sekarang
                <ArrowRight className="w-4 h-4" />
              </span>
            </a>
            <a
              href="#about"
              className="btn-ghost px-7 py-3.5 rounded-2xl font-medium text-sm text-white/70"
            >
              Tentang BAS
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex gap-8 sm:gap-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            {[
              { count: 45762, suffix: "+", label: "Total Pelamar" },
              { count: 200, suffix: "+", label: "Kota Aktif" },
              { count: 100, suffix: "+", label: "% Gratis" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <Counter
                  end={stat.count}
                  suffix={stat.suffix}
                  className="font-display text-2xl sm:text-3xl font-bold gradient-text"
                />
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span>Scroll</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}
