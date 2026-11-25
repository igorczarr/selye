"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  toggleDailyHabitLog,
  addStarterHealthyHabitsPack,
} from "@/actions/habits";
import type {
  HabitAxisCode,
  HealthyHabitsSnapshot,
} from "@/core/habits/healthy-habits-catalog";
import {
  Check,
  CheckCircle2,
  Flame,
  HeartPulse,
  Settings2,
  Sparkles,
  Droplets,
  Sun,
  Activity,
  Wind,
  Utensils,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const AXIS_ICON: Record<HabitAxisCode, typeof Droplets> = {
  hydration: Droplets,
  circadian_sleep: Sun,
  movement: Activity,
  mind_recovery: Wind,
  nutrition: Utensils,
  custom: Layers,
};

export function DailyHabitsWidget({
  snapshot,
}: {
  snapshot: HealthyHabitsSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticMap, setOptimisticMap] = useState<Record<string, boolean>>(
    {}
  );
  const [showImpactDetails, setShowImpactDetails] = useState(false);

  const habits = snapshot.habits.map((h) => ({
    ...h,
    completedToday:
      typeof optimisticMap[h.id] === "boolean"
        ? optimisticMap[h.id]
        : h.completedToday,
  }));

  const totalCount = habits.length;
  const completedCount = habits.filter((h) => h.completedToday).length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const eaBonusToday = habits
    .filter((h) => h.completedToday)
    .reduce((sum, h) => sum + (h.eaImpact || 0), 0);

  const handleToggle = (habitId: string, currentCompleted: boolean) => {
    const next = !currentCompleted;
    setOptimisticMap((prev) => ({ ...prev, [habitId]: next }));
    startTransition(async () => {
      await toggleDailyHabitLog(habitId, snapshot.todayDateStr);
      router.refresh();
    });
  };

  const handleQuickActivateStarter = () => {
    startTransition(async () => {
      await addStarterHealthyHabitsPack();
      router.refresh();
    });
  };

  // Estado vazio: convite breve e elegante para iniciar a lista de hábitos
  if (totalCount === 0) {
    return (
      <section
        aria-label="Hábitos Saudáveis Diários"
        className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-line"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-lima/20 text-accent-text flex items-center justify-center shrink-0 mt-0.5">
            <HeartPulse size={17} />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-text font-bold">
              Hábitos Saudáveis Diários
            </span>
            <h3 className="text-sm font-semibold text-foreground mt-0.5">
              Monte sua rotina diária de saúde e acompanhe seu progresso
            </h3>
            <p className="text-xs text-muted mt-0.5">
              4L de água, 10 min de sol, mobilidade, respiração, caminhada e 4
              refeições limpas — ou cadastre seus próprios hábitos no Perfil.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isPending}
            onClick={handleQuickActivateStarter}
            className="btn btn-primary h-9 px-3.5 text-xs font-mono font-bold inline-flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>{isPending ? "Ativando..." : "Ativar 6 Essenciais"}</span>
          </button>
          <Link
            href="/perfil#habitos"
            className="btn btn-ghost h-9 px-3 text-xs font-mono"
          >
            Personalizar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Hábitos Saudáveis Diários"
      className={`card p-4 sm:p-5 flex flex-col gap-3.5 transition-all ${
        allDone
          ? "border-emerald-500/45 ring-1 ring-emerald-500/20 bg-gradient-to-br from-surface via-surface to-emerald-500/[0.04]"
          : ""
      }`}
    >
      {/* Topo: Título + Progresso + Streak + Link Perfil */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-accent-text">
            <HeartPulse size={13} />
            <span>Hábitos Saudáveis</span>
          </span>

          {allDone ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
              <CheckCircle2 size={11} />
              <span>Dia 100% feito</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-foreground/8 text-foreground text-[10px] font-mono font-bold">
              {completedCount}/{totalCount} hoje
            </span>
          )}

          {snapshot.currentStreakDays > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lima/15 text-accent-text text-[10px] font-mono font-semibold">
              <Flame size={10} />
              <span>{snapshot.currentStreakDays}d</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImpactDetails((v) => !v)}
            className="text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1 py-1 px-2 rounded hover:bg-foreground/[0.04] transition-colors cursor-pointer"
          >
            <span>{showImpactDetails ? "Ocultar impacto" : "Ver impacto"}</span>
            {showImpactDetails ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>

          <Link
            href="/perfil#habitos"
            className="text-[11px] font-mono text-accent-text hover:underline inline-flex items-center gap-1 py-1 px-2 rounded hover:bg-lima/10 transition-colors"
          >
            <Settings2 size={12} />
            <span>Perfil</span>
          </Link>
        </div>
      </div>

      {/* Barra slim de progresso + Acompanhamento vivo do Selye */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]"
                  : "bg-gradient-to-r from-lima to-emerald-400"
              }`}
              style={{ width: `${Math.max(completionPct > 0 ? 6 : 0, completionPct)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold text-foreground shrink-0">
            {completionPct}%
            {eaBonusToday > 0 && (
              <span className="text-accent-text ml-1.5">+{eaBonusToday} EA</span>
            )}
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          {allDone
            ? `Rotina completa hoje (+${eaBonusToday} EA de suporte). Você fechou todos os ${totalCount} hábitos — consistência que protege sua energia, sono e longevidade.`
            : snapshot.impactNarrativePt}
        </p>
      </div>

      {/* Grid de Marcação Diária (1 toque: feito / não feito) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {habits.map((habit) => {
          const AxisIcon = AXIS_ICON[habit.axis.code] || Layers;
          return (
            <button
              key={habit.id}
              type="button"
              disabled={isPending}
              onClick={() => handleToggle(habit.id, habit.completedToday)}
              aria-pressed={habit.completedToday}
              className={`rounded-xl border p-3 text-left flex items-start gap-2.5 transition-all cursor-pointer group ${
                habit.completedToday
                  ? "border-emerald-500/45 bg-emerald-500/[0.08]"
                  : "border-line bg-foreground/[0.02] hover:border-foreground/35"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  habit.completedToday
                    ? "bg-emerald-400 border-emerald-400 text-grafite shadow-[0_0_8px_rgba(52,211,153,0.35)]"
                    : "border-line bg-surface text-transparent group-hover:border-foreground/50"
                }`}
              >
                <Check size={13} strokeWidth={2.8} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold ${habit.axis.accentColorClass}`}
                  >
                    <AxisIcon size={10} />
                    <span>{habit.axis.shortLabelPt}</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted shrink-0">
                    {habit.targetLabel || `+${habit.eaImpact} EA`}
                  </span>
                </div>

                <p className="text-xs font-semibold text-foreground mt-0.5 leading-snug flex items-center gap-1.5 flex-wrap">
                  <span>{habit.title}</span>
                  {habit.completedToday && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                      Feito
                    </span>
                  )}
                </p>

                {showImpactDetails && habit.positiveImpactPt && (
                  <p className="text-[11px] text-muted mt-1 leading-snug animate-in fade-in duration-150">
                    {habit.positiveImpactPt}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
