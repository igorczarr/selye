import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { RoutinesHub } from "@/components/routines/routines-hub";
import { getDashboardData } from "@/actions/workout";
import { getAthleteModalityContextForRoutines } from "@/actions/routines";

export const instant = false;

async function RoutinesList() {
  const [data, athleteCtx] = await Promise.all([
    getDashboardData(),
    getAthleteModalityContextForRoutines(),
  ]);
  return (
    <RoutinesHub
      routines={data.routines}
      activeSession={data.activeSession}
      todayCompletedSessions={data.todayCompletedSessions}
      athletePrimaryModality={athleteCtx.primaryModality}
      experienceLevel={athleteCtx.experienceLevel}
    />
  );
}

function RoutinesSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando rotinas"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-10 w-36" />
      </div>
      <div className="skeleton h-14 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}

export default function TreinosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-7 sm:py-9 flex-1">
        <Suspense fallback={<RoutinesSkeleton />}>
          <RoutinesList />
        </Suspense>
      </main>
    </div>
  );
}
