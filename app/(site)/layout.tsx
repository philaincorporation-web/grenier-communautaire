import { NavigationProgress } from "@/components/loading/NavigationProgress";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteRadialMenu } from "@/components/site/SiteRadialMenu";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavigationProgress />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SiteRadialMenu />
    </>
  );
}
