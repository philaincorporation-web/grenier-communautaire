"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { removeAvatar, updateAvatar } from "@/lib/actions/profile";
import { AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE } from "@/lib/avatar-shared";

/** Recadre l'image au centre en carré et la réduit à AVATAR_SIZE px (WebP, sinon JPEG). */
async function toAvatarDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // fond blanc pour les PNG transparents convertis en JPEG
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarEditor({ initials, src }: { initials: string; src: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Ferme le menu au clic extérieur ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Le message de résultat disparaît après quelques secondes.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setOpen(false);
    startTransition(async () => {
      const r = await action();
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  }

  function onFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ""; // permet de choisir à nouveau le même fichier
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage({ ok: false, text: "Choisissez une image (JPEG, PNG ou WebP)." });
    if (file.size > AVATAR_MAX_UPLOAD_BYTES) return setMessage({ ok: false, text: "Image trop lourde (15 Mo maximum)." });
    run(async () => {
      try {
        return await updateAvatar(await toAvatarDataUrl(file));
      } catch {
        return { ok: false, message: "Cette image n'a pas pu être lue. Essayez un fichier JPEG ou PNG." };
      }
    });
  }

  const item = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => (src ? setOpen((o) => !o) : inputRef.current?.click())}
        aria-label="Modifier la photo de profil"
        aria-haspopup={src ? "menu" : undefined}
        aria-expanded={src ? open : undefined}
        title="Modifier la photo de profil"
        className="group relative grid size-9 place-items-center overflow-hidden rounded-full bg-brand-soft text-sm font-bold text-brand outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- image privée servie par l'API, déjà au bon format
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          initials
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-4" />
        </span>
        {pending && (
          <span className="absolute inset-0 grid place-items-center bg-black/50 text-white">
            <LoaderCircle className="size-4 animate-spin" />
          </span>
        )}
      </button>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-lg border border-line bg-white p-1 shadow-lg">
          <button type="button" role="menuitem" className={item} onClick={() => inputRef.current?.click()}>
            <ImageUp className="size-4 text-muted" /> Changer la photo
          </button>
          <button type="button" role="menuitem" className={`${item} text-red-700`} onClick={() => run(removeAvatar)}>
            <Trash2 className="size-4" /> Retirer la photo
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`absolute bottom-full left-0 z-20 mb-2 w-56 rounded-lg px-3 py-2 text-xs shadow-lg ${
            message.ok ? "bg-brand-soft text-brand-dark" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
