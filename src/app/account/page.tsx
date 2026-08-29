import { AccountSettings } from "@/components/account-settings";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Account — Vewsy" };

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-muted">Email, password e metodi di accesso.</p>
        <AccountSettings />
      </main>
    </>
  );
}
