// Envoi d'e-mails transactionnels par SMTP avec Nodemailer.
//
// Configuration (variables d'environnement) :
//   SMTP_HOST      serveur SMTP, ex. ssl0.ovh.net (e-mail OVH)
//   SMTP_PORT      465 (SSL, par défaut) ou 587 (STARTTLS)
//   SMTP_USER      identifiant, en général l'adresse complète (ex. notifications@greniercommunautaire.org)
//   SMTP_PASSWORD  mot de passe de cette adresse
//   EMAIL_FROM     expéditeur affiché, ex. « Grenier Communautaire <notifications@greniercommunautaire.org> »
//                  (par défaut : SMTP_USER)
//   SITE_URL       adresse publique du site, ex. https://www.greniercommunautaire.org
// Sans SMTP_HOST / SMTP_USER / SMTP_PASSWORD, aucun e-mail n'est envoyé (simple trace en console).
//
// Un échec d'envoi ne doit jamais faire échouer l'action qui l'a déclenché : les erreurs sont
// journalisées et avalées.

import { headers } from "next/headers";
import nodemailer, { type Transporter } from "nodemailer";

export const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

let transporter: Transporter | undefined;

function getTransporter() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return (transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 : SSL direct ; 587 : STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }));
}

/** Adresse publique du site : SITE_URL, sinon déduite de la requête en cours. */
export async function siteUrl(): Promise<string> {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Prévient un demandeur qu'il a du nouveau dans son espace. Le contenu ne reprend volontairement
 * aucun détail de la demande (données sensibles) : seulement un lien vers l'espace connecté.
 */
export async function sendRequesterNotification(to: string, subject: string, intro: string, path: string) {
  const link = `${await siteUrl()}${path}`;
  if (!isEmailConfigured) {
    console.info("[email] SMTP non configuré : notification non envoyée.");
    return;
  }
  const text = `Bonjour,\n\n${intro}\n\nConsultez-la dans votre espace : ${link}\n\nL'équipe du Grenier Communautaire\n\nCet e-mail vous est envoyé automatiquement, merci de ne pas y répondre.`;
  const html = `<p>Bonjour,</p><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#b0124f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Ouvrir mon espace</a></p><p>L'équipe du Grenier Communautaire</p><p style="color:#888;font-size:12px">Cet e-mail vous est envoyé automatiquement, merci de ne pas y répondre.</p>`;
  try {
    await getTransporter().sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  } catch (e) {
    console.error("[email] envoi impossible", e);
  }
}
