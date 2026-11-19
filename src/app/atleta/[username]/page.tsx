import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { AthleteProfileView } from "@/components/network/athlete-profile-view";
import { getAthleteProfile } from "@/actions/network";

export const instant = false;

async function AthleteProfileLoader({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const data = await getAthleteProfile(decodedUsername);

  if (!data) {
    notFound();
  }

  return <AthleteProfileView data={data} />;
}

export default function AtletaProfilePage(props: {
  params: Promise<{ username: string }>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense
          fallback={
            <div className="space-y-6" aria-busy="true">
              <div className="skeleton h-48 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="skeleton h-64" />
                <div className="skeleton h-64 md:col-span-2" />
              </div>
            </div>
          }
        >
          <AthleteProfileLoader params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
