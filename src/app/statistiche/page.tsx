import { SiteHeader } from "@/components/site-header";
import { StatsPanel } from "@/components/stats-panel";

export const metadata = { title: "Statistiche — Vewsy" };

export default function StatsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-semibold">Statistiche</h1>
        <p className="mt-1 text-muted">Quanto viene visto il tuo profilo, e cosa ci si clicca.</p>
        <StatsPanel />
      </main>
    </>
  );
}
