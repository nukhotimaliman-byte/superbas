"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  { q: "Apakah pendaftaran benar-benar gratis?", a: "Ya, 100% GRATIS. Tidak ada biaya pendaftaran, biaya administrasi, atau pungutan dalam bentuk apapun. Jika ada pihak yang meminta bayaran mengatasnamakan BAS, segera laporkan kepada kami." },
  { q: "Berapa lama proses seleksi?", a: "Proses seleksi membutuhkan waktu 1–3 hari kerja setelah semua berkas lengkap. Tim kami akan menghubungi Anda melalui WhatsApp untuk konfirmasi selanjutnya." },
  { q: "Apa saja dokumen yang diperlukan?", a: "Dokumen wajib: KTP, SIM (sesuai posisi), dan Pas Photo. Dokumen opsional: SKCK, Surat Sehat, dan Paklaring. Semua dokumen diupload secara online." },
  { q: "Bagaimana jika saya belum punya SKCK?", a: "SKCK bersifat opsional pada saat pendaftaran. Anda tetap bisa mendaftar tanpa SKCK. Namun, SKCK mungkin diperlukan saat proses penempatan kerja." },
  { q: "Di kota mana saja penempatan tersedia?", a: "Saat ini kami memiliki penempatan di 25+ kota besar di seluruh Indonesia, termasuk Jabodetabek, Bandung, Surabaya, Semarang, Medan, Makassar, dan masih banyak lagi." },
  { q: "Bagaimana cara mengecek status lamaran?", a: "Anda bisa mengecek status lamaran langsung melalui halaman pendaftaran menggunakan NIK yang terdaftar. Status akan diperbarui secara real-time oleh tim admin kami." },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal>
          <p className="text-bas-400 text-sm font-medium tracking-widest uppercase mb-3 text-center">FAQ</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-14">Pertanyaan Umum</h2>
        </ScrollReveal>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.06}>
              <div className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/40 shrink-0 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-white/40 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
