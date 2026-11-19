/**
 * SELYE — Mídia e localização do catálogo de exercícios (Fase 4).
 * Funções puras: classificação de URLs de mídia (imagem / vídeo / YouTube) e
 * tradução de metadados técnicos para PT-BR, de modo que nada em inglês chegue à interface.
 */

export const FREE_EXERCISE_DB_IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export interface ClassifiedMedia {
  images: string[];
  videos: string[];
  youtubeEmbeds: string[];
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;
const VIDEO_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

/** Converte links do YouTube (watch, youtu.be, shorts, embed) em URL de embed sem cookies. */
export function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;

    if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/"))
        id = u.pathname.split("/")[2] || null;
    }

    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

/** Separa a lista única `mediaUrls` em imagens (ordem preservada), vídeos e embeds. */
export function classifyMedia(urls: readonly string[] | null | undefined): ClassifiedMedia {
  const result: ClassifiedMedia = { images: [], videos: [], youtubeEmbeds: [] };
  for (const raw of urls ?? []) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const url = raw.trim();
    const embed = toYouTubeEmbed(url);
    if (embed) result.youtubeEmbeds.push(embed);
    else if (VIDEO_RE.test(url)) result.videos.push(url);
    else if (IMAGE_RE.test(url)) result.images.push(url);
  }
  return result;
}

export function buildFreeExerciseDbImages(images: readonly string[]): string[] {
  return images.map((p) => `${FREE_EXERCISE_DB_IMAGE_BASE}/${encodeURI(p)}`);
}

const MUSCLE_PT: Record<string, string> = {
  abdominals: "Abdômen",
  abductors: "Abdutores",
  adductors: "Adutores",
  biceps: "Bíceps",
  calves: "Panturrilhas",
  chest: "Peitoral",
  forearms: "Antebraços",
  glutes: "Glúteos",
  hamstrings: "Posteriores de coxa",
  lats: "Dorsais",
  "lower back": "Lombar",
  lower_back: "Lombar",
  "middle back": "Costas médias",
  middle_back: "Costas médias",
  neck: "Pescoço",
  quadriceps: "Quadríceps",
  shoulders: "Ombros",
  traps: "Trapézio",
  triceps: "Tríceps",
};

const EQUIPMENT_PT: Record<string, string> = {
  barbell: "Barra",
  dumbbell: "Halteres",
  machine: "Máquina",
  cable: "Polia",
  "body only": "Peso corporal",
  body_only: "Peso corporal",
  kettlebells: "Kettlebell",
  kettlebell: "Kettlebell",
  bands: "Elástico",
  resistance_band: "Elástico",
  "e-z curl bar": "Barra W",
  "exercise ball": "Bola suíça",
  "foam roll": "Rolo de espuma",
  "medicine ball": "Medicine ball",
  other: "Outro",
  incline_bench: "Banco inclinado",
};

const LEVEL_PT: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  expert: "Avançado",
};

const MECHANIC_PT: Record<string, string> = {
  compound: "Multiarticular",
  isolation: "Isolado",
};

function lookup(map: Record<string, string>, key: string | null | undefined, fallback = "—") {
  if (!key) return fallback;
  return map[key.trim().toLowerCase()] ?? map[key.trim()] ?? fallback;
}

export const muscleToPt = (k?: string | null) => lookup(MUSCLE_PT, k, k ? k : "—");
export const equipmentToPt = (k?: string | null) => lookup(EQUIPMENT_PT, k, k ? k : "—");
export const levelToPt = (k?: string | null) => lookup(LEVEL_PT, k, "Intermediário");
export const mechanicToPt = (k?: string | null) => lookup(MECHANIC_PT, k, "—");

/** Heurística para detectar texto ainda em inglês (usada para não exibir passos não traduzidos). */
export function looksEnglish(text: string | null | undefined): boolean {
  if (!text) return false;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 4) return false;
  const en = new Set(["the", "and", "your", "with", "then", "until", "that", "this", "keep", "back", "feet", "hands", "slowly", "position", "return", "lower", "raise"]);
  const pt = new Set(["o", "a", "os", "as", "de", "do", "da", "com", "para", "seu", "sua", "e", "em", "no", "na", "até", "mantenha", "volte"]);
  let e = 0;
  let p = 0;
  for (const w of words) {
    if (en.has(w)) e++;
    if (pt.has(w)) p++;
  }
  return e > p && e >= 2;
}

/** Quebra instruções em passos numerados (aceita quebras de linha ou frases). */
export function splitInstructionSteps(text: string | null | undefined): string[] {
  if (!text) return [];
  const byLine = text
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*\d+[.)-]\s*/, "").trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
