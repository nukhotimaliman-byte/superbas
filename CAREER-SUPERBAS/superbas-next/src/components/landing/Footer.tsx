import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bas-500 to-accent-blue flex items-center justify-center font-display font-bold text-xs">
              BAS
            </div>
            <span className="font-display font-semibold text-sm">Super-BAS</span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Kebijakan Privasi
            </Link>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/30">
            &copy; 2026 PT Barokah Amanah Sentosa — Vendor Outsourcing & Penyedia Tenaga Kerja Logistik Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
