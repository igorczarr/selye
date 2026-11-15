import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";
import { getPerformanceOverview } from "@/actions/performance";

export const instant = false;

async function PerformanceLoader() {
  const data = await getPerformanceOverview();
  return <PerformanceDashboard data={data} />;
}

function PerformanceSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Calculando indicadores de performance"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-8 w-72" />
          <div className="skeleton h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
      </div>
      <div className="skeleton h-44 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-56 w-full" />
    </div>
  );
}

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<PerformanceSkeleton />}>
          <PerformanceLoader />
        </Suspense>
      </main>
    </div>
  );
}
