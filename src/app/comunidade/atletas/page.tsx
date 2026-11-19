import { Suspense } from "react";
import { connection } from "next/server";
import { Navbar } from "@/components/navigation/navbar";
import { AthletesDiscoveryView } from "@/components/network/athletes-discovery-view";
import { getAthletesDiscovery } from "@/actions/network";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const instant = false;

async function AthletesLoader() {
  await connection();
  const [athletes, allSports] = await Promise.all([
    getAthletesDiscovery(),
    db
      .select({ code: schema.sports.code, namePt: schema.sports.namePt })
      .from(schema.sports),
  ]);

  return (
    <AthletesDiscoveryView initialAthletes={athletes} sports={allSports} />
  );
}

function AthletesSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full"
      aria-busy="true"
      aria-label="Carregando atletas"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="skeleton h-16 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-44" />
        <div className="skeleton h-44" />
        <div className="skeleton h-44" />
        <div className="skeleton h-44" />
      </div>
    </div>
  );
}

export default function AtletasPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense fallback={<AthletesSkeleton />}>
          <AthletesLoader />
        </Suspense>
      </main>
    </div>
  );
}
