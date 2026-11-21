import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import {
  EvolutionHub,
  type EvolutionTab,
} from "@/components/evolution/evolution-hub";
import { getEvolutionData } from "@/actions/evolution";

export const instant = false;

const VALID_TABS = new Set<EvolutionTab>([
  "hoje",
  "ritmo",
  "carga",
  "forca",
  "consistencia",
  "historico",
]);

async function EvolutionLoader({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const rawTab = resolved.tab as EvolutionTab | undefined;
  const initialTab: EvolutionTab =
    rawTab && VALID_TABS.has(rawTab) ? rawTab : "hoje";

  const data = await getEvolutionData();
  return <EvolutionHub data={data} initialTab={initialTab} />;
}

function EvolutionSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando hub de evolução"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-48 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
    </div>
  );
}

export default function EvolucaoPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense fallback={<EvolutionSkeleton />}>
          <EvolutionLoader searchParams={props.searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
