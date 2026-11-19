"use client";

import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import {
  logBodyMetric,
  updateFavoriteSports,
  exportUserData,
} from "@/actions/profile";
import { ConditionArrowBadge } from "@/components/ui/condition-arrow-badge";
import {
  Lock,
  Download,
  Plus,
  Check,
  Flame,
  Award,
  CheckCircle2,
} from "lucide-react";

interface ProfileViewProps {
  data: {
    user: any;
    profile: any;
    metrics: any[];
    userSportsList: any[];
    allAvailableSports: any[];
    streak?: any;
    userAchievements?: any[];
    achievementsCatalog?: any[];
    eaCondition?: {
      reservePercent: number;
      availableReserveEa: number;
      personalCapacityEa: number;
    };
  };
}

const METRIC_TYPE_LABELS: Record<string, string> = {
  weight: "Peso Corporal",
  body_fat: "Percentual de Gordura",
  resting_hr: "FC de Repouso",
  waist: "Circunferência Abdominal",
};

const CATEGORY_LABELS: Record<string, string> = {
  consistency: "Consistência",
  milestone: "Marco",
  social: "Comunidade",
  multimodal: "Multimodal",
};

export function ProfileView({ data }: ProfileViewProps) {
  const { user: clerkUser } = useUser();
  const [isPending, startTransition] = useTransition();
  const avatarSrc = clerkUser?.imageUrl || data.user.avatarUrl || null;
  const displayName = clerkUser?.fullName || data.user.name || "Atleta";

  const [metricType, setMetricType] = useState("weight");
  const [metricValue, setMetricValue] = useState("");
  const [metricUnit, setMetricUnit] = useState("kg");
  const [metricSavedBanner, setMetricSavedBanner] = useState(false);

  const [selectedSports, setSelectedSports] = useState<string[]>(
    data.userSportsList.map((s) => s.sportId)
  );

  const handleLogMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricValue || isNaN(Number(metricValue))) return;

    startTransition(async () => {
      await logBodyMetric(metricType, Number(metricValue), metricUnit);
      setMetricValue("");
      setMetricSavedBanner(true);
      setTimeout(() => setMetricSavedBanner(false), 3000);
    });
  };

  const toggleSport = (sportId: string) => {
    const next = selectedSports.includes(sportId)
      ? selectedSports.filter((id) => id !== sportId)
      : [...selectedSports, sportId];

    setSelectedSports(next);

    startTransition(async () => {
      await updateFavoriteSports(
        next.map((id) => ({ sportId: id, experienceLevel: "intermediate" }))
      );
    });
  };

  const handleExportData = async () => {
    const exported = await exportUserData();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exported, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `selye_portabilidade_lgpd_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 w-full fade-up">
      {/* Cabeçalho do Perfil */}
      <section className="card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-line shadow-md">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={`Foto de perfil de ${displayName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayName[0] || "A"}</span>
              )}
            </div>
            <ConditionArrowBadge
              reservePercent={data.eaCondition?.reservePercent ?? 82}
              availableReserveEa={data.eaCondition?.availableReserveEa}
              personalCapacityEa={data.eaCondition?.personalCapacityEa}
              size="md"
              className="absolute -bottom-1 -right-1 z-10"
            />
          </div>
          <div>
            <h1 className="t-h1">{displayName}</h1>
            <p className="t-data text-xs text-muted">
              @{data.user.username} · {data.user.email}
            </p>
            {data.user.bio && (
              <p className="text-xs text-muted mt-1">{data.user.bio}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <ConditionArrowBadge
            reservePercent={data.eaCondition?.reservePercent ?? 82}
            availableReserveEa={data.eaCondition?.availableReserveEa}
            personalCapacityEa={data.eaCondition?.personalCapacityEa}
            size="md"
            showLabel={true}
          />

          {data.streak && (
            <div className="px-3.5 py-2 rounded-xl bg-lima/25 border border-profundo/30 flex items-center gap-2">
              <Flame size={16} className="text-accent-text" />
              <div className="flex flex-col">
                <span className="t-label">Streak Semanal</span>
                <span className="t-data text-xs font-semibold text-foreground">
                  {data.streak.currentWeeklyStreak}{" "}
                  {data.streak.currentWeeklyStreak === 1 ? "semana" : "semanas"}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportData}
            className="btn btn-ghost h-10 px-3.5 text-xs font-mono"
            title="Portabilidade integral dos seus dados (LGPD)"
          >
            <Download size={14} />
            <span>Exportar JSON (LGPD)</span>
          </button>
        </div>
      </section>

      {/* Grade Bento do Perfil: Esquerda (Conquistas + Modalidades) · Direita (Biometria Privada) */}
      <div className="bento-grid items-start">
        <div className="col-span-12 xl:col-span-7 flex flex-col gap-6">
          {/* Conquistas & Marcos Esportivos */}
          <section className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Patrimônio de Evolução</span>
            <h2 className="t-h2 mt-1">Conquistas & Marcos Esportivos</h2>
            <p className="text-muted text-xs mt-1">
              Reconhecimentos de constância semanal, autonomia e prática multimodal.
            </p>
          </div>
          <span className="chip t-data">
            {data.userAchievements?.length || 0} /{" "}
            {data.achievementsCatalog?.length || 6}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.achievementsCatalog?.map((ach) => {
            const isUnlocked = data.userAchievements?.some(
              (ua) => ua.code === ach.code
            );
            const userAch = data.userAchievements?.find(
              (ua) => ua.code === ach.code
            );

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? "bg-lima/10 border-profundo/40"
                    : "bg-foreground/[0.02] border-line opacity-65"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? "bg-lima text-grafite"
                        : "bg-foreground/10 text-muted"
                    }`}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>{ach.title}</span>
                      {isUnlocked && (
                        <span className="w-1.5 h-1.5 rounded-full bg-lima inline-block" />
                      )}
                    </h3>
                    <p className="text-xs text-muted mt-1 leading-snug">
                      {ach.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-xs text-muted font-mono">
                  <span>{CATEGORY_LABELS[ach.category] || ach.category}</span>
                  {isUnlocked && userAch?.unlockedAt ? (
                    <span className="text-accent-text font-semibold">
                      {new Date(userAch.unlockedAt).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span>Em aberto</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modalidades Favoritas */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <span className="t-label">Prática Esportiva</span>
          <h2 className="t-h2 mt-1">Minhas Modalidades Favoritas</h2>
          <p className="text-muted text-xs mt-1">
            Selecione uma ou mais práticas esportivas para calibrar suas recomendações de carga.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {data.allAvailableSports.map((sport) => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSport(sport.id)}
                className={`h-11 px-3.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-foreground text-background border-foreground font-semibold"
                    : "bg-foreground/[0.02] border-line text-muted hover:text-foreground hover:border-mineral"
                }`}
              >
                <span>{sport.namePt}</span>
                {isSelected ? (
                  <Check size={14} className="text-lima shrink-0" />
                ) : (
                  <Plus size={14} className="shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>
        </div>

      {/* Gestão Física e Medidas Corporais (Privado por Padrão) */}
      <section className="col-span-12 xl:col-span-5 card p-6 flex flex-col gap-4 xl:sticky xl:top-20">
        <div>
          <div className="flex items-center gap-1.5">
            <Lock size={13} className="text-accent-text" />
            <span className="t-label !text-accent-text">
              Privado por Padrão · Controle do Titular
            </span>
          </div>
          <h2 className="t-h2 mt-1">Biometria e Medidas Corporais</h2>
          <p className="text-muted text-xs mt-1">
            Seus indicadores biométricos são estritamente privados e nunca são exibidos no perfil público.
          </p>
        </div>

        {metricSavedBanner && (
          <div
            role="status"
            className="rounded-xl border border-profundo bg-lima/20 px-4 py-2.5 flex items-center gap-2 text-xs text-foreground"
          >
            <CheckCircle2 size={15} className="text-accent-text shrink-0" />
            <span className="font-medium">
              Medição registrada no seu histórico privado.
            </span>
          </div>
        )}

        <form
          onSubmit={handleLogMetric}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1"
        >
          <div className="sm:col-span-5 flex flex-col gap-1">
            <label
              htmlFor="metric-type"
              className="t-aux text-foreground font-semibold"
            >
              Indicador Biométrico
            </label>
            <select
              id="metric-type"
              value={metricType}
              onChange={(e) => {
                setMetricType(e.target.value);
                if (e.target.value === "weight") setMetricUnit("kg");
                else if (e.target.value === "body_fat") setMetricUnit("%");
                else if (e.target.value === "resting_hr") setMetricUnit("bpm");
                else setMetricUnit("cm");
              }}
              className="input h-10 text-xs"
            >
              <option value="weight">Peso Corporal (kg)</option>
              <option value="body_fat">Percentual de Gordura (%)</option>
              <option value="resting_hr">FC de Repouso (bpm)</option>
              <option value="waist">Circunferência Abdominal (cm)</option>
            </select>
          </div>

          <div className="sm:col-span-4 flex flex-col gap-1">
            <label
              htmlFor="metric-val"
              className="t-aux text-foreground font-semibold"
            >
              Valor ({metricUnit})
            </label>
            <input
              id="metric-val"
              type="number"
              step="0.1"
              required
              value={metricValue}
              onChange={(e) => setMetricValue(e.target.value)}
              placeholder="Ex: 73.5"
              className="input h-10 text-xs font-mono"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isPending || !metricValue}
              className="btn btn-primary w-full h-10 text-xs"
            >
              {isPending ? "Gravando..." : "Registrar"}
            </button>
          </div>
        </form>

        {/* Histórico de Medições */}
        <div className="border-t border-line pt-4">
          <span className="t-label block mb-2.5">Histórico Recente</span>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {data.metrics.length === 0 ? (
              <p className="text-xs text-muted">
                Nenhuma medição biométrica registrada até o momento.
              </p>
            ) : (
              data.metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs py-2.5 px-3.5 rounded-lg bg-foreground/[0.02] border border-line"
                >
                  <span className="font-semibold text-foreground">
                    {METRIC_TYPE_LABELS[m.metricType] ||
                      m.metricType.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="t-data font-semibold text-foreground">
                      {m.valueNumeric} {m.unit}
                    </span>
                    <span className="t-data text-xs text-muted">
                      {new Date(m.recordedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
