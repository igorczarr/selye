"use client";

import type { ReactNode } from "react";
import { useExerciseSheet } from "@/components/catalog/exercise-sheet";

/** Texto/linha clicável que abre a ficha técnica do exercício. */
export function ExerciseLink({
  exerciseId,
  className,
  children,
}: {
  exerciseId: string;
  className?: string;
  children: ReactNode;
}) {
  const { open } = useExerciseSheet();
  return (
    <button
      type="button"
      onClick={() => open(exerciseId)}
      className={`text-left hover:underline underline-offset-2 cursor-pointer ${className ?? ""}`}
      aria-label="Ver como executar o exercício"
    >
      {children}
    </button>
  );
}
