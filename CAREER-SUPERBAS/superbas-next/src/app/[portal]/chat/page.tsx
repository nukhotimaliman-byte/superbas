"use client";

import { use, useState, useRef, useEffect } from "react";
import { getPortalConfig } from "@/lib/portal-config";
import { Send, Paperclip } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "admin";
  time: string;
}

export default function ChatPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = use(params);
  const config = getPortalConfig(portal);
  if (!config) return null;

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages] = useState<Message[]>([
    { id: 1, text: "Halo, selamat datang di Super-BAS! Ada yang bisa dibantu?", sender: "admin", time: "09:00" },
    { id: 2, text: "Saya mau tanya soal jadwal kerja bulan depan", sender: "user", time: "09:05" },
    { id: 3, text: "Jadwal kerja bulan Juni sudah tersedia di dashboard. Silakan cek tab Beranda untuk melihat detail penempatan Anda.", sender: "admin", time: "09:06" },
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-7rem)]">
      {/* Chat header */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center font-display font-bold text-sm`}>
          A
        </div>
        <div>
          <p className="font-medium text-sm">Admin BAS</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.sender === "user"
                  ? `bg-gradient-to-r ${config.gradient} text-white`
                  : "glass"
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.sender === "user" ? "text-white/50" : "text-white/30"}`}>
                {m.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-2 flex items-center gap-2 mt-3">
        <button className="p-2 text-white/30 hover:text-white/60 transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-white/20 px-2"
        />
        <button
          className={`p-2.5 rounded-xl bg-gradient-to-r ${config.gradient} transition-transform active:scale-95`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
