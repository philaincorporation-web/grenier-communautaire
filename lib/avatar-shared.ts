/** Côté du carré de la photo de profil après réduction dans le navigateur (en pixels). */
export const AVATAR_SIZE = 256;

/** Taille maximale acceptée par le serveur pour l'image réduite (300 Ko). */
export const AVATAR_MAX_BYTES = 300 * 1024;

/** Taille maximale du fichier choisi par l'utilisateur, avant réduction (15 Mo). */
export const AVATAR_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type AvatarResult = { ok: boolean; message: string };

/** URL de la photo d'un compte ; `v` change à chaque mise à jour pour contourner le cache. */
export const avatarUrl = (authUserId: string, updatedAt: Date) =>
  `/api/avatar/${encodeURIComponent(authUserId)}?v=${updatedAt.getTime()}`;
