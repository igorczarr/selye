"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { duplicateRoutine } from "@/actions/routines";
import { startWorkout } from "@/actions/workout";
import {
  WEEKDAYS_MONDAY_FIRST,
  getWeekdayLabelPt,
  jsDayToMondayIndex,
} from "@/lib/week";
import {
  estimateRoutineDurationMinutes,
  countTotalSets,
} from "@/lib/routine-metrics";
import { ExerciseLink } from "@/components/catalog/exercise-link";
import {
  PlusCircle,
  Copy,
  Play,
  Dumbbell,
  Printer,
  Clock,
  Layers,
  LayoutGrid,
  GalleryHorizontalEnd,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

const MODALITY_LABELS: Record<string, string> = {
  strength: "Musculação",
  calisthenics: "Calistenia",
  functional: "Funcional",
  running: "Corrida",
  beach_volleyball: "Vôlei de Praia",
  footvolley: "Futevôlei",
  cycling: "Ciclismo",
  swimming: "Natação",
  pilates: "Pilates",
  mobility: "Mobilidade",
  cross_training: "Cross Training",
  martial_arts: "Artes Marciais",
};

interface RoutineHubItem {
  id: string;
  title: string;
  description: string | null;
  modalityCode: string;
  version: { versionNumber: number } | null;
  templates: {
    id: string;
    dayOfWeek: number | null;
    prescriptions: {
      id: string;
      exerciseId: string;
      exerciseNamePt: string;
      targetSets: number | null;
      targetReps: string | null;
      targetLoadKg: number | null;
      restSeconds: number | null;
    }[];
  }[];
}

export function RoutinesHub({ routines }: { routines: RoutineHubItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [layoutMode, setLayoutMode] = useState<"carousel" | "grid">("carousel");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const todayMondayIdx = jsDayToMondayIndex(new Date().getDay());

  // Mapeia quais dias da semana (jsDay) possuem treino agendado
  const scheduledJsDays = new Set<number>();
  for (const r of routines) {
    const d = r.templates?.[0]?.dayOfWeek;
    if (typeof d === "number") scheduledJsDays.add(d);
  }

  const visibleRoutines =
    selectedDay === "all"
      ? routines
      : routines.filter((r) => r.templates?.[0]?.dayOfWeek === selectedDay);

  const handleStartRoutine = (routine: RoutineHubItem) => {
    setStartingId(routine.id);
    startTransition(async () => {
      await startWorkout(routine.title, routine.id);
      router.push("/");
    });
  };

  const handleDuplicate = (routineId: string) => {
    startTransition(async () => {
      await duplicateRoutine(routineId);
      router.refresh();
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Planejamento Semanal</span>
          <h1 className="t-h1 mt-1">Rotinas de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Toque em qualquer exercício para abrir o passo a passo ilustrado e vídeo técnico.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Alternador Carrossel / Grade */}
          <div
            role="group"
            aria-label="Modo de exibição das fichas"
            className="flex items-center p-1 rounded-lg border border-line bg-surface"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("carousel")}
              aria-pressed={layoutMode === "carousel"}
              title="Exibir em carrossel"
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
                layoutMode === "carousel"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <GalleryHorizontalEnd size={14} />
              <span className="hidden sm:inline">Carrossel</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              aria-pressed={layoutMode === "grid"}
              title="Exibir em grade"
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
                layoutMode === "grid"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grade</span>
            </button>
          </div>

          <Link href="/treinos/novo" className="btn btn-primary h-10 px-4 text-xs">
            <PlusCircle size={15} strokeWidth={2} />
            <span>Nova Ficha</span>
          </Link>
        </div>
      </div>

      {/* Planner Semanal em ordem estrita Segunda → Domingo */}
      <section
        aria-label="Filtro semanal de segunda a domingo"
        className="card p-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          onClick={() => setSelectedDay("all")}
          aria-pressed={selectedDay === "all"}
          className={`h-9 px-3.5 rounded-lg text-xs font-mono font-semibold shrink-0 transition-colors cursor-pointer ${
            selectedDay === "all"
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground hover:bg-foreground/5"
          }`}
        >
          Todos ({routines.length})
        </button>

        {WEEKDAYS_MONDAY_FIRST.map((day) => {
          const isSelected = selectedDay === day.jsDay;
          const hasWorkout = scheduledJsDays.has(day.jsDay);
          const isToday = day.mondayIndex === todayMondayIdx;

          return (
            <button
              key={day.shortPt}
              type="button"
              onClick={() =>
                setSelectedDay(isSelected ? "all" : day.jsDay)
              }
              aria-pressed={isSelected}
              className={`h-9 px-3 rounded-lg text-xs font-mono shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-lima text-grafite font-semibold"
                  : isToday
                    ? "border border-profundo/60 text-foreground font-semibold bg-foreground/[0.03]"
                    : "text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <span>{day.shortPt}</span>
              {hasWorkout && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-grafite" : "bg-lima"
                  }`}
                />
              )}
            </button>
          );
        })}
      </section>

      {/* Lista de Fichas (Carrossel ou Grade) */}
      {visibleRoutines.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-foreground/5 flex items-center justify-center text-muted">
            <Dumbbell size={22} strokeWidth={1.75} />
          </div>
          <h2 className="t-h3">
            {selectedDay === "all"
              ? "Nenhuma ficha criada ainda"
              : `Descanso programado para ${getWeekdayLabelPt(selectedDay, "full")}`}
          </h2>
          <p className="text-muted text-xs max-w-sm">
            {selectedDay === "all"
              ? "Monte sua primeira programação com séries, repetições, cargas e intervalos."
              : "Nenhuma ficha vinculada a este dia. Aproveite para recuperar ou crie uma sessão específica."}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {selectedDay !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedDay("all")}
                className="btn btn-ghost h-9 px-3.5 text-xs"
              >
                Ver semana inteira
              </button>
            )}
            <Link href="/treinos/novo" className="btn btn-primary h-9 px-4 text-xs">
              <PlusCircle size={14} />
              <span>Criar Ficha</span>
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={
            layoutMode === "carousel"
              ? "-mx-4 sm:mx-0 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
              : ""
          }
        >
          <div
            className={
              layoutMode === "carousel"
                ? "flex gap-4 px-4 sm:px-0 items-stretch"
                : "grid grid-cols-1 md:grid-cols-2 gap-4"
            }
          >
            {visibleRoutines.map((routine) => {
              const firstTemplate = routine.templates?.[0];
              const prescriptions = firstTemplate?.prescriptions || [];
              const modalityLabel =
                MODALITY_LABELS[routine.modalityCode] || routine.modalityCode;
              const dayOfWeek = firstTemplate?.dayOfWeek;
              const dayLabel =
                typeof dayOfWeek === "number"
                  ? getWeekdayLabelPt(dayOfWeek, "short")
                  : null;
              const isToday =
                typeof dayOfWeek === "number" &&
                jsDayToMondayIndex(dayOfWeek) === todayMondayIdx;
              const estMin = estimateRoutineDurationMinutes(prescriptions);
              const totalSets = countTotalSets(prescriptions);
              const isExpanded = Boolean(expandedIds[routine.id]);
              const displayedPrescriptions = isExpanded
                ? prescriptions
                : prescriptions.slice(0, 4);
              const isStartingThis = isPending && startingId === routine.id;

              return (
                <article
                  key={routine.id}
                  className={`card card-interactive p-5 flex flex-col justify-between gap-4 ${
                    layoutMode === "carousel"
                      ? "snap-start shrink-0 w-[300px] sm:w-[340px]"
                      : "w-full"
                  } ${isToday ? "border-lima ring-1 ring-lima/50" : ""}`}
                >
                  <div>
                    {/* Metadados topo */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {dayLabel && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              isToday
                                ? "bg-lima text-grafite"
                                : "bg-foreground/8 text-foreground"
                            }`}
                          >
                            {isToday ? `${dayLabel} · Hoje` : dayLabel}
                          </span>
                        )}
                        <span className="chip text-[11px]">{modalityLabel}</span>
                      </div>
                      <span className="t-data text-[11px] text-muted shrink-0">
                        v{routine.version?.versionNumber || 1}.0
                      </span>
                    </div>

                    {/* Título & métricas rápidas */}
                    <h2 className="t-h3 mt-3 leading-snug">{routine.title}</h2>
                    {routine.description && (
                      <p className="text-muted text-xs mt-1 line-clamp-2">
                        {routine.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-accent-text" />~{estMin} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers size={12} className="text-accent-text" />
                        {prescriptions.length} mov. · {totalSets} séries
                      </span>
                    </div>

                    {/* Prévia clicável de exercícios (abre ExerciseSheet com passo a passo e vídeo) */}
                    <div className="mt-3.5 space-y-1.5 border-t border-line pt-3">
                      {displayedPrescriptions.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center text-xs gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="t-data text-[11px] text-muted shrink-0">
                              {String(idx + 1).padStart(2, "0")}.
                            </span>
                            <ExerciseLink
                              exerciseId={p.exerciseId}
                              className="font-medium text-foreground truncate inline-flex items-center gap-1"
                            >
                              <span className="truncate">{p.exerciseNamePt}</span>
                              <Info
                                size={11}
                                className="text-muted shrink-0 opacity-70"
                              />
                            </ExerciseLink>
                          </div>
                          <span className="t-data text-[11px] text-muted shrink-0">
                            {p.targetSets}×{p.targetReps}
                          </span>
                        </div>
                      ))}

                      {prescriptions.length > 4 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(routine.id)}
                          className="t-aux text-accent-text hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Mostrar menos</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              <span>
                                Ver todos os {prescriptions.length} movimentos
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ações do card */}
                  <div className="pt-3.5 border-t border-line flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDuplicate(routine.id)}
                        className="btn btn-ghost h-9 w-9 p-0"
                        title="Duplicar ficha"
                        aria-label={`Duplicar ${routine.title}`}
                      >
                        <Copy size={14} strokeWidth={1.75} />
                      </button>

                      <Link
                        href={`/treinos/${routine.id}/imprimir`}
                        className="btn btn-ghost h-9 px-2.5 text-xs font-mono"
                        title="Imprimir folha técnica A4 ou salvar em PDF"
                      >
                        <Printer size={14} strokeWidth={1.75} />
                        <span>A4</span>
                      </Link>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStartRoutine(routine)}
                      className="btn btn-dark h-9 px-4 text-xs"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{isStartingThis ? "Abrindo..." : "Treinar"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
