import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { CoachDashboard } from "@/components/coach/coach-dashboard";
import { getCoachDashboardData } from "@/actions/coach";
import { requireRole } from "@/lib/auth-role";

export const instant = false;

async function CoachLoader() {
  await requireRole("coach");
  const data = await getCoachDashboardData();
  return <CoachDashboard data={data} />;
}

function CoachSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando painel do treinador"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-52 w-full" />
      <div className="skeleton h-52 w-full" />
    </div>
  );
}

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense fallback={<CoachSkeleton />}>
          <CoachLoader />
        </Suspense>
      </main>
    </div>
  );
}
