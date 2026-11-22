import { Send } from "lucide-react";
import { NewsletterForm } from "@/components/site/forms/NewsletterForm";

export function NewsletterBand() {
  return (
    <section className="bg-[linear-gradient(100deg,#1d1f2b_0%,#5a1a35_50%,#b0124f_100%)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Send className="hidden size-12 shrink-0 -rotate-12 text-white/80 sm:block" strokeWidth={1.25} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Restons en contact</p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Abonnez-vous à notre lettre d&apos;information</h2>
            <p className="mt-1 text-sm text-white/80">Collectes, distributions et histoires de solidarité, une fois par mois.</p>
          </div>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
