import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PT Barokah Amanah Sentosa (BAS) — Vendor Outsourcing & Rekrutmen Logistik",
    template: "%s | Super-BAS",
  },
  description:
    "PT Barokah Amanah Sentosa (BAS) — Vendor outsourcing & penyedia tenaga kerja logistik terpercaya. Rekrutmen Driver, Kurir, Daily Worker di seluruh Indonesia. 100% GRATIS.",
  keywords: [
    "PT Barokah Amanah Sentosa",
    "vendor BAS",
    "outsourcing logistik",
    "penyedia tenaga kerja",
    "lowongan driver",
    "lowongan kurir",
    "daily worker",
    "rekrutmen",
    "manpower supply",
  ],
  authors: [{ name: "PT Barokah Amanah Sentosa" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://super-bas.com",
    siteName: "Super-BAS",
    title: "PT Barokah Amanah Sentosa — Vendor Outsourcing & Rekrutmen Logistik",
    description:
      "Vendor outsourcing & penyedia tenaga kerja logistik terpercaya. 100% GRATIS.",
    images: [{ url: "/BAS.svg", width: 512, height: 512 }],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://super-bas.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bas-950 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
