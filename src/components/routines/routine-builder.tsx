"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoutine, updateRoutine } from "@/actions/routines";
import { ExerciseLink } from "@/components/catalog/exercise-link";
import { useExerciseSheet } from "@/components/catalog/exercise-sheet";
import { WEEKDAYS_MONDAY_FIRST } from "@/lib/week";
import {
  estimateRoutineDurationMinutes,
  countTotalSets,
} from "@/lib/routine-metrics";
import {
  EXERCISE_CATEGORIES,
  classifyExerciseCategory,
  CATEGORY_MAP,
  type ExerciseCategoryId,
} from "@/core/catalog/exercise-categories";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Search,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";

interface ExerciseOption {
  id: string;
  namePt: string;
  nameEn: string | null;
  modalityCode?: string | null;
  secondaryMuscles: string[] | null;
}

interface RoutineItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: string;
  targetLoadKg: number;
  restSeconds: number;
  setType: string;
}

const SET_TYPE_LABELS: Record<string, string> = {
  effective: "Série principal",
  warmup: "Aquecimento leve",
  feeder: "Preparação (carga média)",
  backoff: "Série final (carga reduzida)",
};

interface InitialRoutineData {
  id: string;
  title: string;
  description: string;
  modalityCode: string;
  dayOfWeek: number | null;
  exercises: RoutineItem[];
}

