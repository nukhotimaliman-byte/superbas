// src/lib/api.ts — PHP API connector for hybrid architecture
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://super-bas.com";

export type Portal = "daily-worker" | "driver" | "kurir";

export async function apiCall<T = Record<string, unknown>>(
  portal: Portal,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}/${portal}/api/${endpoint}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export function getPortalLabel(portal: Portal): string {
  const labels: Record<Portal, string> = {
    "daily-worker": "Daily Worker",
    driver: "Driver",
    kurir: "Kurir",
  };
  return labels[portal];
}

export function getPortalColor(portal: Portal): string {
  const colors: Record<Portal, string> = {
    "daily-worker": "#7c3aed",
    driver: "#3b82f6",
    kurir: "#06b6d4",
  };
  return colors[portal];
}
