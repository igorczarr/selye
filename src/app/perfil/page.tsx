import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { ProfileView } from "@/components/profile/profile-view";
import { getProfileData } from "@/actions/profile";

export const instant = false;

async function ProfileLoader() {
  const data = await getProfileData();
  return <ProfileView data={data} />;
}

function ProfileSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 max-w-3xl mx-auto w-full"
      aria-busy="true"
      aria-label="Carregando perfil"
    >
      <div className="skeleton h-28 w-full" />
      <div className="skeleton h-56 w-full" />
      <div className="skeleton h-44 w-full" />
      <div className="skeleton h-56 w-full" />
    </div>
  );
}

export default function PerfilPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-7 sm:py-9 flex-1">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileLoader />
        </Suspense>
      </main>
    </div>
  );
}
