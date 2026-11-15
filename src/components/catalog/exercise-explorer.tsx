"use client";

import { useState, useEffect } from "react";
import { Search, X, ShieldAlert, Dumbbell } from "lucide-react";

interface ExerciseItem {
  id: string;
  namePt: string;
  nameEn: string | null;
  difficulty: string | null;
  instructionsPt: string | null;
  safetyInfoPt: string | null;
  equipmentCodes: string[] | null;
  secondaryMuscles: string[] | null;
}

const MUSCLE_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Peitoral", value: "Peitoral" },
  { label: "Dorsais", value: "Dorsais / Costas" },
  { label: "Quadríceps", value: "Quadríceps" },
  { label: "Bíceps", value: "Bíceps" },
  { label: "Tríceps", value: "Tríceps" },
  { label: "Abdômen", value: "Abdômen" },
];

export function ExerciseExplorer({ exercises }: { exercises: ExerciseItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");
  const [activeExercise, setActiveExercise] = useState<ExerciseItem | null>(null);

  useEffect(() => {
    if (!activeExercise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveExercise(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeExercise]);

  const filtered = exercises.filter((ex) => {
    const matchesSearch =
      ex.namePt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.nameEn && ex.nameEn.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMuscle =
      selectedMuscle === "all" ||
      (ex.secondaryMuscles && ex.secondaryMuscles.includes(selectedMuscle));

    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="t-label">Catálogo Biomecânico</span>
          <h2 className="t-h2 mt-1">Biblioteca de Movimentos</h2>
        </div>
        <span className="t-data text-xs text-muted">
          {filtered.length} {filtered.length === 1 ? "movimento" : "movimentos"}
        </span>
      </div>

      {/* Busca e Filtros de Grupo Muscular */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar movimento em português ou inglês..."
            aria-label="Buscar movimento na biblioteca"
            className="input h-10 pl-10 text-sm"
          />
        </div>

        <div
          role="group"
          aria-label="Filtrar por grupo muscular"
          className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0"
        >
          {MUSCLE_FILTERS.map((m) => {
            const active = selectedMuscle === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedMuscle(m.value)}
                className={`h-10 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-foreground text-background font-semibold"
                    : "bg-foreground/5 text-muted hover:text-foreground hover:bg-foreground/10"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade de Exercícios */}
      {filtered.length === 0 ? (
        <div className="py-12 border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2">
          <Dumbbell size={26} className="text-muted/60" />
          <p className="text-sm font-medium text-foreground">
            Nenhum movimento corresponde ao filtro atual
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedMuscle("all");
            }}
            className="btn btn-ghost h-9 px-3 text-xs mt-1"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setActiveExercise(ex)}
              className="text-left rounded-xl border border-line p-4 hover:border-mineral bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm text-foreground">
                    {ex.namePt}
                  </p>
                  <span className="chip text-xs shrink-0">
                    {ex.difficulty || "geral"}
                  </span>
                </div>
                <p className="t-aux text-muted mt-1">
                  {ex.secondaryMuscles?.[0] || "Musculação"}
                </p>
              </div>
              {ex.equipmentCodes && ex.equipmentCodes.length > 0 && (
                <p className="t-data text-xs text-accent-text mt-3">
                  Equipamento: {ex.equipmentCodes.join(", ")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal de Instruções Técnicas */}
      {activeExercise && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise-modal-title"
          onClick={() => setActiveExercise(null)}
          className="fixed inset-0 bg-noite/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card max-w-lg w-full p-6 flex flex-col gap-5 shadow-xl fade-up"
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="t-label">Ficha Biomecânica</span>
                <h3 id="exercise-modal-title" className="t-h2 mt-1">
                  {activeExercise.namePt}
                </h3>
                {activeExercise.nameEn && (
                  <p className="t-aux text-muted mt-0.5">
                    Referência internacional: {activeExercise.nameEn}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Fechar detalhes do exercício"
                onClick={() => setActiveExercise(null)}
                className="btn btn-ghost h-9 w-9 p-0 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-sm space-y-4 max-h-80 overflow-y-auto pr-1">
              <div>
                <span className="t-label !text-accent-text">
                  Execução do Movimento
                </span>
                <p className="text-muted text-sm mt-1.5 leading-relaxed">
                  {activeExercise.instructionsPt ||
                    "Mantenha estabilidade articular e amplitude controlada durante toda a repetição."}
                </p>
              </div>

              {activeExercise.safetyInfoPt && (
                <div className="p-3.5 rounded-xl bg-lima/15 border border-profundo/30 flex items-start gap-3">
                  <ShieldAlert
                    size={18}
                    className="text-profundo shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="t-label !text-accent-text">
                      Segurança Biomecânica
                    </span>
                    <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                      {activeExercise.safetyInfoPt}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveExercise(null)}
              className="btn btn-dark w-full h-11"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
