"use client";

import { useState } from "react";

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

export function ExerciseExplorer({ exercises }: { exercises: ExerciseItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("all");
  const [activeExercise, setActiveExercise] = useState<ExerciseItem | null>(null);

  const muscles = [
    { label: "Todos", value: "all" },
    { label: "Peitoral", value: "Peitoral" },
    { label: "Bíceps", value: "Bíceps" },
    { label: "Tríceps", value: "Tríceps" },
    { label: "Dorsais", value: "Dorsais / Costas" },
    { label: "Quadríceps", value: "Quadríceps" },
    { label: "Abdômen", value: "Abdômen" },
  ];

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
    <div className="rounded-lg bg-surface border border-line p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="t-label">Exercise Catalog (§6)</span>
          <h2 className="t-h2 mt-1">Biblioteca de Movimentos</h2>
        </div>
        <span className="t-data text-xs text-muted">{filtered.length} encontrados</span>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar exercício por nome..."
          className="flex-1 h-10 px-3 rounded-md border border-line bg-background text-sm focus:outline-none focus:ring-1 focus:ring-profundo"
        />
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {muscles.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMuscle(m.value)}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors cursor-pointer ${
                selectedMuscle === m.value
                  ? "bg-grafite text-osso font-medium"
                  : "bg-osso/80 text-muted hover:bg-osso"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Exercícios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            onClick={() => setActiveExercise(ex)}
            className="rounded-md border border-line p-3 hover:border-profundo cursor-pointer transition-colors bg-osso/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold text-sm">{ex.namePt}</p>
                <span className="t-label !text-[10px] px-1.5 py-0.5 rounded bg-surface border border-line">
                  {ex.difficulty || "geral"}
                </span>
              </div>
              <p className="t-aux text-muted mt-1">
                {ex.secondaryMuscles?.[0] || "Musculação"}
              </p>
            </div>
            {ex.equipmentCodes && ex.equipmentCodes.length > 0 && (
              <p className="t-data text-[11px] text-profundo mt-2">
                Equipamento: {ex.equipmentCodes.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Detalhes do Exercício */}
      {activeExercise && (
        <div className="fixed inset-0 bg-noite/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg border border-line max-w-lg w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Instruções Técnicas</span>
                <h3 className="t-h2 mt-1">{activeExercise.namePt}</h3>
                <p className="t-aux text-muted">Nome original: {activeExercise.nameEn}</p>
              </div>
              <button
                onClick={() => setActiveExercise(null)}
                className="text-muted hover:text-grafite text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-sm space-y-3 max-h-80 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-xs text-profundo uppercase tracking-wider">
                  Execução do Movimento
                </h4>
                <p className="text-muted text-xs mt-1 leading-relaxed">
                  {activeExercise.instructionsPt || "Instruções em processamento."}
                </p>
              </div>

              {activeExercise.safetyInfoPt && (
                <div className="p-3 rounded bg-amber-50/70 border border-amber-200">
                  <h4 className="font-semibold text-xs text-amber-900 uppercase tracking-wider">
                    Informações de Segurança
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                    {activeExercise.safetyInfoPt}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveExercise(null)}
              className="w-full h-10 rounded-md bg-grafite text-osso font-medium text-sm hover:bg-noite transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
