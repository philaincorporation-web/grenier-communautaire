import Link from "next/link";
import { HandHeart, Heart } from "lucide-react";
import { VolunteerForm } from "@/components/site/forms/VolunteerForm";
import { categoryIcon } from "@/lib/category-icons";
import { donationCategories } from "@/lib/site-content";

/**
 * Bloc divisé « Faire un don / Devenir bénévole ».
 * Les dons financiers sont hors périmètre du modèle de données : on oriente vers les dons
 * en nature, par catégorie (alignées sur product_categories).
 */
export function DonateVolunteerSplit() {
  return (
    <section className="grid lg:grid-cols-2">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#1d1f2b_0%,#3a1f2a_100%)] px-4 py-14 text-white sm:px-10 lg:py-20 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-14">
        <HandHeart className="pointer-events-none absolute -bottom-6 right-4 size-56 text-white/5" strokeWidth={1} />
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Agir maintenant</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Votre don change des vies</h2>
          <p className="mt-3 text-white/80">
            Chaque don en nature est réceptionné, trié et redistribué aux familles accompagnées. Choisissez ce que vous
            souhaitez donner :
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {donationCategories.map((c) => {
              const Icon = categoryIcon(c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/faire-un-don#${c.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-3.5 py-2 text-sm font-semibold transition hover:border-brand hover:bg-brand"
                  >
                    <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" /> {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/faire-un-don"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold shadow-md transition hover:bg-brand-dark"
          >
            Faire un don <Heart className="size-4 fill-current" />
          </Link>
        </div>
      </div>

      <div className="bg-brand px-4 py-14 text-white sm:px-10 lg:py-20 lg:pl-14 lg:pr-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Rejoignez les Relais</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Devenez bénévole</h2>
          <p className="mb-6 mt-3 text-white/85">
            Rejoignez une équipe engagée près de chez vous : collecte, tri, distribution ou boutique solidaire.
          </p>
          <VolunteerForm compact />
        </div>
      </div>
    </section>
  );
}
