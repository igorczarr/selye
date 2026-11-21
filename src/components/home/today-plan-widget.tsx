"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  togglePlanDailyCommitment,
  type ActivePlanningSnapshot,
} from "@/actions/planning";
import type { EnergeticCyclePhase } from "@/core/planning/energetic-cycle-planner";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ArrowRight,
  Trophy,
} from "lucide-react";

const PHASE_DOT: Record<EnergeticCyclePhase, string> = {
  expansion: "bg-lima",
  stabilization: "bg-sky-400",
  absorption: "bg-amber-400",
  peak: "bg-emerald-400",
};

export function TodayPlanWidget({
  snapshot,
}: {
  snapshot: ActivePlanningSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticMap, setOptimisticMap] = useState<Record<string, boolean>>(
    {}
  );

  const { plan, progress, activeGoal, dailyCoach } = snapshot;
  const todayDay = progress.todayDay;
  if (!todayDay) return null;

  const commitments = todayDay.commitments.map((c) => ({
    ...c,
    isCompleted:
      typeof optimisticMap[c.id] === "boolean"
        ? optimisticMap[c.id]
        : c.isCompleted,
  }));

  const completedCount = commitments.filter((c) => c.isCompleted).length;
  const totalCount = commitments.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleToggle = (item: (typeof commitments)[number]) => {
    const next = !item.isCompleted;
    setOptimisticMap((prev) => ({ ...prev, [item.id]: next }));
    startTransition(async () => {
      await togglePlanDailyCommitment({
        commitmentKey: item.id,
        localDate: todayDay.dateStr,
        kind: item.kind,
        title: item.titlePt,
        eaSignedDelta: item.eaSignedDelta,
        goalId: activeGoal?.id || null,
      });
      router.refresh();
    });
  };

  return (
    <section
      aria-label="Seu Passo de Hoje no Calendário do Seu Corpo"
      className="card p-5 sm:p-6 flex flex-col gap-4"
    >
      {dailyCoach?.adaptation?.isSoftenedToday && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/25 text-amber-400 uppercase">
              {dailyCoach.adaptation.badgePt}
            </span>
            <span className="font-medium">{dailyCoach.adaptation.headlinePt}</span>
          </div>
          <span className="text-[11px] font-mono text-muted hidden sm:inline">
            Ajuste automático
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Esquerda (5 cols): Resumo do Ciclo & Barra de EA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 t-label !text-accent-text">
                <CalendarDays size={13} />
                <span>Seu Passo no Calendário do Seu Corpo</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/8 text-[10px] font-mono text-foreground">
                <span
                  className={`w-2 h-2 rounded-full ${PHASE_DOT[todayDay.phase]}`}
                />
                <span>{todayDay.phaseLabelPt}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2">
              <h2 className="t-h3 text-foreground truncate flex items-center gap-1.5">
                {plan.mode === "competition" && (
                  <Trophy size={15} className="text-accent-text shrink-0" />
                )}
                <span className="truncate">{plan.eventTitle}</span>
              </h2>
              <span className="t-data text-[11px] text-muted shrink-0">
                {progress.daysRemaining === 0
                  ? "Dia da Meta!"
                  : `Faltam ${progress.daysRemaining}d`}
              </span>
            </div>
          </div>

          {/* Barra de Progresso de EA rumo à meta */}
          <div className="rounded-xl border border-line bg-foreground/[0.025] p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted">Curva de Energia (EA)</span>
              <span className="text-foreground font-semibold">
                {progress.currentRealEa}{" "}
                <span className="text-muted font-normal">→</span>{" "}
                <span className="text-accent-text">{plan.projectedPeakEa} EA</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lima to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.max(8, progress.eaProgressPercent)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted">
              <span>{progress.trajectoryBadgePt}</span>
              <span>
                {progress.remainingEaToTarget > 0
                  ? `Faltam +${progress.remainingEaToTarget} EA`
                  : "Meta alcançada!"}
              </span>
            </div>
          </div>
        </div>

        {/* Direita (7 cols): Checklist Interativo de Hoje + Link do Calendário */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3.5 lg:border-l lg:border-line lg:pl-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="t-label">
                Compromissos de Hoje ({completedCount}/{totalCount})
              </span>
              {allDone ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-lima text-grafite text-[10px] font-mono font-bold">
                  <CheckCircle2 size={11} />
                  <span>Dia 100% cumprido!</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-muted">
                  Toque para marcar como feito
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {commitments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggle(item)}
                  aria-pressed={item.isCompleted}
                  className={`rounded-xl border p-3 text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    item.isCompleted
                      ? "border-lima bg-lima/12"
                      : "border-line bg-foreground/[0.02] hover:border-mineral"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      item.isCompleted
                        ? "bg-lima border-lima text-grafite"
                        : "border-line bg-surface text-transparent"
                    }`}
                  >
                    <Check size={13} strokeWidth={2.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-muted truncate">
                        {item.timeSlotLabelPt}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold shrink-0 ${
                          item.eaSignedDelta > 0
                            ? "text-accent-text"
                            : "text-foreground"
                        }`}
                      >
                        {item.eaImpactText}
                      </span>
                    </div>
                    <p
                      className={`text-xs font-semibold mt-0.5 leading-snug ${
                        item.isCompleted
                          ? "line-through text-muted"
                          : "text-foreground"
                      }`}
                    >
                      {item.titlePt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-line/70">
            <Link
              href="/calendario"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-text hover:underline"
            >
              <span>Abrir Calendário do Seu Corpo</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
