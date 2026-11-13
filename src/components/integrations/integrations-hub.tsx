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
  CheckCircle2,
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
          [provider]: `ℹ Atividade deduplicada com sucesso: ${result.reason}`,
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
        return <Flame size={20} className="text-orange-600" />;
      case "apple_health":
        return <Watch size={20} className="text-red-500" />;
      case "health_connect":
        return <Activity size={20} className="text-emerald-600" />;
      case "garmin":
        return <Layers size={20} className="text-blue-600" />;
      default:
        return <Smartphone size={20} />;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-grafite mb-2"
        >
          <ArrowLeft size={13} />
          <span>Voltar para Performance & Carga</span>
        </Link>
        <span className="t-label block">Ecossistema Conectado (§16 do Briefing)</span>
        <h1 className="t-h1 mt-1">Dispositivos & Integrações</h1>
        <p className="text-muted text-xs mt-1">
          Conecte seus wearables e plataformas de rastreamento. As atividades são consolidadas e deduplicadas automaticamente.
        </p>
      </div>

      {/* Grid de Provedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => (
          <div
            key={item.provider}
            className={`rounded-lg border bg-surface p-5 flex flex-col justify-between gap-4 shadow-xs transition-all ${
              item.isConnected ? "border-profundo/40" : "border-line"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-osso border border-line">
                    {getProviderIcon(item.provider)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-grafite">{item.name}</h3>
                    <span className="t-data text-[10px] text-muted font-mono">
                      {item.isConnected ? "Ativo no Selye" : "Desconectado"}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.isConnected
                      ? "bg-lima text-grafite"
                      : "bg-osso text-muted"
                  }`}
                >
                  {item.isConnected ? "CONECTADO" : "INATIVO"}
                </span>
              </div>

              <p className="text-xs text-foreground/80 mt-3 leading-relaxed">
                {item.description}
              </p>

              {item.lastSyncAt && (
                <p className="text-[10px] font-mono text-muted mt-2">
                  Última sincronização:{" "}
                  {new Date(item.lastSyncAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              {syncFeedback[item.provider] && (
                <div className="mt-2 p-2 rounded bg-osso/60 border border-line/60 text-[11px] text-profundo font-mono">
                  {syncFeedback[item.provider]}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line/60">
              <button
                onClick={() => handleToggle(item.provider, item.isConnected)}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  item.isConnected
                    ? "border border-line bg-osso text-grafite hover:bg-red-50 hover:text-red-700"
                    : "bg-grafite text-osso hover:bg-noite shadow-xs"
                }`}
              >
                <Power size={13} />
                <span>{item.isConnected ? "Desconectar" : "Conectar"}</span>
              </button>

              {item.isConnected && (
                <button
                  onClick={() => handleSync(item.provider)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs text-profundo font-semibold hover:underline cursor-pointer"
                >
                  <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
                  <span>Sincronizar Agora</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Informativo de Engenharia sobre Deduplicação e Privacidade */}
      <div className="rounded-lg border border-line bg-surface p-5 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-profundo" />
          <h4 className="font-semibold text-xs text-grafite">
            Arquitetura de Deduplicação Externa (§16.2 e §19.2)
          </h4>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          O SELYE emprega um mecanismo de <strong>deduplicação determinística</strong> baseado em janelas temporais e identificadores externos únicos (<code className="font-mono text-profundo text-[11px]">external_activity_id</code>). Se você correr com um relógio Garmin sincronizado com o Strava e o Apple Health, o SELYE reconhece a sessão de forma unificada, impedindo contagem duplicada de volume semanal ou streak de consistência.
        </p>
      </div>
    </div>
  );
}