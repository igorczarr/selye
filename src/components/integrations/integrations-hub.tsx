"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  toggleIntegration,
  syncExternalActivities,
  type IntegrationStatus,
} from "@/actions/integrations";
import {
  Smartphone,
  RefreshCw,
  Power,
  ShieldCheck,
  ArrowLeft,
  Activity,
  Layers,
  Watch,
  Flame,
} from "lucide-react";

interface IntegrationsHubProps {
  initialIntegrations: IntegrationStatus[];
}

export function IntegrationsHub({ initialIntegrations }: IntegrationsHubProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [syncFeedback, setSyncFeedback] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const handleToggle = (provider: any, currentConnected: boolean) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider ? { ...i, isConnected: !currentConnected } : i
      )
    );

    startTransition(async () => {
      await toggleIntegration(provider, !currentConnected);
    });
  };

  const handleSync = (provider: any) => {
    setSyncFeedback((prev) => ({ ...prev, [provider]: "Sincronizando..." }));

    startTransition(async () => {
      const result = await syncExternalActivities(provider);

      if (result.success) {
        setSyncFeedback((prev) => ({
          ...prev,
          [provider]: `✓ Atividade importada e deduplicada (${result.syncedActivityId})`,
        }));
      } else if (result.isDuplicate) {
        setSyncFeedback((prev) => ({
          ...prev,
          [provider]: `Atividade já registrada: ${result.reason}`,
        }));
      }

      setTimeout(() => {
        setSyncFeedback((prev) => ({ ...prev, [provider]: "" }));
      }, 4000);
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "strava":
        return <Flame size={20} />;
      case "apple_health":
        return <Watch size={20} />;
      case "health_connect":
        return <Activity size={20} />;
      case "garmin":
        return <Layers size={20} />;
      default:
        return <Smartphone size={20} />;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full fade-up">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Performance & Carga</span>
        </Link>
        <span className="t-label block">Ecossistema Conectado</span>
        <h1 className="t-h1 mt-1">Dispositivos & Integrações</h1>
        <p className="text-muted text-sm mt-1">
          Conecte relógios esportivos e aplicativos de rastreamento. As sessões são unificadas sem duplicar seu volume semanal.
        </p>
      </div>

      {/* Grade de Provedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => (
          <article
            key={item.provider}
            className={`card p-6 flex flex-col justify-between gap-4 transition-all ${
              item.isConnected ? "border-profundo/50" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isConnected
                        ? "bg-lima/25 text-foreground"
                        : "bg-foreground/5 text-muted"
                    }`}
                  >
                    {getProviderIcon(item.provider)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">
                      {item.name}
                    </h2>
                    <span className="t-data text-xs text-muted">
                      {item.isConnected ? "Sincronização ativa" : "Desconectado"}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                    item.isConnected
                      ? "bg-lima text-grafite"
                      : "bg-foreground/10 text-muted"
                  }`}
                >
                  {item.isConnected ? "CONECTADO" : "INATIVO"}
                </span>
              </div>

              <p className="text-xs text-muted mt-3 leading-relaxed">
                {item.description}
              </p>

              {item.lastSyncAt && (
                <p className="t-data text-xs text-muted mt-2">
                  Última sincronização:{" "}
                  {new Date(item.lastSyncAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              {syncFeedback[item.provider] && (
                <div
                  role="status"
                  className="mt-3 p-2.5 rounded-lg bg-lima/20 border border-profundo/30 text-xs text-foreground font-mono"
                >
                  {syncFeedback[item.provider]}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => handleToggle(item.provider, item.isConnected)}
                disabled={isPending}
                className={`btn h-9 px-3.5 text-xs ${
                  item.isConnected ? "btn-ghost" : "btn-dark"
                }`}
              >
                <Power size={13} />
                <span>{item.isConnected ? "Desconectar" : "Conectar"}</span>
              </button>

              {item.isConnected && (
                <button
                  type="button"
                  onClick={() => handleSync(item.provider)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-xs text-accent-text font-semibold hover:underline cursor-pointer"
                >
                  <RefreshCw
                    size={13}
                    className={isPending ? "animate-spin" : ""}
                  />
                  <span>Sincronizar Agora</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Nota sobre Deduplicação e Privacidade */}
      <section className="card p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent-text" />
          <h3 className="font-semibold text-sm text-foreground">
            Unificação Inteligente de Sessões
          </h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Quando uma mesma atividade é enviada por mais de uma fonte (por exemplo, um relógio Garmin conectado simultaneamente ao Strava e ao Apple Health), o Selye identifica a janela temporal coincidente e consolida os dados em um único registro, preservando a precisão da sua carga aguda:crônica e do seu streak semanal.
        </p>
      </section>
    </div>
  );
}
