// Portal-specific configuration
import { type Portal } from "./api";

export interface PortalConfig {
  id: Portal;
  label: string;
  color: string;
  gradient: string;
  tabs: TabConfig[];
}

export interface TabConfig {
  id: string;
  label: string;
  icon: string; // lucide icon name
  href: string;
}

const sharedTabs: TabConfig[] = [
  { id: "home", label: "Beranda", icon: "home", href: "" },
  { id: "berkas", label: "Berkas", icon: "file-text", href: "/berkas" },
  { id: "absensi", label: "Absensi", icon: "camera", href: "/absensi" },
  { id: "chat", label: "Chat", icon: "message-circle", href: "/chat" },
  { id: "slipgaji", label: "Slip Gaji", icon: "receipt", href: "/slipgaji" },
  { id: "idcard", label: "ID Card", icon: "credit-card", href: "/idcard" },
  { id: "lokasi", label: "Lokasi DC", icon: "map-pin", href: "/lokasi" },
  { id: "rekening", label: "Rekening", icon: "landmark", href: "/rekening" },
  { id: "gantirek", label: "Ganti Rek", icon: "refresh-cw", href: "/gantirek" },
  { id: "aduan", label: "Aduan", icon: "alert-triangle", href: "/aduan" },
  { id: "settings", label: "Pengaturan", icon: "settings", href: "/settings" },
];

export const portalConfigs: Record<Portal, PortalConfig> = {
  "daily-worker": {
    id: "daily-worker",
    label: "Daily Worker",
    color: "#7c3aed",
    gradient: "from-purple-500 to-violet-600",
    tabs: sharedTabs,
  },
  driver: {
    id: "driver",
    label: "Driver",
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600",
    tabs: sharedTabs,
  },
  kurir: {
    id: "kurir",
    label: "Kurir",
    color: "#06b6d4",
    gradient: "from-cyan-500 to-teal-600",
    tabs: sharedTabs,
  },
};

export function getPortalConfig(portal: string): PortalConfig | null {
  if (portal in portalConfigs) return portalConfigs[portal as Portal];
  return null;
}
