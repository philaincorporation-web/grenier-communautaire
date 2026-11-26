"use client";

import { useRef, useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { MESSAGE_MAX } from "@/lib/requester-shared";

type Result = { ok: boolean; message: string };

/**
 * Zone de réponse d'un fil de demande. L'action est fournie par l'appelant : réponse du demandeur
 * (Mon espace) ou de l'équipe (tableau de bord).
 */
export function ReplyForm({
  onSend,
  placeholder = "Écrivez votre message…",
  submitLabel = "Envoyer",
  hint,
}: {
  onSend: (body: string) => Promise<Result>;
  placeholder?: string;
  submitLabel?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setResult(null);
    startTransition(async () => {
      try {
        const r = await onSend(body);
        setResult(r);
        if (r.ok) setText("");
      } catch {
        setResult({ ok: false, message: "Le message n'a pas pu être envoyé. Réessayez." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MESSAGE_MAX}
        rows={3}
        required
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${result ? (result.ok ? "text-green-700" : "text-red-700") : "text-muted"}`} role={result ? "status" : undefined}>
          {result?.message ?? hint}
        </p>
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
