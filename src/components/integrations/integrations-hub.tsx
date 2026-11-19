"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleIntegration,
  syncExternalActivities,
  importExternalActivityFile,
  saveBaselineCalibration,
  type IntegrationStatus,
} from "@/actions/integrations";
import {
  updateNotificationPreference,
  sendTestOrDigestEmail,
  type NotificationPreferenceRecord,
} from "@/actions/notifications";
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
  Upload,
  FileCode2,
  Check,
  Bell,
  Download,
  SlidersHorizontal,
  Mail,
  Send,
} from "lucide-react";

interface IntegrationsHubProps {
  initialIntegrations: IntegrationStatus[];
  initialCalibration?: {
    experienceLevel: "beginner" | "intermediate" | "advanced";
    targetDaysPerWeek: number;
    restingHrBpm: number | null;
  };
  initialNotificationPreferences?: NotificationPreferenceRecord[];
}

const SAMPLE_GPX_5KM = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StravaGPX">
  <trk>
    <name>Corrida Ritmada na Orla (GPS + FC)</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="-22.9840" lon="-43.2240">
        <time>${new Date(Date.now() - 36 * 60_000).toISOString()}</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>158</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
      </trkpt>
      <trkpt lat="-22.9840" lon="-43.1750">
        <time>${new Date(Date.now() - 2 * 60_000).toISOString()}</time>
        <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>172</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

