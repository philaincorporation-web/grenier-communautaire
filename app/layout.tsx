import type { Metadata, Viewport } from "next";
import { Inter, Caveat } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: {
    default: "Grenier Communautaire — Faire du bien, chaque jour",
    template: "%s · Grenier Communautaire",
  },
  description:
    "Collecter, trier et redistribuer des biens utiles pour construire une société plus solidaire.",
  applicationName: "Grenier Communautaire",
  // Application installée sur iPhone/iPad (« Ajouter à l'écran d'accueil »).
  appleWebApp: { capable: true, title: "Grenier", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#b0124f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
