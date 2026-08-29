import { Discovery } from "@/components/discovery";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <section className="mb-12 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Un link per i tuoi social.
            <br />
            <span className="text-accent">Un motore per trovare gli altri.</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Vewsy raccoglie i profili di streamer, musicisti, illustratori e creator —
            e ti permette di cercarli per categoria, tag e città.
          </p>
        </section>

        <Discovery />
      </main>
      <footer className="border-t border-muted/12 px-5 py-8 text-center text-sm text-muted">
        Vewsy — trova le persone, non gli algoritmi.
      </footer>
    </>
  );
}
