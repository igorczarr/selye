"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addHealthyHabit,
  addStarterHealthyHabitsPack,
  removeHealthyHabit,
} from "@/actions/habits";
import {
  HABIT_AXES,
  HABIT_PRESETS_CATALOG,
  type HabitAxisCode,
  type HealthyHabitsSnapshot,
} from "@/core/habits/healthy-habits-catalog";
import {
  Sparkles,
  Plus,
  Check,
  Trash2,
  Flame,
  Droplets,
  Sun,
  Activity,
  Wind,
  Utensils,
  Layers,
  ChevronDown,
  ChevronUp,
  HeartPulse,
} from "lucide-react";

const AXIS_ICON: Record<HabitAxisCode, typeof Droplets> = {
  hydration: Droplets,
  circadian_sleep: Sun,
  movement: Activity,
  mind_recovery: Wind,
  nutrition: Utensils,
  custom: Layers,
};

interface HealthyHabitsManagerProps {
  snapshot: HealthyHabitsSnapshot;
  targetUserId?: string;
  createdByRole?: "athlete" | "coach";
  compactTitle?: string;
}

export function HealthyHabitsManager({
  snapshot,
  targetUserId,
  createdByRole = "athlete",
  compactTitle,
}: HealthyHabitsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCatalogOpen, setIsCatalogOpen] = useState(
    snapshot.totalActiveCount === 0
  );
  const [selectedAxisFilter, setSelectedAxisFilter] = useState<
    HabitAxisCode | "all"
  >("all");
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Campos de cadastro de hábito personalizado
  const [customAxis, setCustomAxis] = useState<HabitAxisCode>("hydration");
  const [customTitle, setCustomTitle] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customImpact, setCustomImpact] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const activePresetCodes = new Set(
    snapshot.habits.map((h) => h.presetCode).filter(Boolean)
  );
  const activeTitlesLower = new Set(
    snapshot.habits.map((h) => h.title.trim().toLowerCase())
  );

  const filteredPresets =
    selectedAxisFilter === "all"
      ? HABIT_PRESETS_CATALOG
      : HABIT_PRESETS_CATALOG.filter((p) => p.axisCode === selectedAxisFilter);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3200);
  };

  const handleAddPreset = (presetCode: string) => {
    const preset = HABIT_PRESETS_CATALOG.find((p) => p.code === presetCode);
    if (!preset) return;
    setAddingKey(preset.code);
    startTransition(async () => {
      try {
        await addHealthyHabit({
          presetCode: preset.code,
          axisCode: preset.axisCode,
          title: preset.titlePt,
          targetLabel: preset.targetLabelPt,
          positiveImpactPt: preset.positiveImpactPt,
          eaImpact: preset.eaImpact,
          targetUserId,
          createdByRole,
        });
        showToast(`"${preset.titlePt}" adicionado à rotina diária.`);
        router.refresh();
      } finally {
        setAddingKey(null);
      }
    });
  };

  const handleActivateStarterPack = () => {
    setAddingKey("starter_pack");
    startTransition(async () => {
      try {
        const res = await addStarterHealthyHabitsPack(targetUserId);
        showToast(
          res.addedCount > 0
            ? `${res.addedCount} hábitos essenciais ativados na sua rotina!`
            : "Todos os hábitos essenciais já estão ativos."
        );
        router.refresh();
      } finally {
        setAddingKey(null);
      }
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setAddingKey("custom");
    startTransition(async () => {
      try {
        await addHealthyHabit({
          axisCode: customAxis,
          title: customTitle.trim(),
          targetLabel: customTarget.trim() || null,
          positiveImpactPt: customImpact.trim() || null,
          targetUserId,
          createdByRole,
        });
        setCustomTitle("");
        setCustomTarget("");
        setCustomImpact("");
        setShowCustomForm(false);
        showToast("Hábito personalizado cadastrado com sucesso.");
        router.refresh();
      } finally {
        setAddingKey(null);
      }
    });
  };

  const handleRemove = (habitId: string, title: string) => {
    setAddingKey(habitId);
    startTransition(async () => {
      try {
        await removeHealthyHabit(habitId);
        showToast(`"${title}" removido da rotina ativa.`);
        router.refresh();
      } finally {
        setAddingKey(null);
      }
    });
  };

  return (
    <section
      id="habitos"
      className="card p-6 flex flex-col gap-5 scroll-mt-24"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <HeartPulse size={13} className="text-accent-text" />
            <span className="t-label !text-accent-text">
              Rotina de Saúde & Qualidade de Vida
            </span>
          </div>
          <h2 className="t-h2 mt-1">
            {compactTitle || "Hábitos Saudáveis Diários"}
          </h2>
          <p className="text-muted text-xs mt-1 max-w-xl leading-relaxed">
            Escolha o eixo e os hábitos que sustentam sua saúde — ou cadastre o
            seu próprio hábito. Você marca diariamente na Home e acompanha o
            impacto positivo acumulado.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {snapshot.totalActiveCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-line bg-foreground/[0.025] text-xs font-mono">
              <Flame size={13} className="text-accent-text" />
              <span className="font-bold text-foreground">
                {snapshot.adherence7dPercent}%
              </span>
              <span className="text-muted text-[10px]">7d</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCatalogOpen((v) => !v)}
            className="btn btn-primary h-9 px-3.5 text-xs font-mono font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Adicionar Hábito</span>
            {isCatalogOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-lima/45 bg-lima/12 px-3.5 py-2.5 text-xs font-medium text-foreground flex items-center gap-2"
        >
          <Check size={14} className="text-accent-text shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Lista de Hábitos Ativos */}
      {snapshot.totalActiveCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-profundo/50 bg-foreground/[0.02] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-foreground block">
              Sua lista de hábitos saudáveis ainda está vazia
            </span>
            <p className="text-xs text-muted leading-relaxed">
              Comece em 1 clique com os 6 pilares essenciais (4L de água, 10 min
              de sol, mobilidade, 5 min de respiração, 10 min de caminhada e 4
              refeições limpas) ou monte do seu jeito abaixo.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleActivateStarterPack}
            className="btn btn-primary h-9 px-4 text-xs font-mono font-bold shrink-0 inline-flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>
              {addingKey === "starter_pack"
                ? "Ativando..."
                : "Ativar 6 Essenciais"}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted">
            <span>
              Rotina ativa ({snapshot.totalActiveCount}{" "}
              {snapshot.totalActiveCount === 1 ? "hábito" : "hábitos"})
            </span>
            <span className="text-accent-text font-semibold">
              {snapshot.completedTodayCount}/{snapshot.totalActiveCount} feitos
              hoje
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snapshot.habits.map((habit) => {
              const AxisIcon = AXIS_ICON[habit.axis.code] || Layers;
              return (
                <div
                  key={habit.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-all ${
                    habit.completedToday
                      ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                      : "border-line bg-foreground/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${habit.axis.badgeBgClass}`}
                        >
                          <AxisIcon size={10} />
                          <span>{habit.axis.shortLabelPt}</span>
                        </span>
                        {habit.createdByRole === "coach" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-lima/20 text-accent-text">
                            Treinador
                          </span>
                        )}
                        {habit.targetLabel && (
                          <span className="text-[10px] font-mono text-muted">
                            {habit.targetLabel}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-foreground mt-1.5 leading-snug">
                        {habit.title}
                      </h3>
                      {habit.positiveImpactPt && (
                        <p className="text-[11px] text-muted mt-1 leading-relaxed">
                          {habit.positiveImpactPt}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending && addingKey === habit.id}
                      onClick={() => handleRemove(habit.id, habit.title)}
                      title="Remover hábito da rotina"
                      aria-label={`Remover hábito ${habit.title}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Mini histórico 7 dias + Streak + Impacto EA */}
                  <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div
                      className="flex items-center gap-1"
                      title="Constância nos últimos 7 dias"
                    >
                      {habit.last7DaysStatus.map((day) => (
                        <span
                          key={day.dateStr}
                          className={`w-2.5 h-2.5 rounded-sm ${
                            day.completed
                              ? "bg-emerald-400"
                              : "bg-foreground/10"
                          }`}
                        />
                      ))}
                      <span className="text-muted ml-1">
                        {habit.completedLast7Days}/7d
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {habit.streakDays > 0 && (
                        <span className="text-foreground font-semibold">
                          {habit.streakDays}d seguidos
                        </span>
                      )}
                      <span className="text-accent-text font-bold">
                        +{habit.eaImpact} EA
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Catálogo por Eixo + Cadastro Personalizado */}
      {isCatalogOpen && (
        <div className="rounded-2xl border border-line bg-foreground/[0.02] p-4 sm:p-5 flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent-text font-bold block">
                1. Escolha o eixo e adicione hábitos
              </span>
              <p className="text-xs text-muted mt-0.5">
                Toque nos hábitos desejados ou cadastre um novo abaixo.
              </p>
            </div>
            {snapshot.totalActiveCount > 0 && snapshot.totalActiveCount < 6 && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleActivateStarterPack}
                className="text-[11px] font-mono text-accent-text hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} />
                <span>Completar com os 6 essenciais</span>
              </button>
            )}
          </div>

          {/* Filtro por Eixo */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedAxisFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer border ${
                selectedAxisFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface text-muted border-line hover:text-foreground"
              }`}
            >
              Todos os eixos
            </button>
            {HABIT_AXES.filter((a) => a.code !== "custom").map((axis) => {
              const Icon = AXIS_ICON[axis.code];
              const isActive = selectedAxisFilter === axis.code;
              return (
                <button
                  key={axis.code}
                  type="button"
                  onClick={() => {
                    setSelectedAxisFilter(axis.code);
                    setCustomAxis(axis.code);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isActive
                      ? "bg-lima text-grafite border-lima"
                      : "bg-surface text-muted border-line hover:text-foreground"
                  }`}
                >
                  <Icon size={12} />
                  <span>{axis.shortLabelPt}</span>
                </button>
              );
            })}
          </div>

          {/* Grid de Hábitos Sugeridos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPresets.map((preset) => {
              const alreadyAdded =
                activePresetCodes.has(preset.code) ||
                activeTitlesLower.has(preset.titlePt.trim().toLowerCase());
              const axis = HABIT_AXES.find((a) => a.code === preset.axisCode);
              const Icon = AXIS_ICON[preset.axisCode];

              return (
                <div
                  key={preset.code}
                  className={`rounded-xl border p-3 flex items-start justify-between gap-2.5 transition-all ${
                    alreadyAdded
                      ? "border-emerald-500/35 bg-emerald-500/[0.06]"
                      : "border-line bg-surface hover:border-foreground/30"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border ${
                          axis?.badgeBgClass || "border-line text-muted"
                        }`}
                      >
                        <Icon size={9} />
                        <span>{axis?.shortLabelPt}</span>
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        {preset.targetLabelPt}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {preset.titlePt}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug line-clamp-2">
                      {preset.positiveImpactPt}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={alreadyAdded || isPending}
                    onClick={() => handleAddPreset(preset.code)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-mono font-bold inline-flex items-center gap-1 shrink-0 transition-all ${
                      alreadyAdded
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                        : "bg-lima text-grafite hover:brightness-105 cursor-pointer"
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check size={12} />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} />
                        <span>
                          {addingKey === preset.code ? "..." : "Adicionar"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 2. Cadastro de Hábito Personalizado (se não houver no catálogo) */}
          <div className="pt-3 border-t border-line flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                Não encontrou o hábito que procura?
              </span>
              <button
                type="button"
                onClick={() => setShowCustomForm((v) => !v)}
                className="text-xs font-mono font-bold text-accent-text hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>
                  {showCustomForm
                    ? "Fechar cadastro"
                    : "Cadastrar hábito personalizado"}
                </span>
              </button>
            </div>

            {showCustomForm && (
              <form
                onSubmit={handleAddCustom}
                className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="custom-habit-axis"
                      className="text-[10px] font-mono uppercase text-muted font-semibold"
                    >
                      Eixo do Hábito
                    </label>
                    <select
                      id="custom-habit-axis"
                      value={customAxis}
                      onChange={(e) =>
                        setCustomAxis(e.target.value as HabitAxisCode)
                      }
                      className="input h-9 text-xs"
                    >
                      {HABIT_AXES.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.labelPt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="custom-habit-target"
                      className="text-[10px] font-mono uppercase text-muted font-semibold"
                    >
                      Meta diária (opcional)
                    </label>
                    <input
                      id="custom-habit-target"
                      type="text"
                      value={customTarget}
                      onChange={(e) => setCustomTarget(e.target.value)}
                      placeholder="Ex: 20 min, 5g, 15 páginas"
                      className="input h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="custom-habit-title"
                    className="text-[10px] font-mono uppercase text-muted font-semibold"
                  >
                    Nome do Hábito *
                  </label>
                  <input
                    id="custom-habit-title"
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Tomar creatina 5g, Leitura noturna, Banho frio 2 min..."
                    className="input h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="custom-habit-impact"
                    className="text-[10px] font-mono uppercase text-muted font-semibold"
                  >
                    Impacto positivo na sua vida (opcional)
                  </label>
                  <input
                    id="custom-habit-impact"
                    type="text"
                    value={customImpact}
                    onChange={(e) => setCustomImpact(e.target.value)}
                    placeholder="Se deixar em branco, o Selye preenche com o benefício fisiológico do eixo."
                    className="input h-9 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="btn btn-ghost h-9 px-3 text-xs font-mono"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !customTitle.trim()}
                    className="btn btn-primary h-9 px-4 text-xs font-mono font-bold"
                  >
                    {addingKey === "custom"
                      ? "Salvando..."
                      : "Cadastrar Hábito"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
