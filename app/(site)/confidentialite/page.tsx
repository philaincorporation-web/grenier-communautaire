import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      sections={[
        { h: "Données collectées", p: "Formulaires de contact, de bénévolat, de demande d'aide et d'inscription à la lettre d'information : uniquement les informations nécessaires au traitement de votre demande." },
        { h: "Données des bénéficiaires", p: "Les informations relatives aux personnes accompagnées sont réservées à l'équipe habilitée, ne sont jamais publiées et ne sont pas transmises à des tiers. La durée de conservation et les pièces justificatives exigées restent à définir." },
        { h: "Vos droits", p: "Vous pouvez demander l'accès, la rectification ou la suppression de vos données en nous écrivant via la page Contact." },
      ]}
    />
  );
}
