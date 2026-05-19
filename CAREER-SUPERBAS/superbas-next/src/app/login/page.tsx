"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Portal } from "@/lib/api";

const portals: { id: Portal; label: string; color: string }[] = [
  { id: "daily-worker", label: "Daily Worker", color: "from-purple-500 to-violet-600" },
  { id: "driver", label: "Driver", color: "from-blue-500 to-blue-600" },
  { id: "kurir", label: "Kurir", color: "from-cyan-500 to-teal-600" },
];

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>("daily-worker");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // Form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const action = tab === "login" ? "login" : "register";
      const body =
        tab === "login"
          ? { username, password }
          : { username, password, name, phone };

      const res = await fetch(
        `https://super-bas.com/${portal}/api/user-auth.php?action=${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } else {
        window.location.href = `/${portal}`;
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Animated Gradient Art */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-bas-950" />
        <div className="absolute inset-0 mesh-animated" />

        {/* Floating orbs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-bas-500/20 to-accent-blue/10 blur-3xl"
          animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-56 h-56 rounded-full bg-gradient-to-br from-accent-cyan/15 to-bas-400/10 blur-3xl"
          animate={{ x: [0, -40, 20, 0], y: [0, 30, -50, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut", delay: 2 }}
        />

        {/* Center content */}
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display font-bold text-2xl mx-auto mb-6 shadow-2xl shadow-bas-500/30">
            BAS
          </div>
          <h2 className="font-display text-3xl font-bold mb-3">Super-BAS</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
            Platform rekrutmen terpadu PT Barokah Amanah Sentosa. Driver, Kurir, Daily Worker.
          </p>
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-bas-950 lg:bg-bas-950/50" />

        <motion.div
          className={`relative z-10 w-full max-w-md ${shake ? "animate-[shake_0.5s]" : ""}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back to home */}
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-8 transition-colors">
            ← Kembali ke Beranda
          </Link>

          {/* Portal Selector */}
          <div className="flex gap-2 mb-8">
            {portals.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPortal(p.id); setError(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  portal === p.id
                    ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                    : "glass text-white/40 hover:text-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Glass Card */}
          <div className="glass-strong rounded-3xl p-8">
            {/* Heading */}
            <h1 className="font-display text-2xl font-bold mb-1">
              {tab === "login" ? "Selamat Datang" : "Buat Akun Baru"}
            </h1>
            <p className="text-white/40 text-sm mb-6">
              {tab === "login"
                ? "Masuk ke dashboard " + portals.find((p) => p.id === portal)?.label
                : "Daftar sebagai " + portals.find((p) => p.id === portal)?.label}
            </p>

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-white/5 p-1 mb-6">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    tab === t ? "bg-bas-600 text-white shadow" : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {t === "login" ? "Masuk" : "Buat Akun"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {tab === "register" && (
                  <motion.div
                    key="register-fields"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 transition-colors placeholder:text-white/20"
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">No. WhatsApp</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 transition-colors placeholder:text-white/20"
                        placeholder="08xxxxxxxxxx"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs text-white/40 mb-1.5">Username / NIK</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bas-500 transition-colors placeholder:text-white/20"
                  placeholder="Masukkan username atau NIK"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-xs text-white/40 mb-1.5">Password</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-bas-500 transition-colors placeholder:text-white/20"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-[34px] text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {tab === "login" && (
                <div className="text-right">
                  <button type="button" className="text-xs text-bas-400 hover:text-bas-300 transition-colors">
                    Lupa Password?
                  </button>
                </div>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl py-2"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {tab === "login" ? "Masuk" : "Daftar Sekarang"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">atau</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign In */}
            <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Masuk dengan Google
            </button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-white/20 mt-6">
            &copy; 2026 PT Barokah Amanah Sentosa
          </p>
        </motion.div>
      </div>

      {/* Shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
    </div>
  );
}
