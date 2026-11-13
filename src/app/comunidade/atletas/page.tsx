import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { AthletesDiscoveryView } from "@/components/network/athletes-discovery-view";
import { getAthletesDiscovery } from "@/actions/network";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const instant = false;

async function AthletesLoader() {
  const [athletes, allSports] = await Promise.all([
    getAthletesDiscovery(),
    db.select({ code: schema.sports.code, namePt: schema.sports.namePt }).from(schema.sports),
  ]);

  return <AthletesDiscoveryView initialAthletes={athletes} sports={allSports} />;
}

export default function AtletasPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando atletas da comunidade...
            </div>
          }
        >
          <AthletesLoader />
        </Suspense>
      </main>
    </div>
  );
}