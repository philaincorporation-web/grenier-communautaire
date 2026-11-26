"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";

type Toast = { id: number; title: string; body: string; url: string };

const DURATION_MS = 12_000;

/** Petit carillon à deux notes, joué sans fichier audio (Web Audio). */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // Son bloqué par le navigateur (aucune interaction avec la page) : la bulle s'affiche quand même.
  }
}

/** Seules les pages du site sont ouvertes, jamais une URL externe venue du message. */
function safePath(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin ? `${u.pathname}${u.search}` : "/demarrer";
  } catch {
    return "/demarrer";
  }
}

/**
 * Bulle de notification dans la page quand une notification push arrive alors que le site est
 * ouvert : son, titre, message et bouton « Consulter ». Le service worker envoie le message.
 */
export function PushToast() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const d = event.data as { type?: string; title?: string; body?: string; url?: string } | null;
      if (d?.type !== "push") return;
      const toast: Toast = { id: ++nextId.current, title: d.title ?? "Grenier Communautaire", body: d.body ?? "", url: safePath(d.url ?? "/demarrer") };
      setToasts((list) => [...list.slice(-2), toast]); // 3 bulles au plus
      playChime();
      router.refresh(); // met à jour la cloche, les pastilles et les listes
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== toast.id)), DURATION_MS);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  const dismiss = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-96">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto w-full animate-[toast-in_.25s_ease-out] overflow-hidden rounded-xl border border-line bg-white shadow-xl"
        >
          <div className="flex gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <BellRing className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-muted">{t.body}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismiss(t.id);
                    router.push(t.url);
                  }}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Consulter
                </button>
                <button type="button" onClick={() => dismiss(t.id)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface">
                  Fermer
                </button>
              </div>
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer la notification" className="self-start rounded-md p-1 text-muted hover:bg-surface hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="h-1 origin-left animate-[toast-timer_12s_linear_forwards] bg-brand" />
        </div>
      ))}
    </div>
  );
}
