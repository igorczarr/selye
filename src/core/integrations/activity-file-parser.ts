/**
 * Parser Real de Arquivos de Atividades Esportivas (.GPX, .TCX, .CSV, .JSON) — §Fase 15
 * Permite importar sessões reais exportadas do Strava, Garmin Connect, Apple Health,
 * Polar, COROS e Health Connect, calculando distância GPS (Haversine), duração real,
 * frequência cardíaca média e estimativa fisiológica de RPE / Energia Adaptativa (EA).
 */

export interface ParsedExternalActivity {
  externalId: string;
  title: string;
  modalityCode: string;
  startedAtIso: string;
  localDate: string; // YYYY-MM-DD
  durationMinutes: number;
  distanceKm: number | null;
  avgHeartRateBpm: number | null;
  estimatedRpe: number;
  sourceFormat: "gpx" | "tcx" | "csv" | "json";
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distância geodésica de Haversine entre dois pontos GPS em quilômetros.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio médio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estima o RPE (1..10) a partir da Frequência Cardíaca Média quando o arquivo possui telemetria cardíaca.
 */
export function estimateRpeFromHeartRate(
  avgHrBpm: number | null,
  maxHrBpm = 190
): number {
  if (!avgHrBpm || avgHrBpm <= 0) return 7;
  const pctMax = avgHrBpm / Math.max(120, maxHrBpm);
  if (pctMax >= 0.9) return 9;
  if (pctMax >= 0.82) return 8;
  if (pctMax >= 0.74) return 7;
  if (pctMax >= 0.65) return 6;
  return 5;
}

/**
 * Normaliza o nome/tipo de esporte vindo de GPX/TCX/Strava/Garmin para o modalityCode do Selye.
 */
export function normalizeExternalSportType(rawType?: string | null): {
  modalityCode: string;
  defaultTitlePt: string;
} {
  const norm = (rawType || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(run|running|corrida|trail)\b/.test(norm)) {
    return { modalityCode: "running", defaultTitlePt: "Corrida GPS" };
  }
  if (/\b(ride|cycling|bike|biking|ciclismo|pedal|virtualride)\b/.test(norm)) {
    return { modalityCode: "cycling", defaultTitlePt: "Ciclismo GPS" };
  }
  if (/\b(swim|swimming|natacao)\b/.test(norm)) {
    return { modalityCode: "swimming", defaultTitlePt: "Natação" };
  }
  if (/\b(walk|walking|hike|hiking|caminhada|trilha)\b/.test(norm)) {
    return { modalityCode: "walking", defaultTitlePt: "Caminhada GPS" };
  }
  if (/(beach_volleyball|volleyball|volei|beach|areia)/.test(norm)) {
    return {
      modalityCode: "beach_volleyball",
      defaultTitlePt: "Vôlei de Praia",
    };
  }
  if (/\b(futsal|soccer|football|futebol)\b/.test(norm)) {
    return { modalityCode: "futsal", defaultTitlePt: "Futsal / Futebol" };
  }
  if (/\b(weight|strength|musculacao|gym|workout|crossfit)\b/.test(norm)) {
    return { modalityCode: "strength", defaultTitlePt: "Treino de Força" };
  }

  return { modalityCode: "running", defaultTitlePt: "Atividade Importada" };
}

/**
 * Parser de arquivos .GPX (Strava, Garmin, Polar, Apple Health Workout Routes)
 */
export function parseGpxContent(xml: string): ParsedExternalActivity | null {
  if (!xml || !/<gpx\b/i.test(xml)) return null;

  const nameMatch =
    xml.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>/i) ||
    xml.match(/<name>([^<]+)<\/name>/i);
  const typeMatch = xml.match(/<type>([^<]+)<\/type>/i);

  const sportInfo = normalizeExternalSportType(
    `${typeMatch?.[1] || ""} ${nameMatch?.[1] || ""}`
  );
  const title = nameMatch?.[1]?.trim() || sportInfo.defaultTitlePt;

