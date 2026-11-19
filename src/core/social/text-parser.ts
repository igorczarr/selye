/**
 * SELYE — Parser de #Hashtags, @Menções e Trending Topics (Fase 7)
 * Funções puras para extração, normalização PT-BR (acentos) e tokenização segura de texto social.
 */

export type SocialToken =
  | { type: "text"; value: string }
  | { type: "hashtag"; value: string; tag: string }
  | { type: "mention"; value: string; username: string };

/**
 * Normaliza uma hashtag removendo `#`, acentos e convertendo para minúsculas.
 * Ex: "#Força!" -> "forca", "#VôleiDePraia" -> "voleidepraia"
 */
export function normalizeHashtag(raw: string): string {
  return raw
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

const TOKEN_RE = /(#[A-Za-zÀ-ÖØ-öø-ÿ0-9_]{2,40}|@[A-Za-z0-9_.]{2,32})/g;

/**
 * Quebra texto livre em tokens seguros (`text`, `hashtag`, `mention`) para renderização React.
 */
export function tokenizeSocialText(text: string): SocialToken[] {
  if (!text) return [];
  const tokens: SocialToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    if (raw.startsWith("#")) {
      const tag = normalizeHashtag(raw);
      if (tag.length >= 2) {
        tokens.push({ type: "hashtag", value: raw, tag });
      } else {
        tokens.push({ type: "text", value: raw });
      }
    } else if (raw.startsWith("@")) {
      const username = raw.slice(1).toLowerCase();
      tokens.push({ type: "mention", value: raw, username });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Extrai lista única de hashtags normalizadas presentes no texto.
 */
export function extractHashtags(text?: string | null): string[] {
  if (!text) return [];
  const tags = new Set<string>();
  for (const tok of tokenizeSocialText(text)) {
    if (tok.type === "hashtag") {
      tags.add(tok.tag);
    }
  }
  return Array.from(tags);
}

/**
 * Extrai lista única de usernames mencionados (@usuario).
 */
export function extractMentions(text?: string | null): string[] {
  if (!text) return [];
  const mentions = new Set<string>();
  for (const tok of tokenizeSocialText(text)) {
    if (tok.type === "mention") {
      mentions.add(tok.username);
    }
  }
  return Array.from(mentions);
}

export interface TrendingTag {
  tag: string;
  count: number;
}

/**
 * Calcula as hashtags em alta dentro de uma janela de dias (padrão 7 dias).
 */
export function computeTrendingHashtags(
  posts: readonly { contentText?: string | null; createdAt: Date | string }[],
  options?: { windowDays?: number; limit?: number; now?: Date }
): TrendingTag[] {
  const windowDays = options?.windowDays ?? 7;
  const limit = options?.limit ?? 8;
  const now = options?.now ?? new Date();
  const cutoffMs = now.getTime() - windowDays * 86_400_000;

  const counts = new Map<string, number>();

  for (const post of posts) {
    const createdMs = new Date(post.createdAt).getTime();
    if (Number.isNaN(createdMs) || createdMs < cutoffMs) continue;

    for (const tag of extractHashtags(post.contentText)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
