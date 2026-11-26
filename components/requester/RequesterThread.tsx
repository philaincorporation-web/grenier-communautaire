"use client";

import { useEffect } from "react";
import { markRequestRead, sendRequesterMessage } from "@/lib/actions/requester";
import type { WorkflowType } from "@/lib/online-requests-shared";
import { ReplyForm } from "./ReplyForm";

/** Réponse du demandeur + lecture des notifications de la demande à l'ouverture. */
export function RequesterThread({ type, id, hasUnread }: { type: WorkflowType; id: string; hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) markRequestRead(type, id).catch(() => {});
  }, [type, id, hasUnread]);

  return (
    <ReplyForm
      onSend={(body) => sendRequesterMessage(type, id, body)}
      placeholder="Écrire à l'équipe…"
      hint="L'équipe est prévenue de votre message et vous répond ici."
    />
  );
}
