import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { EnergeticCalendarHub } from "@/components/planning/energetic-calendar-hub";
import { getActivePlanningSnapshot } from "@/actions/planning";

export const instant = false;

async function CalendarLoader() {
  const snapshot = await getActivePlanningSnapshot();
  return <EnergeticCalendarHub snapshot={snapshot} />;
}

function CalendarSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando calendário energético"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-44" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="skeleton h-10 w-44" />
      </div>
      <div className="bento-grid">
        <div className="skeleton col-span-12 xl:col-span-7 h-64" />
        <div className="skeleton col-span-12 xl:col-span-5 h-64" />
      </div>
      <div className="skeleton h-44 w-full" />
      <div className="bento-grid">
        <div className="skeleton col-span-12 xl:col-span-8 h-96" />
        <div className="skeleton col-span-12 xl:col-span-4 h-96" />
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-7 sm:py-9 flex-1">
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarLoader />
        </Suspense>
      </main>
    </div>
  );
}
