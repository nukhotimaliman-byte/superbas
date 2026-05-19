"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-bas-950/80 backdrop-blur-xl border-b border-white/5 py-3" : "py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display font-bold text-sm">
            BAS
          </div>
          <span className="font-display font-semibold text-lg hidden sm:block">Super-BAS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#about" className="hover:text-white transition-colors">Tentang</a>
          <a href="#lowongan" className="hover:text-white transition-colors">Lowongan</a>
          <a href="#keunggulan" className="hover:text-white transition-colors">Keunggulan</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <Link
          href="/login"
          className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium relative z-10"
        >
          <span className="relative z-10">Masuk</span>
        </Link>
      </div>
    </header>
  );
}
