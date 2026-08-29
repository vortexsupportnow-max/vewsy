import { ProfileEditor } from "@/components/profile-editor";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Modifica profilo — Vewsy" };

export default function EditProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-semibold">Il tuo profilo</h1>
        <p className="mt-1 text-muted">Le modifiche sono pubbliche appena salvi.</p>
        <ProfileEditor />
      </main>
    </>
  );
}
