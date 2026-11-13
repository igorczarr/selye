import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { TeamsManager } from "@/components/teams/teams-manager";
import { getAllTeams } from "@/actions/teams";

export const instant = false;

async function TeamsLoader() {
  const teams = await getAllTeams();
  return <TeamsManager teams={teams} />;
}

export default function EquipesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando equipes esportivas...
            </div>
          }
        >
          <TeamsLoader />
        </Suspense>
      </main>
    </div>
  );
}
