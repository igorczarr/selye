import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";
import { getPerformanceOverview } from "@/actions/performance";

export const instant = false;

async function PerformanceLoader() {
  const data = await getPerformanceOverview();
  return <PerformanceDashboard data={data} />;
}

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Calculando indicadores de carga e fisiologia adaptativa...
            </div>
          }
        >
          <PerformanceLoader />
        </Suspense>
      </main>
    </div>
  );
}