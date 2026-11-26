"use client";

import { replyToOnlineRequest } from "@/lib/actions/online-requests";
import type { WorkflowType } from "@/lib/online-requests-shared";
import { ReplyForm } from "@/components/requester/ReplyForm";

/** Réponse de l'équipe au demandeur, depuis la carte d'une demande en ligne. */
export function StaffReply({ type, id, hasEmail }: { type: WorkflowType; id: string; hasEmail: boolean }) {
  return (
    <ReplyForm
      onSend={async (body) => {
        const r = await replyToOnlineRequest(type, id, body);
        return r.ok ? { ok: true, message: "Réponse envoyée." } : r;
      }}
      placeholder="Répondre au demandeur…"
      submitLabel="Répondre"
      hint={
        hasEmail
          ? "Le demandeur la verra dans son espace et sera prévenu par e-mail."
          : "Pas d'e-mail sur cette demande : la réponse sera visible si le demandeur la rattache à son compte. Appelez-le si besoin."
      }
    />
  );
}