export function IntegrationsHub({
  initialIntegrations,
  initialCalibration,
  initialNotificationPreferences = [],
}: IntegrationsHubProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferenceRecord[]>(
    initialNotificationPreferences
  );
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailStatusBanner, setEmailStatusBanner] = useState<string | null>(
    null
  );
  const [syncFeedback, setSyncFeedback] = useState<Record<string, string>>({});
  const [importBanner, setImportBanner] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<
    "strava" | "apple_health" | "health_connect" | "garmin"
  >("strava");
  const [isPending, startTransition] = useTransition();

  // Calibração Rápida de Perfil (< 2 min)
  const [expLevel, setExpLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >(initialCalibration?.experienceLevel || "intermediate");
  const [targetDays, setTargetDays] = useState<number>(
    initialCalibration?.targetDaysPerWeek || 4
  );
  const [restingHr, setRestingHr] = useState<string>(
    initialCalibration?.restingHrBpm
      ? String(initialCalibration.restingHrBpm)
      : ""
  );
  const [calibrationBanner, setCalibrationBanner] = useState<string | null>(
    null
  );

  // PWA & Lembretes Opt-in Não-Culpabilizantes
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [pwaBanner, setPwaBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selye-gentle-reminders");
      if (saved === "true") setRemindersEnabled(true);
    } catch {
      // ignora
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

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

      router.refresh();
      setTimeout(() => {
        setSyncFeedback((prev) => ({ ...prev, [provider]: "" }));
      }, 4000);
    });
  };

  const processImportedText = (fileName: string, content: string) => {
    setImportBanner(null);
    startTransition(async () => {
      try {
        const res = await importExternalActivityFile({
          fileName,
          content,
          provider: selectedProvider,
        });
        if (res.importedCount > 0) {
          setImportBanner(
            `Importação concluída: ${res.importedCount} sessão(ões) adicionada(s) [${res.importedTitles.join(
              ", "
            )}]${
              res.skippedDuplicatesCount > 0
                ? ` · ${res.skippedDuplicatesCount} duplicata(s) ignorada(s)`
                : ""
            }.`
          );
        } else {
          setImportBanner(
            `Todas as ${res.skippedDuplicatesCount} atividade(s) do arquivo já constavam no seu histórico (deduplicação ativa).`
          );
        }
        router.refresh();
      } catch (err: any) {
        setImportBanner(
          err?.message || "Erro ao processar o arquivo de atividade."
        );
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    processImportedText(file.name, text);
    e.target.value = "";
  };

  const handleSaveCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await saveBaselineCalibration({
        experienceLevel: expLevel,
        targetDaysPerWeek: targetDays,
        restingHrBpm: restingHr ? Number(restingHr) : null,
      });
      setCalibrationBanner(
        "Seu perfil fisiológico foi recalibrado. Sua Reserva de Energia Adaptativa (EA) e sua Decisão do Dia já refletem esses parâmetros."
      );
      router.refresh();
    });
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setPwaBanner(
        "No navegador: clique no ícone de instalação na barra de endereço (Chrome/Edge) ou em 'Compartilhar → Adicionar à Tela de Início' (Safari/iOS)."
      );
    }
  };

  const handleToggleReminders = async () => {
    const next = !remindersEnabled;
    if (
      next &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission();
      } catch {
        // ignora
      }
    }
    setRemindersEnabled(next);
    try {
      localStorage.setItem("selye-gentle-reminders", String(next));
    } catch {
      // ignora
    }
    setPwaBanner(
      next
        ? "Lembretes contextuais ativados: você receberá avisos positivos de prontidão matinal sem mensagens culpabilizantes."
        : "Lembretes desativados."
    );
  };

  const handleToggleNotifPref = (
    category: NotificationPreferenceRecord["category"],
    channel: "channelInApp" | "channelEmail",
    currentValue: boolean
  ) => {
    const nextVal = !currentValue;
    setNotifPrefs((prev) =>
      prev.map((p) =>
        p.category === category ? { ...p, [channel]: nextVal } : p
      )
    );
    startTransition(async () => {
      await updateNotificationPreference({
        category,
        [channel]: nextVal,
      });
    });
  };

  const handleSendTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatusBanner(null);
    startTransition(async () => {
      const res = await sendTestOrDigestEmail(testEmailAddress || undefined);
      if (res.ok) {
        setEmailStatusBanner(
          `✓ E-mail enviado com sucesso para ${res.targetEmail} via selye.vrtice.com.br (ID: ${
            res.emailId || "entregue"
          }).`
        );
      } else {
        setEmailStatusBanner(
          res.error || "Não foi possível completar o envio do e-mail agora."
        );
      }
      router.refresh();
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full fade-up">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/evolucao"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Evolução & Reserva Adaptativa</span>
        </Link>
        <span className="t-label block">Ecossistema Conectado · Fase 15</span>
        <h1 className="t-h1 mt-1">
          Integrações, Importação & Calibração
        </h1>
        <p className="text-muted text-sm mt-1">
          Importe arquivos reais (.GPX, .TCX, .CSV, .JSON) do Strava, Garmin ou Apple Watch, calibre seu perfil fisiológico e instale o Selye no seu dispositivo.
        </p>
      </div>

      {/* 1. Importador Real de Arquivos (.GPX / .TCX / .CSV / .JSON) */}
      <section className="card p-5 sm:p-6 flex flex-col gap-4 border-l-4 border-l-lima">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="t-label !text-accent-text">
              Importação Direta com Deduplicação Automática
            </span>
            <h2 className="t-h2 mt-0.5">
              Importar Sessão (.GPX, .TCX, .CSV ou .JSON)
            </h2>
            <p className="text-xs text-muted mt-1">
              O Selye calcula distância por coordenadas GPS (Haversine), duração real, frequência cardíaca média e converte automaticamente em Energia Adaptativa (EA).
            </p>
          </div>

          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as any)}
            aria-label="Origem do arquivo importado"
            className="input h-9 sm:w-48 text-xs font-mono shrink-0"
          >
            <option value="strava">Origem: Strava</option>
            <option value="garmin">Origem: Garmin Connect</option>
            <option value="apple_health">Origem: Apple Health</option>
            <option value="health_connect">Origem: Health Connect</option>
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.tcx,.csv,.json,application/gpx+xml,application/xml,text/csv,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary h-10 px-4 text-xs"
          >
            <Upload size={14} />
            <span>
              {isPending
                ? "Processando arquivo..."
                : "Selecionar Arquivo (.GPX / .TCX / .CSV / .JSON)"}
            </span>
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              processImportedText("strava_orla_5km.gpx", SAMPLE_GPX_5KM)
            }
            className="btn btn-ghost h-10 px-3.5 text-xs font-mono"
          >
            <FileCode2 size={14} className="text-accent-text" />
            <span>Testar com GPX Real (Corrida 5km GPS + FC)</span>
          </button>
        </div>

        {importBanner && (
          <div
            role="status"
            className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 text-xs text-foreground font-mono"
          >
            {importBanner}
          </div>
        )}
      </section>

      {/* 2. Calibração Rápida de Perfil Fisiológico (< 2 min) & Instalação PWA lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <form
          onSubmit={handleSaveCalibration}
          className="lg:col-span-7 card p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-accent-text" />
              <span className="t-label !text-accent-text">
                Calibração Rápida (&lt; 2 min)
              </span>
            </div>
            <h2 className="t-h2 mt-1">Seu Perfil Fisiológico Base</h2>
            <p className="text-xs text-muted mt-1">
              Ajuste seus parâmetros base para dimensionar sua Capacidade Semanal de Energia Adaptativa (EA) e sua Decisão do Dia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="calib-exp"
                className="t-aux text-foreground font-semibold"
              >
                Nível Esportivo
              </label>
              <select
                id="calib-exp"
                value={expLevel}
                onChange={(e) => setExpLevel(e.target.value as any)}
                className="input h-10 text-xs"
              >
                <option value="beginner">Iniciante / Retomando</option>
                <option value="intermediate">Intermediário Consistente</option>
                <option value="advanced">Avançado / Competitivo</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="calib-days"
                className="t-aux text-foreground font-semibold"
              >
                Meta Semanal
              </label>
              <select
                id="calib-days"
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="input h-10 text-xs font-mono"
              >
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} dias / semana
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="calib-hr"
                className="t-aux text-foreground font-semibold"
              >
                FC de Repouso (opc.)
              </label>
              <input
                id="calib-hr"
                type="number"
                min={35}
                max={110}
                value={restingHr}
                onChange={(e) => setRestingHr(e.target.value)}
                placeholder="Ex: 56 bpm"
                className="input h-10 text-xs t-data"
              />
            </div>
          </div>

          {calibrationBanner && (
            <p className="text-xs font-mono text-accent-text">
              {calibrationBanner}
            </p>
          )}

          <div className="flex justify-end pt-2 border-t border-line">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-dark h-9 px-4 text-xs"
            >
              <Check size={14} />
              <span>Recalibrar Reserva Adaptativa</span>
            </button>
          </div>
        </form>

        {/* PWA & Lembretes Não-Culpabilizantes */}
        <section className="lg:col-span-5 card p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <span className="t-label !text-accent-text">
              Hábito Diário & Autonomia
            </span>
            <h2 className="t-h2 mt-1">App Instalável (PWA) & Lembretes</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Instale o Selye na tela inicial do celular ou desktop para acesso em 1 toque e ative lembretes matinais focados em prontidão — sem mensagens culpabilizantes.
            </p>
          </div>

          {pwaBanner && (
            <p className="p-3 rounded-xl bg-foreground/[0.03] border border-line text-xs text-muted leading-relaxed">
              {pwaBanner}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={handleInstallPwa}
              className="btn btn-primary h-9 w-full text-xs"
            >
              <Download size={14} />
              <span>Instalar Aplicativo Selye</span>
            </button>

            <button
              type="button"
              onClick={handleToggleReminders}
              aria-pressed={remindersEnabled}
              className={`btn h-9 w-full text-xs font-mono ${
                remindersEnabled ? "btn-dark" : "btn-ghost"
              }`}
            >
              <Bell size={13} />
              <span>
                {remindersEnabled
                  ? "Lembretes Matinais Ativos (Opt-in)"
                  : "Ativar Lembrete Matinal de Prontidão"}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* 2.5 Central de Notificações & E-mails (Resend · selye.vrtice.com.br) */}
      <section className="card p-5 sm:p-6 flex flex-col gap-5 border-l-4 border-l-profundo">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-accent-text" />
              <span className="t-label !text-accent-text">
                Comunicação Inteligente · selye.vrtice.com.br
              </span>
            </div>
            <h2 className="t-h2 mt-1">
              Central de Avisos & Notificações por E-mail
            </h2>
            <p className="text-xs text-muted mt-1">
              Escolha quais avisos deseja receber no Sininho do painel e no seu e-mail. O Selye envia resumos claros e motivadores após seus treinos, check-ins e conquistas.
            </p>
          </div>

          <form
            onSubmit={handleSendTestEmail}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0"
          >
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="Seu e-mail (opc.)"
              aria-label="Endereço de e-mail para receber o panorama do dia"
              className="input h-9 text-xs sm:w-52"
            />
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary h-9 px-3.5 text-xs shrink-0"
            >
              <Send size={13} />
              <span>
                {isPending ? "Enviando..." : "Receber Panorama por E-mail"}
              </span>
            </button>
          </form>
        </div>

        {emailStatusBanner && (
          <div
            role="status"
            className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 text-xs text-foreground font-mono"
          >
            {emailStatusBanner}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notifPrefs.map((pref) => (
            <div
              key={pref.category}
              className="rounded-xl border border-line bg-foreground/[0.02] p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  {pref.labelPt}
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  {pref.descriptionPt}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleNotifPref(
                      pref.category,
                      "channelInApp",
                      pref.channelInApp
                    )
                  }
                  className={`h-8 px-3 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    pref.channelInApp
                      ? "border-lima/70 bg-lima/15 text-foreground font-semibold"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  <Bell size={12} />
                  <span>Sininho: {pref.channelInApp ? "Ativo" : "Pausado"}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleToggleNotifPref(
                      pref.category,
                      "channelEmail",
                      pref.channelEmail
                    )
                  }
                  className={`h-8 px-3 rounded-lg border text-[11px] font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    pref.channelEmail
                      ? "border-lima/70 bg-lima/15 text-foreground font-semibold"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  <Mail size={12} />
                  <span>E-mail: {pref.channelEmail ? "Ativo" : "Pausado"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Grade de Provedores Conectados */}
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
                      {item.isConnected
                        ? "Sincronização ativa"
                        : "Desconectado"}
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
          Quando uma mesma atividade é enviada por mais de uma fonte (por exemplo, um relógio Garmin conectado simultaneamente ao Strava e ao Apple Health), o Selye identifica a janela temporal coincidente e consolida os dados em um único registro, preservando a precisão da sua Energia Adaptativa (EA) e do seu streak semanal.
        </p>
      </section>
    </div>
  );
}
