/**
 * Integração YouTube Data API v3 para Demonstrações Técnicas de Exercícios (§Fase 10)
 * Busca exclusivamente no servidor usando `process.env.YOUTUBE_API_KEY`.
 */

export interface YouTubeSearchHit {
  videoId: string;
  watchUrl: string;
  embedUrl: string;
  title: string;
  channelTitle: string;
}

/**
 * Monta uma query técnica limpa para encontrar demonstrações biomecânicas curtas e diretas.
 */
export function buildExerciseYouTubeQuery(
  namePt: string,
  nameEn?: string | null
): string {
  const cleanPt = namePt
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanPt.length > 0) {
    return `${cleanPt} execução correta exercício`;
  }
  const cleanEn = (nameEn || "").replace(/\([^)]*\)/g, " ").trim();
  return `${cleanEn} exercise form tutorial`;
}

async function fetchYouTubeQuery(
  q: string,
  apiKey: string
): Promise<YouTubeSearchHit | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("relevanceLanguage", "pt");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("q", q);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5500),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: { title?: string; channelTitle?: string };
      }>;
    };

    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return null;
    }

    return {
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      title: item?.snippet?.title || q,
      channelTitle: item?.snippet?.channelTitle || "YouTube",
    };
  } catch {
    return null;
  }
}

/**
 * Busca no YouTube Data API v3 o vídeo demonstrativo mais relevante e incorporável (`videoEmbeddable=true`).
 * Faz fallback para nome simplificado ou nome em inglês caso a busca principal retorne vazia.
 */
export async function searchYouTubeExerciseVideo(
  namePt: string,
  nameEn?: string | null
): Promise<YouTubeSearchHit | null> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) return null;

  const primaryQuery = buildExerciseYouTubeQuery(namePt, nameEn);
  const primaryHit = await fetchYouTubeQuery(primaryQuery, apiKey);
  if (primaryHit) return primaryHit;

  // Fallback 1: Nome em PT simplificado sem conectivos
  const shortPt = namePt
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " ")
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .trim();
  if (shortPt) {
    const fallbackPtHit = await fetchYouTubeQuery(
      `${shortPt} exercício execução`,
      apiKey
    );
    if (fallbackPtHit) return fallbackPtHit;
  }

  // Fallback 2: Nome em Inglês se disponível
  if (nameEn && nameEn.trim()) {
    return fetchYouTubeQuery(`${nameEn.trim()} exercise form`, apiKey);
  }

  return null;
}