  // Extrai pontos de trilha <trkpt lat="..." lon="...">...</trkpt>
  const trkptRegex =
    /<trkpt\b[^>]*lat=["']([0-9.+-]+)["'][^>]*lon=["']([0-9.+-]+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;

  const coords: { lat: number; lon: number; timeMs?: number }[] = [];
  const hrValues: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(xml)) !== null) {
    const lat = Number.parseFloat(match[1]);
    const lon = Number.parseFloat(match[2]);
    const inner = match[3] || "";

    const timeTag = inner.match(/<time>([^<]+)<\/time>/i);
    const timeMs = timeTag ? Date.parse(timeTag[1].trim()) : undefined;

    const hrTag = inner.match(/<(?:gpxtpx:)?hr>(\d+)<\/(?:gpxtpx:)?hr>/i);
    if (hrTag) {
      const hr = Number.parseInt(hrTag[1], 10);
      if (hr > 35 && hr < 240) hrValues.push(hr);
    }

    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      coords.push({
        lat,
        lon,
        timeMs: timeMs && !Number.isNaN(timeMs) ? timeMs : undefined,
      });
    }
  }

  // Caso timestamps estejam fora de trkpt
  const allTimes = Array.from(xml.matchAll(/<time>([^<]+)<\/time>/gi))
    .map((m) => Date.parse(m[1].trim()))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  const startMs =
    coords.find((c) => c.timeMs)?.timeMs || allTimes[0] || Date.now();
  const endMs =
    [...coords].reverse().find((c) => c.timeMs)?.timeMs ||
    allTimes[allTimes.length - 1] ||
    startMs + 40 * 60_000;

  const durationMinutes = Math.max(
    5,
    Math.min(600, Math.round((endMs - startMs) / 60_000) || 40)
  );

  let totalDistanceKm = 0;
  for (let i = 1; i < coords.length; i++) {
    totalDistanceKm += haversineDistanceKm(
      coords[i - 1].lat,
      coords[i - 1].lon,
      coords[i].lat,
      coords[i].lon
    );
  }
  const distanceKm =
    totalDistanceKm > 0.05
      ? Math.round(totalDistanceKm * 100) / 100
      : null;

  const avgHeartRateBpm =
    hrValues.length > 0
      ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
      : null;

  const startedAtIso = new Date(startMs).toISOString();
  const localDate = startedAtIso.split("T")[0];

  return {
    externalId: `gpx_${startMs}_${durationMinutes}`,
    title,
    modalityCode: sportInfo.modalityCode,
    startedAtIso,
    localDate,
    durationMinutes,
    distanceKm,
    avgHeartRateBpm,
    estimatedRpe: estimateRpeFromHeartRate(avgHeartRateBpm),
    sourceFormat: "gpx",
  };
}

/**
 * Parser de arquivos .TCX (Garmin Training Center XML)
 */
export function parseTcxContent(xml: string): ParsedExternalActivity | null {
  if (!xml || !/<TrainingCenterDatabase\b/i.test(xml)) return null;

  const sportAttr = xml.match(/<Activity\b[^>]*Sport=["']([^"']+)["']/i);
  const idMatch = xml.match(/<Id>([^<]+)<\/Id>/i);
  const notesMatch = xml.match(/<Notes>([^<]+)<\/Notes>/i);

  const sportInfo = normalizeExternalSportType(sportAttr?.[1]);
  const title = notesMatch?.[1]?.trim() || sportInfo.defaultTitlePt;

  const timeTags = Array.from(
    xml.matchAll(/<TotalTimeSeconds>([0-9.]+)<\/TotalTimeSeconds>/gi)
  ).map((m) => Number.parseFloat(m[1]));
  const totalSeconds =
    timeTags.reduce((acc, v) => acc + (Number.isNaN(v) ? 0 : v), 0) || 2400;
  const durationMinutes = Math.max(
    5,
    Math.min(600, Math.round(totalSeconds / 60))
  );

  const distTags = Array.from(
    xml.matchAll(/<DistanceMeters>([0-9.]+)<\/DistanceMeters>/gi)
  ).map((m) => Number.parseFloat(m[1]));
  // Em TCX, cada Lap tem DistanceMeters; se houver Trackpoints também, pegamos o maior ou soma de Laps
  const lapMatches = Array.from(
    xml.matchAll(/<Lap\b[\s\S]*?<DistanceMeters>([0-9.]+)<\/DistanceMeters>/gi)
  ).map((m) => Number.parseFloat(m[1]));
  const totalMeters =
    lapMatches.length > 0
      ? lapMatches.reduce((a, b) => a + b, 0)
      : Math.max(0, ...distTags);
  const distanceKm =
    totalMeters > 50 ? Math.round((totalMeters / 1000) * 100) / 100 : null;

  const hrTags = Array.from(
    xml.matchAll(
      /<AverageHeartRateBpm>\s*<Value>(\d+)<\/Value>\s*<\/AverageHeartRateBpm>/gi
    )
  ).map((m) => Number.parseInt(m[1], 10));
  const avgHeartRateBpm =
    hrTags.length > 0
      ? Math.round(hrTags.reduce((a, b) => a + b, 0) / hrTags.length)
      : null;

  const startMs =
    idMatch && !Number.isNaN(Date.parse(idMatch[1].trim()))
      ? Date.parse(idMatch[1].trim())
      : Date.now();
  const startedAtIso = new Date(startMs).toISOString();
  const localDate = startedAtIso.split("T")[0];

  return {
    externalId: `tcx_${startMs}_${durationMinutes}`,
    title,
    modalityCode: sportInfo.modalityCode,
    startedAtIso,
    localDate,
    durationMinutes,
    distanceKm,
    avgHeartRateBpm,
    estimatedRpe: estimateRpeFromHeartRate(avgHeartRateBpm),
    sourceFormat: "tcx",
  };
}

