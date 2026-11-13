import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { ProfileView } from "@/components/profile/profile-view";
import { getProfileData } from "@/actions/profile";

export const instant = false;

async function ProfileLoader() {
  const data = await getProfileData();
  return <ProfileView data={data} />;
}

export default function PerfilPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando dados de perfil...
            </div>
          }
        >
          <ProfileLoader />
        </Suspense>
      </main>
    </div>
  );
}
