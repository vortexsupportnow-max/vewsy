import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Accedi — Vewsy" };

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-sm flex-1 px-5 py-16">
        <AuthForm />
      </main>
    </>
  );
}
