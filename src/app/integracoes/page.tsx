import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";
import { getUserIntegrations } from "@/actions/integrations";

export const instant = false;

async function IntegrationsLoader() {
  const integrations = await getUserIntegrations();
  return <IntegrationsHub initialIntegrations={integrations} />;
}

export default function IntegracoesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando conexões com dispositivos e serviços externos...
            </div>
          }
        >
          <IntegrationsLoader />
        </Suspense>
      </main>
    </div>
  );
}