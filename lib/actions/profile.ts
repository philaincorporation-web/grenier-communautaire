"use server";

// Photo de profil de l'utilisateur connecté. Chaque compte ne modifie que la sienne : l'identifiant
// vient toujours de la session, jamais du navigateur.

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userAvatars } from "@/db/schema";
import { getAuth } from "@/lib/auth/server";
import { AVATAR_MAX_BYTES, type AvatarResult } from "@/lib/avatar-shared";

const FAILED: AvatarResult = { ok: false, message: "La photo n'a pas pu être enregistrée. Réessayez." };

async function sessionUserId() {
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  return user?.emailVerified ? user.id : null;
}

/** Vérifie que le contenu correspond bien au type annoncé (signature du fichier). */
function hasSignature(mime: string, bytes: Buffer) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function updateAvatar(dataUrl: string): Promise<AvatarResult> {
  const userId = await sessionUserId();
  if (!userId) return { ok: false, message: "Session expirée. Reconnectez-vous." };

  const match = typeof dataUrl === "string" ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl) : null;
  if (!match) return { ok: false, message: "Format d'image non pris en charge." };
  const [, mimeType, data] = match;
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES) return { ok: false, message: "Image trop volumineuse." };
  if (!hasSignature(mimeType, bytes)) return { ok: false, message: "Ce fichier n'est pas une image valide." };

  try {
    const now = new Date();
    await getDb()
      .insert(userAvatars)
      .values({ authUserId: userId, mimeType, data, updatedAt: now })
      .onConflictDoUpdate({ target: userAvatars.authUserId, set: { mimeType, data, updatedAt: now } });
  } catch (e) {
    console.error("[profile] avatar", e);
    return FAILED;
  }
  revalidatePath("/tableau-de-bord", "layout");
  return { ok: true, message: "Photo de profil mise à jour." };
}

export async function removeAvatar(): Promise<AvatarResult> {
  const userId = await sessionUserId();
  if (!userId) return { ok: false, message: "Session expirée. Reconnectez-vous." };
  try {
    await getDb().delete(userAvatars).where(eq(userAvatars.authUserId, userId));
  } catch (e) {
    console.error("[profile] avatar remove", e);
    return FAILED;
  }
  revalidatePath("/tableau-de-bord", "layout");
  return { ok: true, message: "Photo de profil retirée." };
}
