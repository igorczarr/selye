"use client";

import { useState, useTransition } from "react";
import { logBodyMetric, updateFavoriteSports, exportUserData } from "@/actions/profile";
import { User, Shield, Lock, Activity, Download, Plus, Check } from "lucide-react";

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
  };
}

export function ProfileView({ data }: ProfileViewProps) {
  const [isPending, startTransition] = useTransition();

  // Estados de nova medição física
  const [metricType, setMetricType] = useState("weight");
  const [metricValue, setMetricValue] = useState("");
  const [metricUnit, setMetricUnit] = useState("kg");

  // Modalidades selecionadas
  const [selectedSports, setSelectedSports] = useState<string[]>(
    data.userSportsList.map((s) => s.sportId)
  );

  const handleLogMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricValue || isNaN(Number(metricValue))) return;

    startTransition(async () => {
      await logBodyMetric(metricType, Number(metricValue), metricUnit);
      setMetricValue("");
      alert("Medição registrada em histórico privado!");
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exported, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `selye_meus_dados_lgpd_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Cabeçalho do Perfil (§7.1) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-2xl shadow-xs">
            {data.user.name?.[0] || "M"}
          </div>
          <div>
            <h1 className="t-h1">{data.user.name}</h1>
            <p className="t-data text-xs text-muted">@{data.user.username} · {data.user.email}</p>
            <p className="text-xs text-muted mt-1">{data.user.bio}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {data.streak && (
            <div className="px-3 py-1.5 rounded-md bg-osso border border-line flex items-center gap-2">
              <span className="text-amber-600 text-sm">🔥</span>
              <div className="flex flex-col">
                <span className="t-label !text-[9px]">Streak Semanal</span>
                <span className="t-data text-xs font-bold text-grafite">
                  {data.streak.currentWeeklyStreak} semanas
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-line text-xs font-mono font-semibold hover:bg-osso transition-colors cursor-pointer self-start sm:self-center"
            title="Direito de Portabilidade LGPD Art. 18"
          >
            <Download size={14} />
            <span>Exportar Dados (LGPD)</span>
          </button>
        </div>
      </div>

      {/* Conquistas & Marcos Esportivos (§13 e §15) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Patrimônio de Evolução (§13 e §15)</span>
            <h3 className="t-h2 mt-1">Conquistas & Marcos Esportivos</h3>
            <p className="text-muted text-xs mt-1">
              Marcos de consistência, autonomia, prática multimodal e superação pessoal.
            </p>
          </div>
          <span className="t-data text-xs px-2.5 py-1 rounded bg-osso border border-line font-mono font-semibold">
            {data.userAchievements?.length || 0} de {data.achievementsCatalog?.length || 6}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.achievementsCatalog?.map((ach) => {
            const isUnlocked = data.userAchievements?.some((ua) => ua.code === ach.code);
            const userAch = data.userAchievements?.find((ua) => ua.code === ach.code);

            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? "bg-surface border-profundo/40 shadow-xs"
                    : "bg-osso/20 border-line/60 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-2xl p-2 rounded-md ${isUnlocked ? "bg-osso" : "grayscale opacity-50"}`}>
                    {ach.icon}
                  </span>
                  <div>
                    <h4 className="font-semibold text-xs text-grafite flex items-center gap-1.5">
                      <span>{ach.title}</span>
                      {isUnlocked && (
                        <span className="w-1.5 h-1.5 rounded-full bg-lima inline-block" />
                      )}
                    </h4>
                    <p className="text-[11px] text-muted mt-1 leading-snug">
                      {ach.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-line/40 flex items-center justify-between text-[10px] text-muted">
                  <span className="font-mono uppercase tracking-wider">{ach.category}</span>
                  {isUnlocked && userAch?.unlockedAt ? (
                    <span className="font-mono text-profundo font-semibold">
                      Desbloqueado {new Date(userAch.unlockedAt).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span className="font-mono italic">Em progresso</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modalidades Favoritas Multimodalidade (§3) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div>
          <span className="t-label">Multimodalidade (§3)</span>
          <h3 className="t-h2 mt-1">Minhas Modalidades Favoritas</h3>
          <p className="text-muted text-xs mt-1">
            Selecione uma ou várias práticas esportivas para personalizar seus indicadores e treinos.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {data.allAvailableSports.map((sport) => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <button
                key={sport.id}
                onClick={() => toggleSport(sport.id)}
                className={`p-3 rounded-md border text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-grafite text-osso border-grafite font-semibold"
                    : "bg-osso/40 border-line text-muted hover:border-profundo"
                }`}
              >
                <span>{sport.namePt}</span>
                {isSelected ? <Check size={14} className="text-lima" /> : <Plus size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Informações Físicas Pessoais (§7.2 e Regra de Privacidade §19.2) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5">
              <Lock size={13} className="text-profundo" />
              <span className="t-label !text-profundo">Privado por Padrão (§7.2)</span>
            </div>
            <h3 className="t-h2 mt-1">Gestão Física e Medidas Corporais</h3>
            <p className="text-muted text-xs mt-1">
              Seus dados físicos não são expostos a membros ou treinadores sem sua autorização explícita.
            </p>
          </div>
        </div>

        {/* Formulário de Registro de Nova Medição */}
        <form onSubmit={handleLogMetric} className="flex flex-wrap items-end gap-2.5 pt-2">
          <div className="flex flex-col gap-1">
            <label className="t-aux text-muted">Tipo de Métrica</label>
            <select
              value={metricType}
              onChange={(e) => {
                setMetricType(e.target.value);
                if (e.target.value === "weight") setMetricUnit("kg");
                else if (e.target.value === "body_fat") setMetricUnit("%");
                else if (e.target.value === "resting_hr") setMetricUnit("bpm");
                else setMetricUnit("cm");
              }}
              className="h-9 px-2.5 rounded border border-line bg-background text-xs"
            >
              <option value="weight">Peso Corporal</option>
              <option value="body_fat">% de Gordura</option>
              <option value="resting_hr">Freq. Cardíaca de Repouso</option>
              <option value="waist">Circunferência Abdominal</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="t-aux text-muted">Valor</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                required
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder="Ex: 73.5"
                className="w-24 h-9 px-2.5 rounded border border-line bg-background text-xs font-mono"
              />
              <span className="t-data text-xs text-muted">{metricUnit}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !metricValue}
            className="h-9 px-4 rounded bg-grafite text-osso font-semibold text-xs hover:bg-noite disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isPending ? "Gravando..." : "Registrar"}
          </button>
        </form>

        {/* Histórico Temporal de Medições (§7.2) */}
        <div className="border-t border-line/60 pt-3">
          <span className="t-aux text-muted font-mono uppercase tracking-wider">Histórico Recente</span>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {data.metrics.length === 0 ? (
              <p className="text-xs text-muted italic">Nenhuma medição registrada ainda.</p>
            ) : (
              data.metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded bg-osso/30 border border-line/50"
                >
                  <span className="font-semibold text-grafite capitalize">
                    {m.metricType.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="t-data font-bold">
                      {m.valueNumeric} {m.unit}
                    </span>
                    <span className="t-data text-[10px] text-muted">
                      {new Date(m.recordedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
