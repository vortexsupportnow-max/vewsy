import { Onboarding } from "@/components/onboarding";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Benvenuto — Vewsy" };

export default function WelcomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-12">
        <Onboarding />
      </main>
    </>
  );
}
