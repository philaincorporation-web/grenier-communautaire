import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface px-4 py-12">
      <Link href="/" aria-label="Retour à l'accueil">
        <Logo priority />
      </Link>
      {children}
    </main>
  );
}