export function RoutineBuilder({
  availableExercises,
  initialRoutine,
}: {
  availableExercises: ExerciseOption[];
  initialRoutine?: InitialRoutineData;
}) {
  const router = useRouter();
  const { open: openExerciseSheet } = useExerciseSheet();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialRoutine?.title || "");
  const [description, setDescription] = useState(
    initialRoutine?.description || ""
  );
  const [modalityCode, setModalityCode] = useState(
    initialRoutine?.modalityCode || "strength"
  );
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(
    initialRoutine?.dayOfWeek ?? null
  );
  const [selectedItems, setSelectedItems] = useState<RoutineItem[]>(
    initialRoutine?.exercises || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ExerciseCategoryId | "all">("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    availableExercises[0]?.id || ""
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exercisesWithCategory = useMemo(
    () =>
      availableExercises.map((ex) => ({
        ...ex,
        categoryId: classifyExerciseCategory(ex),
      })),
    [availableExercises]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exercisesWithCategory.length };
    for (const ex of exercisesWithCategory) {
      counts[ex.categoryId] = (counts[ex.categoryId] || 0) + 1;
    }
    return counts;
  }, [exercisesWithCategory]);

  const filteredCatalog = useMemo(() => {
    return exercisesWithCategory.filter((ex) => {
      if (activeCategory !== "all" && ex.categoryId !== activeCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ex.namePt.toLowerCase().includes(q) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(q)) ||
        CATEGORY_MAP[ex.categoryId].label.toLowerCase().includes(q) ||
        (ex.secondaryMuscles &&
          ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q)))
      );
    });
  }, [exercisesWithCategory, activeCategory, searchQuery]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<ExerciseCategoryId, typeof filteredCatalog>();
    for (const cat of EXERCISE_CATEGORIES) {
      const items = filteredCatalog.filter((e) => e.categoryId === cat.id);
      if (items.length > 0) {
        map.set(cat.id, items);
      }
    }
    return map;
  }, [filteredCatalog]);

  const addExerciseById = (id: string) => {
    const ex = availableExercises.find((e) => e.id === id);
    if (!ex) return;
    setErrorMessage(null);
    setSelectedItems((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.namePt || ex.nameEn || "Exercício",
        muscleGroup: ex.secondaryMuscles?.[0] || "Geral",
        targetSets: 4,
        targetReps: "8-12",
        targetLoadKg: 40,
        restSeconds: 90,
        setType: "effective",
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newItems = [...selectedItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setSelectedItems(newItems);
  };

  const handleUpdate = (
    index: number,
    field: keyof RoutineItem,
    value: string | number
  ) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Informe um nome para identificar esta ficha de treino.");
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMessage("Adicione pelo menos 1 exercício antes de salvar a rotina.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        modalityCode,
        dayOfWeek,
        exercises: selectedItems.map((item, idx) => ({
          exerciseId: item.exerciseId,
          orderIndex: idx + 1,
          targetSets: Number(item.targetSets) || 1,
          targetReps: item.targetReps || "10",
          targetLoadKg: Number(item.targetLoadKg) || undefined,
          restSeconds: Number(item.restSeconds) || 90,
          setType: item.setType,
        })),
      };

      if (initialRoutine?.id) {
        await updateRoutine(initialRoutine.id, payload);
      } else {
        await createRoutine(payload);
      }

      router.push("/treinos");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 fade-up" noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 flex items-center gap-3 text-sm text-foreground"
        >
          <AlertCircle size={18} className="text-profundo shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Dados Gerais da Ficha */}
      <section className="card p-6 flex flex-col gap-4">
        <span className="t-label">Identificação da Programação</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="routine-title" className="t-aux text-foreground font-semibold">
              Nome da Ficha / Rotina
            </label>
            <input
              id="routine-title"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Ex: Treino A · Empurrar e Estabilidade Escapular"
              className="input h-11 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routine-modality" className="t-aux text-foreground font-semibold">
              Modalidade Principal
            </label>
            <select
              id="routine-modality"
              value={modalityCode}
              onChange={(e) => setModalityCode(e.target.value)}
              className="input h-11 text-sm"
            >
              <option value="strength">Musculação</option>
              <option value="beach_volleyball">Vôlei de Praia</option>
              <option value="calisthenics">Calistenia</option>
              <option value="functional">Funcional</option>
              <option value="running">Corrida</option>
            </select>
          </div>
        </div>

        {/* Dia da Semana (Segunda → Domingo) */}
        <div className="flex flex-col gap-1.5">
          <span className="t-aux text-foreground font-semibold">
            Dia da Semana (Opcional · Seg → Dom)
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDayOfWeek(null)}
              aria-pressed={dayOfWeek === null}
              className={`h-9 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                dayOfWeek === null
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              Flexível
            </button>
            {WEEKDAYS_MONDAY_FIRST.map((day) => {
              const selected = dayOfWeek === day.jsDay;
              return (
                <button
                  key={day.shortPt}
                  type="button"
                  onClick={() => setDayOfWeek(day.jsDay)}
                  aria-pressed={selected}
                  className={`h-9 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    selected
                      ? "bg-lima text-grafite border-lima font-semibold"
                      : "border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {day.shortPt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="routine-notes" className="t-aux text-foreground font-semibold">
            Objetivo ou Lembretes da Ficha (Opcional)
          </label>
          <textarea
            id="routine-notes"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Fazer os movimentos de forma controlada, mantendo boa postura e respiração constante."
            className="input h-auto py-2.5 text-sm resize-y"
          />
        </div>
      </section>

      {/* Seletor e Lista de Exercícios */}
      <section className="card p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="t-label">Prescrição de Movimentos</span>
            <h2 className="t-h2 mt-1">Exercícios da Sessão</h2>
          </div>
          <div className="flex items-center gap-3">
            {selectedItems.length > 0 && (
              <span className="chip text-xs font-mono">
                <Clock size={12} />~
                {estimateRoutineDurationMinutes(selectedItems)} min ·{" "}
                {countTotalSets(selectedItems)} séries
              </span>
            )}
            <span className="t-data text-xs text-muted">
              {selectedItems.length}{" "}
              {selectedItems.length === 1
                ? "movimento prescrito"
                : "movimentos prescritos"}
            </span>
          </div>
        </div>

        {/* Abas de Categorias de Exercícios + Barra de Busca */}
        <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-foreground/[0.03] border border-line">
          <div
            role="tablist"
            aria-label="Categorias de exercícios"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => {
                setActiveCategory("all");
                if (exercisesWithCategory[0]) {
                  setSelectedExerciseId(exercisesWithCategory[0].id);
                }
              }}
              className={`h-8 px-3 rounded-lg text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "bg-surface border border-line text-muted hover:text-foreground"
              }`}
            >
              Todas ({categoryCounts.all || 0})
            </button>

            {EXERCISE_CATEGORIES.filter((c) => (categoryCounts[c.id] || 0) > 0).map(
              (cat) => {
                const selected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      const firstInCat = exercisesWithCategory.find(
                        (e) => e.categoryId === cat.id
                      );
                      if (firstInCat) setSelectedExerciseId(firstInCat.id);
                    }}
                    className={`h-8 px-3 rounded-lg text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                      selected
                        ? "bg-lima text-grafite font-semibold"
                        : "bg-surface border border-line text-muted hover:text-foreground"
                    }`}
                  >
                    {cat.shortLabel} ({categoryCounts[cat.id] || 0})
                  </button>
                );
              }
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5 relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  const firstMatch = exercisesWithCategory.find(
                    (ex) =>
                      (activeCategory === "all" ||
                        ex.categoryId === activeCategory) &&
                      (ex.namePt.toLowerCase().includes(q.toLowerCase()) ||
                        (ex.secondaryMuscles?.[0] || "")
                          .toLowerCase()
                          .includes(q.toLowerCase()))
                  );
                  if (firstMatch) setSelectedExerciseId(firstMatch.id);
                }}
                placeholder="Filtrar exercícios nesta categoria..."
                aria-label="Filtrar catálogo de exercícios"
                className="input h-10 pl-9 text-xs"
              />
            </div>

            <div className="sm:col-span-5">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                aria-label="Selecionar exercício do catálogo"
                className="input h-10 text-xs"
              >
                {filteredCatalog.length === 0 ? (
                  <option value="">Nenhum movimento nesta categoria</option>
                ) : (
                  Array.from(groupedCatalog.entries()).map(([catId, items]) => (
                    <optgroup key={catId} label={CATEGORY_MAP[catId].label}>
                      {items.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.namePt}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            <div className="sm:col-span-2 flex gap-1.5">
              <button
                type="button"
                disabled={!selectedExerciseId || filteredCatalog.length === 0}
                onClick={() => openExerciseSheet(selectedExerciseId)}
                aria-label="Ver ficha técnica do exercício selecionado"
                title="Ver vídeo demonstrativo e execução"
                className="btn btn-ghost h-10 w-10 p-0 shrink-0"
              >
                <Info size={16} />
              </button>
              <button
                type="button"
                disabled={!selectedExerciseId || filteredCatalog.length === 0}
                onClick={() => addExerciseById(selectedExerciseId)}
                className="btn btn-primary flex-1 h-10 text-xs"
              >
                <Plus size={16} />
                <span>Inserir</span>
              </button>
            </div>
          </div>
        </div>

        {selectedItems.length === 0 ? (
          <div className="py-12 border border-dashed border-line rounded-xl text-center text-muted text-sm flex flex-col items-center gap-2">
            <Dumbbell size={28} className="text-muted/60" strokeWidth={1.5} />
            <p className="font-medium text-foreground">Sua ficha ainda está vazia</p>
            <p className="text-xs text-muted max-w-xs">
              Selecione movimentos acima para definir séries, repetições, carga-alvo e intervalos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedItems.map((item, idx) => (
              <div
                key={`${item.exerciseId}-${idx}`}
                className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="t-data text-xs px-2.5 py-1 rounded-md bg-surface border border-line text-accent-text font-semibold">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">
                        <ExerciseLink exerciseId={item.exerciseId}>
                          {item.exerciseName}
                        </ExerciseLink>
                      </h3>
                      <span className="t-aux text-muted">
                        {item.muscleGroup} · {SET_TYPE_LABELS[item.setType] || item.setType}
                      </span>
                    </div>
                  </div>

                  {/* Controles de ordem e remoção */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      aria-label={`Mover ${item.exerciseName} para cima`}
                      className="btn btn-ghost h-9 w-9 p-0"
                      title="Subir posição"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedItems.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      aria-label={`Mover ${item.exerciseName} para baixo`}
                      className="btn btn-ghost h-9 w-9 p-0"
                      title="Descer posição"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      aria-label={`Remover ${item.exerciseName} da ficha`}
                      className="btn btn-ghost h-9 w-9 p-0 text-muted hover:text-foreground"
                      title="Remover exercício"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Grade tabular de parâmetros (alvos de toque >= 40px) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-line/60">
                  <label className="flex flex-col gap-1">
                    <span className="t-label">Séries</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={item.targetSets}
                      onChange={(e) => handleUpdate(idx, "targetSets", e.target.value)}
                      className="input h-10 text-center t-data text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="t-label">Repetições</span>
                    <input
                      type="text"
                      value={item.targetReps}
                      onChange={(e) => handleUpdate(idx, "targetReps", e.target.value)}
                      placeholder="8-12"
                      className="input h-10 text-center t-data text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="t-label">Carga (kg)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={item.targetLoadKg}
                      onChange={(e) => handleUpdate(idx, "targetLoadKg", e.target.value)}
                      className="input h-10 text-center t-data text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="t-label">Descanso (s)</span>
                    <input
                      type="number"
                      step="15"
                      min={0}
                      value={item.restSeconds}
                      onChange={(e) => handleUpdate(idx, "restSeconds", e.target.value)}
                      className="input h-10 text-center t-data text-sm"
                    />
                  </label>

                  <label className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                    <span className="t-label">Tipo de Série</span>
                    <select
                      value={item.setType}
                      onChange={(e) => handleUpdate(idx, "setType", e.target.value)}
                      className="input h-10 text-xs"
                    >
                      <option value="effective">Principal (Normal)</option>
                      <option value="warmup">Aquecimento</option>
                      <option value="feeder">Preparação</option>
                      <option value="backoff">Carga Reduzida</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rodapé de Ações */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/treinos")}
          className="btn btn-ghost h-11 px-5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary h-11 px-6"
        >
          {isPending ? "Salvando ficha..." : "Salvar Rotina"}
        </button>
      </div>
    </form>
  );
}
