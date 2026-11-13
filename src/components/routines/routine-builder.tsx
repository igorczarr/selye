"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoutine } from "@/actions/routines";
import { Plus, Trash2, ArrowUp, ArrowDown, Dumbbell, Clock } from "lucide-react";

interface ExerciseOption {
  id: string;
  namePt: string;
  nameEn: string | null;
  secondaryMuscles: string[] | null;
}

interface RoutineItem {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  targetLoadKg: number;
  restSeconds: number;
  setType: string;
}

export function RoutineBuilder({ availableExercises }: { availableExercises: ExerciseOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modalityCode, setModalityCode] = useState("strength");
  const [selectedItems, setSelectedItems] = useState<RoutineItem[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(availableExercises[0]?.id || "");

  const handleAddExercise = () => {
    const ex = availableExercises.find((e) => e.id === selectedExerciseId);
    if (!ex) return;

    setSelectedItems((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.namePt || ex.nameEn || "Exercício",
        targetSets: 4,
        targetReps: "8-12",
        targetLoadKg: 50,
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

  const handleUpdate = (index: number, field: keyof RoutineItem, value: any) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Informe o título da ficha.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Adicione pelo menos 1 exercício à ficha.");
      return;
    }

    startTransition(async () => {
      await createRoutine({
        title,
        description,
        modalityCode,
        exercises: selectedItems.map((item, idx) => ({
          exerciseId: item.exerciseId,
          orderIndex: idx + 1,
          targetSets: Number(item.targetSets),
          targetReps: item.targetReps,
          targetLoadKg: Number(item.targetLoadKg) || undefined,
          restSeconds: Number(item.restSeconds) || 90,
          setType: item.setType,
        })),
      });

      router.push("/treinos");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Dados Gerais da Ficha */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <span className="t-label">Identificação da Programação</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="t-aux text-grafite font-semibold">Nome da Ficha / Rotina</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rotina A · Peito, Ombro e Tríceps"
              className="h-11 px-3.5 rounded-md border border-line bg-background text-sm focus:outline-none focus:ring-1 focus:ring-profundo"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="t-aux text-grafite font-semibold">Modalidade</label>
            <select
              value={modalityCode}
              onChange={(e) => setModalityCode(e.target.value)}
              className="h-11 px-3 rounded-md border border-line bg-background text-sm focus:outline-none focus:ring-1 focus:ring-profundo"
            >
              <option value="strength">Musculação</option>
              <option value="calisthenics">Calistenia</option>
              <option value="functional">Funcional</option>
              <option value="running">Corrida</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="t-aux text-grafite font-semibold">Observações / Objetivo (Opcional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Foco em progressão de carga linear no primeiro exercício; controlar fase excêntrica."
            className="p-3 rounded-md border border-line bg-background text-sm focus:outline-none focus:ring-1 focus:ring-profundo"
          />
        </div>
      </div>

      {/* Adicionar Exercícios */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="t-label">Prescrição de Movimentos (§9.2)</span>
            <h3 className="t-h2 mt-1">Exercícios da Sessão</h3>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="h-10 px-3 rounded-md border border-line bg-background text-sm max-w-xs"
            >
              {availableExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.namePt} ({ex.secondaryMuscles?.[0] || "Geral"})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddExercise}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-md bg-grafite text-osso text-xs font-semibold hover:bg-noite transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {selectedItems.length === 0 ? (
          <div className="py-10 border border-dashed border-line rounded-md text-center text-muted text-sm flex flex-col items-center gap-2">
            <Dumbbell size={28} className="text-muted/60" />
            <span>Nenhum exercício selecionado para esta rotina.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-md border border-line p-4 bg-osso/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="t-data text-xs px-2 py-1 rounded bg-surface border border-line text-profundo">
                    0{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm">{item.exerciseName}</h4>
                    <span className="t-aux text-muted">Tipo: {item.setType}</span>
                  </div>
                </div>

                {/* Parâmetros Prescritos (§9.2) */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="t-aux text-muted">Séries:</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={item.targetSets}
                      onChange={(e) => handleUpdate(idx, "targetSets", e.target.value)}
                      className="w-14 h-8 px-2 text-center rounded border border-line bg-surface text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="t-aux text-muted">Reps:</span>
                    <input
                      type="text"
                      value={item.targetReps}
                      onChange={(e) => handleUpdate(idx, "targetReps", e.target.value)}
                      placeholder="8-12"
                      className="w-18 h-8 px-2 text-center rounded border border-line bg-surface text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="t-aux text-muted">Carga:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={item.targetLoadKg}
                      onChange={(e) => handleUpdate(idx, "targetLoadKg", e.target.value)}
                      className="w-16 h-8 px-2 text-center rounded border border-line bg-surface text-xs font-mono"
                    />
                    <span className="t-aux text-muted">kg</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="t-aux text-muted">Pausa:</span>
                    <input
                      type="number"
                      step="15"
                      value={item.restSeconds}
                      onChange={(e) => handleUpdate(idx, "restSeconds", e.target.value)}
                      className="w-16 h-8 px-2 text-center rounded border border-line bg-surface text-xs font-mono"
                    />
                    <span className="t-aux text-muted">s</span>
                  </div>

                  {/* Ordenação e Remoção */}
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1.5 rounded border border-line text-muted hover:text-grafite disabled:opacity-30 cursor-pointer"
                      title="Subir"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedItems.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1.5 rounded border border-line text-muted hover:text-grafite disabled:opacity-30 cursor-pointer"
                      title="Descer"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer ml-1"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações de Envio */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/treinos")}
          className="h-11 px-5 rounded-md border border-line text-sm font-medium hover:bg-osso transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-6 rounded-md bg-grafite text-osso font-semibold text-sm hover:bg-noite transition-colors shadow-xs cursor-pointer"
        >
          {isPending ? "Salvando Ficha..." : "Salvar Rotina"}
        </button>
      </div>
    </form>
  );
}
