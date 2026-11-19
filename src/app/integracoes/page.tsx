import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import {
  getUserIntegrations,
  getBaselineCalibrationSnapshot,
} from "@/actions/integrations";
import { getUserNotificationPreferences } from "@/actions/notifications";

export const instant = false;

async function IntegrationsLoader() {
  const [integrations, calibration, notificationPreferences] =
    await Promise.all([
      getUserIntegrations(),
      getBaselineCalibrationSnapshot(),
      getUserNotificationPreferences(),
    ]);
  return (
    <IntegrationsHub
      initialIntegrations={integrations}
      initialCalibration={calibration}
      initialNotificationPreferences={notificationPreferences}
    />
  );
}

function IntegrationsSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 max-w-4xl mx-auto w-full"
      aria-busy="true"
      aria-label="Carregando integrações"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
      </div>
    </div>
  );
}

export default function IntegracoesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense fallback={<IntegrationsSkeleton />}>
          <IntegrationsLoader />
        </Suspense>
      </main>
    </div>
  );
}
