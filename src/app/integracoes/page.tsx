import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import { getUserIntegrations } from "@/actions/integrations";

export const instant = false;

async function IntegrationsLoader() {
  const integrations = await getUserIntegrations();
  return <IntegrationsHub initialIntegrations={integrations} />;
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<IntegrationsSkeleton />}>
          <IntegrationsLoader />
        </Suspense>
      </main>
    </div>
  );
}
