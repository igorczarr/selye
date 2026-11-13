import { notFound } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { AthleteProfileView } from "@/components/network/athlete-profile-view";
import { getAthleteProfile } from "@/actions/network";

export const instant = false;

export default async function AtletaProfilePage(props: {
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;
  const decodedUsername = decodeURIComponent(params.username);
  const data = await getAthleteProfile(decodedUsername);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <AthleteProfileView data={data} />
      </main>
    </div>
  );
}