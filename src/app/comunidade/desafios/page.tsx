import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { ChallengesView } from "@/components/network/challenges-view";
import { getChallenges } from "@/actions/challenges";

export const instant = false;

async function ChallengesLoader() {
  const challenges = await getChallenges();
  return <ChallengesView initialChallenges={challenges} />;
}

function ChallengesSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full"
      aria-busy="true"
      aria-label="Carregando desafios"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="skeleton h-48 w-full" />
      <div className="skeleton h-48 w-full" />
    </div>
  );
}

export default function DesafiosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<ChallengesSkeleton />}>
          <ChallengesLoader />
        </Suspense>
      </main>
    </div>
  );
}
