import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      sections={[
        { h: "Éditeur du site", p: "Grenier Communautaire — association. Adresse, numéro d'enregistrement et responsable de la publication à compléter." },
        { h: "Hébergement", p: "Nom, adresse et contact de l'hébergeur à compléter." },
        { h: "Propriété intellectuelle", p: "Les contenus, logos et photographies de ce site sont la propriété de l'association, sauf mention contraire." },
      ]}
    />
  );
}
