import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { ChallengesView } from "@/components/network/challenges-view";
import { getChallenges } from "@/actions/challenges";

export const instant = false;

async function ChallengesLoader() {
  const challenges = await getChallenges();
  return <ChallengesView initialChallenges={challenges} />;
}

export default function DesafiosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando desafios da comunidade...
            </div>
          }
        >
          <ChallengesLoader />
        </Suspense>
      </main>
    </div>
  );
}