/**
 * Classificação Funcional e Anatômica do Catálogo de Exercícios (§Fase 10)
 * Organiza os movimentos em categorias claras em português para evitar listas
 * gigantes indiferenciadas na criação de fichas, busca (⌘K) e curadoria.
 */

export type ExerciseCategoryId =
  | "pernas"
  | "peito"
  | "costas"
  | "ombros"
  | "bracos"
  | "core"
  | "pliometria"
  | "areia"
  | "mobilidade";

export interface ExerciseCategoryMeta {
  id: ExerciseCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

export const EXERCISE_CATEGORIES: ExerciseCategoryMeta[] = [
  {
    id: "pernas",
    label: "Pernas & Glúteos",
    shortLabel: "Pernas",
    description: "Quadríceps, posteriores de coxa, glúteos, adutores e panturrilhas",
  },
  {
    id: "pliometria",
    label: "Potência & Pliometria",
    shortLabel: "Potência",
    description: "Saltos, LPO, tripla extensão e explosão muscular",
  },
  {
    id: "areia",
    label: "Vôlei de Praia & Areia",
    shortLabel: "Areia & Vôlei",
    description: "Deslocamentos na areia, ataque, bloqueio e transição específica",
  },
  {
    id: "peito",
    label: "Peito",
    shortLabel: "Peito",
    description: "Supinos, crucifixo, flexões e empurrar horizontal",
  },
  {
    id: "costas",
    label: "Costas & Dorsais",
    shortLabel: "Costas",
    description: "Remadas, puxadas, barra fixa e cadeia posterior superior",
  },
  {
    id: "ombros",
    label: "Ombros & Escápulas",
    shortLabel: "Ombros",
    description: "Desenvolvimentos, elevações, manguito rotador e estabilidade",
  },
  {
    id: "bracos",
    label: "Bíceps, Tríceps & Antebraço",
    shortLabel: "Braços",
    description: "Roscas, extensões de tríceps e força de pegada",
  },
  {
    id: "core",
    label: "Core & Abdômen",
    shortLabel: "Core",
    description: "Pranchas, anti-rotação, oblíquos e estabilização lombar",
  },
  {
    id: "mobilidade",
    label: "Mobilidade & Aquecimento",
    shortLabel: "Mobilidade",
    description: "Liberação miofascial, ativação articular e preparação de movimento",
  },
];

export const CATEGORY_MAP: Record<ExerciseCategoryId, ExerciseCategoryMeta> =
  Object.fromEntries(EXERCISE_CATEGORIES.map((c) => [c.id, c])) as Record<
    ExerciseCategoryId,
    ExerciseCategoryMeta
  >;

export interface CategorizableExercise {
  namePt: string;
  nameEn?: string | null;
  modalityCode?: string | null;
  secondaryMuscles?: string[] | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Classifica deterministicamente qualquer exercício do catálogo em uma das 9 categorias.
 */
export function classifyExerciseCategory(
  ex: CategorizableExercise
): ExerciseCategoryId {
  const fullName = normalize(`${ex.namePt || ""} ${ex.nameEn || ""}`);
  const muscles = normalize((ex.secondaryMuscles || []).join(" "));
  const modality = normalize(ex.modalityCode || "");

  // 1. Vôlei de Praia & Areia
  if (
    modality === "beach_volleyball" ||
    /\b(areia|volei|ataque|bloqueio|defesa na areia|transicao na areia|sprint na areia)\b/.test(
      fullName
    )
  ) {
    return "areia";
  }

  // 2. Mobilidade & Aquecimento
  if (
    /\b(mobilidade|alongamento|liberacao|miofascial|foam roller|aquecimento|ativacao|cat-camel|90\/90|toracica)\b/.test(
      fullName
    )
  ) {
    return "mobilidade";
  }

  // 3. Potência & Pliometria (Saltos, LPO, Tripla Extensão, Medicine Ball)
  if (
    /\b(salto|jump|pliometri|box jump|depth jump|drop jump|arremesso|med ball|medicine ball|hang clean|power clean|snatch|arranco|arremesso olimpico|push press|kettlebell swing|sprint|explosiv|tripla extensao|cmj|countermovement)\b/.test(
      fullName
    )
  ) {
    return "pliometria";
  }

  // 4. Core & Abdômen
  if (
    /\b(abdom|prancha|plank|pallof|hollow|dead bug|russian twist|crunch|infra|obliquo|roda abdominal|ab wheel|canivete|sit-up|core|woodchop|lenhador)\b/.test(
      fullName
    ) ||
    /\b(abdominals|core|obliques)\b/.test(muscles)
  ) {
    return "core";
  }

  // 5. Peito
  if (
    /\b(supino|bench press|crucifixo|crossover|peck deck|flexao de braco|push-up|pushup|chest|peitoral|fly)\b/.test(
      fullName
    ) ||
    /\b(chest|pectorals|peito|peitoral)\b/.test(muscles)
  ) {
    return "peito";
  }

  // 6. Costas & Dorsais
  if (
    /\b(remada|row|puxada|pulldown|pull-up|pullup|chin-up|barra fixa|pulley|serrote|levantamento terra$|deadlift$|rack pull|face pull|dorsal|latissimo)\b/.test(
      fullName
    ) ||
    /\b(lats|middle_back|lower_back|traps|dorsais|costas)\b/.test(muscles)
  ) {
    // Exceção: Romeno / Stiff são focados em cadeia posterior de pernas
    if (!/\b(romeno|rdl|stiff|sumo)\b/.test(fullName)) {
      return "costas";
    }
  }

  // 7. Ombros & Escápulas
  if (
    /\b(desenvolvimento|overhead press|military press|elevacao lateral|elevacao frontal|crucifixo inverso|arnold press|manguito|rotacao externa|escapul|ombro|deltoide|landmine press|y-t-w)\b/.test(
      fullName
    ) ||
    /\b(shoulders|deltoids|ombros)\b/.test(muscles)
  ) {
    return "ombros";
  }

  // 8. Braços (Bíceps, Tríceps e Antebraço)
  if (
    /\b(rosca|curl|biceps|triceps|testa|frances|corda|mergulho|dip|antebraco|punho|martelo|scott|concentrada|kickback|coice)\b/.test(
      fullName
    ) ||
    /\b(biceps|triceps|forearms|antebracos)\b/.test(muscles)
  ) {
    return "bracos";
  }

  // 9. Pernas & Glúteos (Padrão para membros inferiores)
  if (
    /\b(agachamento|squat|leg press|afundo|avanço|lunge|bulgaro|split squat|extensora|flexora|stiff|romeno|rdl|hip thrust|elevacao pelvica|gluteo|panturrilha|calf|gemeos|adutor|abdutor|nordica|nordic|step-up|hack|passada|terra)\b/.test(
      fullName
    ) ||
    /\b(quadriceps|hamstrings|glutes|calves|adductors|abductors)\b/.test(
      muscles
    )
  ) {
    return "pernas";
  }

  return "pernas";
}

/**
 * Retorna os metadados da categoria de um exercício.
 */
export function getExerciseCategoryMeta(
  ex: CategorizableExercise
): ExerciseCategoryMeta {
  const id = classifyExerciseCategory(ex);
  return CATEGORY_MAP[id];
}
