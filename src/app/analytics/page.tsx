import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrCreateDemoUser } from "@/actions/workout";
import { desc, eq } from "drizzle-orm";

export const instant = false;

async function AnalyticsLoader() {
  const user = await getOrCreateDemoUser();

  const workouts = await db
    .select()
    .from(schema.workoutSessions)
    .where(eq(schema.workoutSessions.userId, user.id))
    .orderBy(desc(schema.workoutSessions.startedAt))
    .limit(30);

  const [streakData] = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, user.id))
    .limit(1);

  return (
    <AnalyticsView
      metrics={{
        totalWorkouts: workouts.length,
        monthlyVolumeKg: 24850,
        weeklyAdherence: 94,
        currentWeeklyStreak: streakData?.currentWeeklyStreak || 3,
        bestWeeklyStreak: streakData?.bestWeeklyStreak || 5,
        personalRecords: [],
        recentWorkouts: workouts,
      }}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando analytics de performance...
            </div>
          }
        >
          <AnalyticsLoader />
        </Suspense>
      </main>
    </div>
  );
}