/**
 * Parser unificado que detecta automaticamente .GPX, .TCX, .JSON ou .CSV e retorna uma lista de sessões.
 */
export function parseActivityFileContent(
  content: string,
  fileName = "activity.gpx"
): ParsedExternalActivity[] {
  const trimmed = (content || "").trim();
  if (!trimmed) return [];

  if (/<gpx\b/i.test(trimmed)) {
    const parsed = parseGpxContent(trimmed);
    return parsed ? [parsed] : [];
  }

  if (/<TrainingCenterDatabase\b/i.test(trimmed)) {
    const parsed = parseTcxContent(trimmed);
    return parsed ? [parsed] : [];
  }

  // JSON (Strava / Apple Health / Health Connect export)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const raw = JSON.parse(trimmed);
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.activities)
          ? raw.activities
          : [raw];

      return list
        .map((item: any, idx: number): ParsedExternalActivity | null => {
          if (!item || typeof item !== "object") return null;
          const sportInfo = normalizeExternalSportType(
            item.sport_type || item.type || item.modalityCode || item.modality
          );
          const title =
            String(
              item.name || item.title || sportInfo.defaultTitlePt
            ).trim() || sportInfo.defaultTitlePt;
          const startRaw =
            item.start_date || item.startedAt || item.date || new Date().toISOString();
          const startMs = !Number.isNaN(Date.parse(startRaw))
            ? Date.parse(startRaw)
            : Date.now();
          const startedAtIso = new Date(startMs).toISOString();
          const localDate = startedAtIso.split("T")[0];

          const durationMinutes = Math.max(
            5,
            Math.min(
              600,
              Math.round(
                Number(item.durationMinutes) ||
                  (Number(item.moving_time || item.elapsed_time) || 2700) / 60
              )
            )
          );
          const distRawKm =
            item.distanceKm !== undefined
              ? Number(item.distanceKm)
              : item.distance !== undefined
                ? Number(item.distance) / 1000
                : null;
          const distanceKm =
            distRawKm && distRawKm > 0.05
              ? Math.round(distRawKm * 100) / 100
              : null;
          const avgHr = Number(item.average_heartrate || item.avgHrBpm) || null;
          const rpe =
            Number(item.rpe) >= 1 && Number(item.rpe) <= 10
              ? Math.round(Number(item.rpe))
              : estimateRpeFromHeartRate(avgHr);

          return {
            externalId: String(
              item.id || `json_${startMs}_${durationMinutes}_${idx}`
            ),
            title,
            modalityCode: sportInfo.modalityCode,
            startedAtIso,
            localDate,
            durationMinutes,
            distanceKm,
            avgHeartRateBpm: avgHr,
            estimatedRpe: rpe,
            sourceFormat: "json",
          };
        })
        .filter(
          (x: ParsedExternalActivity | null): x is ParsedExternalActivity =>
            x !== null
        );
    } catch {
      return [];
    }
  }

  // CSV (Data,Treino,Modalidade,DuracaoMin,RPE ou Strava CSV)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2 && lines[0].includes(",")) {
    const results: ParsedExternalActivity[] = [];
    for (let i = 1; i < Math.min(lines.length, 30); i++) {
      const cols = lines[i]
        .split(",")
        .map((c) => c.replace(/^["']|["']$/g, "").trim());
      if (cols.length < 3) continue;

      const rawDate = cols[0];
      let isoDate = new Date().toISOString().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        isoDate = rawDate.slice(0, 10);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split("/");
        isoDate = `${yyyy}-${mm}-${dd}`;
      }

      const title = cols[1] || "Atividade Importada";
      const sportInfo = normalizeExternalSportType(cols[2] || title);
      const durationMinutes = Math.max(
        5,
        Math.min(600, Number.parseInt(cols[3] || "45", 10) || 45)
      );
      const rpe = Math.max(
        1,
        Math.min(10, Number.parseInt(cols[4] || "7", 10) || 7)
      );
      const distanceKm = cols[5] ? Number.parseFloat(cols[5]) || null : null;

      results.push({
        externalId: `csv_${isoDate}_${durationMinutes}_${i}`,
        title,
        modalityCode: sportInfo.modalityCode,
        startedAtIso: `${isoDate}T12:00:00.000Z`,
        localDate: isoDate,
        durationMinutes,
        distanceKm,
        avgHeartRateBpm: null,
        estimatedRpe: rpe,
        sourceFormat: "csv",
      });
    }
    return results;
  }

  return [];
}
