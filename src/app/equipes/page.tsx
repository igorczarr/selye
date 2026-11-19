import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { TeamsManager } from "@/components/teams/teams-manager";
import { getAllTeams } from "@/actions/teams";

export const instant = false;

async function TeamsLoader() {
  const teams = await getAllTeams();
  return <TeamsManager teams={teams} />;
}

function TeamsSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando equipes esportivas"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-56" />
        <div className="skeleton h-56" />
      </div>
    </div>
  );
}

export default function EquipesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<TeamsSkeleton />}>
          <TeamsLoader />
        </Suspense>
      </main>
    </div>
  );
}
