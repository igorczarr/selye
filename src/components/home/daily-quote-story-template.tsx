"use client";

import { useRef, useState } from "react";
import type { DailyEditorialResult } from "@/core/editorial/daily-quotes";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Camera,
  Check,
  Download,
  ImagePlus,
  MessageCircle,
  RotateCcw,
  Share2,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";

/** Geometria oficial do Símbolo Selye (trajetória em S). */
const SELYE_SYMBOL_PATHS = [
  "M75 21 C63 12 42 12 29 21 C15 31 16 45 31 51 C37 54 43 55 46 56",
  "M55 56 C62 58 70 61 76 66 C86 75 82 88 71 94 C57 102 36 98 23 86",
] as const;

/** Geometria oficial do Wordmark SELYE (idêntica ao Template Pós-Treino). */
const SELYE_WORD_PATHS = [
  "M49 10 C42 4 31 3 21 5 C8 8 3 16 7 26 C10 33 21 36 33 40 C46 44 50 53 45 61 C40 69 25 71 12 67 C8 66 5 64 2 62",
  "M105 7 H73 V66 H106 M73 36 H99",
  "M133 7 V66 H169",
  "M194 7 L216 35 L239 7 M216 35 V66",
  "M296 7 H264 V66 H297 M264 36 H290",
] as const;

/** Ícone vetorial de pulso/adaptação para a linha de telemetria (mesma gramática do Pós-Treino). */
const PULSE_VECTOR_PATHS = [
  "M3 14 H9 L13 5 L18 23 L22 14 H29",
] as const;

/** Aspas geométricas escultóricas (dupla abertura). */
const QUOTE_GLYPH_PATHS = [
  "M0 32 L11 0 H26 L18 32 Z",
  "M32 32 L43 0 H58 L50 32 Z",
] as const;

function formatShortDatePt(date: Date = new Date()): string {
  const months = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()] || "NOV";
  return `${day} ${month}`;
}

interface QuoteTypographySpec {
  fontSize: number;
  lineHeight: number;
  letterSpacingPx: number;
  maxCharsPerLine: number;
}

function getQuoteTypographySpec(length: number): QuoteTypographySpec {
  if (length <= 82) {
    return {
      fontSize: 86,
      lineHeight: 95,
      letterSpacingPx: -2.6,
      maxCharsPerLine: 18,
    };
  }
  if (length <= 122) {
    return {
      fontSize: 76,
      lineHeight: 85,
      letterSpacingPx: -2.3,
      maxCharsPerLine: 21,
    };
  }
  if (length <= 165) {
    return {
      fontSize: 64,
      lineHeight: 72,
      letterSpacingPx: -1.9,
      maxCharsPerLine: 25,
    };
  }
  return {
    fontSize: 54,
    lineHeight: 62,
    letterSpacingPx: -1.5,
    maxCharsPerLine: 30,
  };
}

/** Resolve as famílias reais injetadas pelo `next/font` para uso no Canvas 2D. */
function resolveDocumentFonts(): { displayFont: string; monoFont: string } {
  if (typeof window === "undefined") {
    return {
      displayFont: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      monoFont: "'IBM Plex Mono', ui-monospace, monospace",
    };
  }
  const styles = window.getComputedStyle(document.documentElement);
  const displayVar = styles.getPropertyValue("--font-display").trim();
  const interVar = styles.getPropertyValue("--font-inter").trim();
  const monoVar = styles.getPropertyValue("--font-plex-mono").trim();

  return {
    displayFont: [displayVar, interVar, "'Plus Jakarta Sans'", "system-ui", "sans-serif"]
      .filter(Boolean)
      .join(", "),
    monoFont: [monoVar, "'IBM Plex Mono'", "ui-monospace", "monospace"]
      .filter(Boolean)
      .join(", "),
  };
}

/** Quebra linhas por contagem óptica aproximada para o preview vetorial SVG. */
function wrapSvgLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Quebra linhas exata por medida real de pixels para o Canvas 1080x1920. */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function normalizeQuoteCore(raw: string): string {
  return raw.trim().replace(/[.!?]+$/, "");
}

function setCanvasTracking(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${px}px`;
  }
}

export interface RenderDailyQuoteOptions {
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
  photoDataUrl?: string | null;
  zoom?: number;
  offset?: { x: number; y: number };
  dateLabel?: string;
}

/**
 * Renderiza o pôster 1080×1920 (Stories 9:16 HD) da Frase do Dia,
 * seguindo integralmente o sistema cromático, tipográfico e de telemetria
 * aprovado no Template Pós-Treino.
 */
export async function renderDailyQuoteStoryCanvas({
  editorial,
  activeDaysInYear,
  photoDataUrl = null,
  zoom = 1,
  offset = { x: 0, y: 0 },
  dateLabel,
}: RenderDailyQuoteOptions): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { displayFont, monoFont } = resolveDocumentFonts();

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  const safeActiveDays = Math.max(1, Math.round(activeDaysInYear || 1));
  const dayPadded = String(editorial.dayOfYear).padStart(3, "0");
  const dateStr = dateLabel || formatShortDatePt(new Date());
  const { quote } = editorial;

  const X_LEFT = 72;
  const X_RIGHT = 1008;
  const CONTENT_W = X_RIGHT - X_LEFT;

  // 1. Fundo arquitetônico Noite Profunda -> Obsidiana (idêntico ao Pós-Treino)
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#1C2420");
  bgGrad.addColorStop(0.5, "#111714");
  bgGrad.addColorStop(1, "#070A09");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (photoDataUrl) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = photoDataUrl;
    });

    const imgRatio = img.width / img.height;
    const canvasRatio = W / H;
    let drawW = W;
    let drawH = H;
    if (imgRatio > canvasRatio) {
      drawH = H;
      drawW = H * imgRatio;
    } else {
      drawW = W;
      drawH = W / imgRatio;
    }
    drawW *= zoom;
    drawH *= zoom;
    const scaleFactor = W / 300;
    const drawX = (W - drawW) / 2 + offset.x * scaleFactor;
    const drawY = (H - drawH) / 2 + offset.y * scaleFactor;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Véu escuro editorial sobre foto
    const photoScrim = ctx.createLinearGradient(0, 0, 0, H);
    photoScrim.addColorStop(0, "rgba(10, 14, 12, 0.72)");
    photoScrim.addColorStop(0.5, "rgba(10, 14, 12, 0.64)");
    photoScrim.addColorStop(1, "rgba(7, 10, 9, 0.94)");
    ctx.fillStyle = photoScrim;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Iluminação atmosférica chiaroscuro
    const topGlow = ctx.createRadialGradient(920, 290, 30, 920, 290, 700);
    topGlow.addColorStop(0, "rgba(199, 240, 0, 0.09)");
    topGlow.addColorStop(0.55, "rgba(61, 89, 75, 0.075)");
    topGlow.addColorStop(1, "rgba(8, 11, 10, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, H);

    const lowGlow = ctx.createRadialGradient(150, 1520, 40, 150, 1520, 640);
    lowGlow.addColorStop(0, "rgba(61, 89, 75, 0.14)");
    lowGlow.addColorStop(1, "rgba(8, 11, 10, 0)");
    ctx.fillStyle = lowGlow;
    ctx.fillRect(0, 0, W, H);

    // Numeral fantasma monumental da edição (marca d'água suíça em contorno sutil)
    ctx.save();
    ctx.font = `800 280px ${monoFont}`;
    setCanvasTracking(ctx, -10);
    ctx.strokeStyle = "rgba(244, 243, 239, 0.042)";
    ctx.lineWidth = 2;
    ctx.textBaseline = "alphabetic";
    ctx.strokeText(dayPadded, X_LEFT - 8, 492);
    setCanvasTracking(ctx, 0);
    ctx.restore();

    // Escultura monumental de fundo: Trajetória em S + Ponto de Registro Selye
    ctx.save();
    ctx.strokeStyle = "rgba(113, 135, 122, 0.105)";
    ctx.lineWidth = 56;
    ctx.lineCap = "round";
    ctx.stroke(
      new Path2D(
        "M 1110 580 C 940 490, 740 545, 725 705 C 710 855, 865 930, 955 985"
      )
    );
    ctx.stroke(
      new Path2D(
        "M 1015 1035 C 1095 1110, 1090 1275, 955 1370 C 835 1455, 675 1445, 575 1365"
      )
    );

    ctx.strokeStyle = "rgba(244, 243, 239, 0.07)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 9]);
    ctx.stroke(
      new Path2D(
        "M 1120 535 C 910 440, 680 515, 670 705 C 660 890, 1135 1030, 1010 1335 C 930 1485, 710 1500, 545 1405"
      )
    );
    ctx.setLineDash([]);

    const nodeX = 985;
    const nodeY = 1010;
    ctx.strokeStyle = "rgba(199, 240, 0, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#C7F000";
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Vinheta inferior suave (mesma curva do Pós-Treino)
  const vig = ctx.createLinearGradient(0, 1380, 0, H);
  vig.addColorStop(0, "rgba(7, 10, 9, 0)");
  vig.addColorStop(0.45, "rgba(7, 10, 9, 0.5)");
  vig.addColorStop(1, "rgba(7, 10, 9, 0.94)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 1380, W, 540);

  // 2. ZONA SUPERIOR — Cabeçalho Editorial & Assinatura Selye
  ctx.save();
  ctx.translate(X_LEFT - 10, 136);
  ctx.scale(0.58, 0.58);
  ctx.strokeStyle = "#F4F3EF";
  ctx.lineWidth = 7.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of SELYE_SYMBOL_PATHS) {
    ctx.stroke(new Path2D(d));
  }
  ctx.fillStyle = "#C7F000";
  ctx.beginPath();
  ctx.arc(50.5, 55.5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(X_LEFT + 54, 150);
  ctx.scale(0.46, 0.46);
  ctx.strokeStyle = "#F4F3EF";
  ctx.lineWidth = 6.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of SELYE_WORD_PATHS) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 16px ${monoFont}`;
  setCanvasTracking(ctx, 2.6);
  ctx.fillStyle = "#C7F000";
  ctx.fillText("FRASE DO DIA", X_RIGHT, 165);

  ctx.font = `600 14.5px ${monoFont}`;
  setCanvasTracking(ctx, 1.8);
  ctx.fillStyle = "#9CA39E";
  ctx.fillText(
    `EDIÇÃO ${dayPadded}/${editorial.totalDaysInYear} · ${dateStr}`,
    X_RIGHT,
    192
  );
  setCanvasTracking(ctx, 0);
  ctx.restore();

  ctx.strokeStyle = "rgba(244, 243, 239, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X_LEFT, 230);
  ctx.lineTo(X_RIGHT, 230);
  ctx.stroke();

  ctx.fillStyle = "#C7F000";
  ctx.fillRect(X_LEFT, 228.5, 72, 3);

  // 3. ZONA CENTRAL — Pôster Tipográfico Imponente
  const coreText = normalizeQuoteCore(quote.messageText);
  const spec = getQuoteTypographySpec(coreText.length);

  ctx.save();
  ctx.font = `800 ${spec.fontSize}px ${displayFont}`;
  setCanvasTracking(ctx, spec.letterSpacingPx);
  const quoteLines = wrapCanvasText(ctx, coreText, CONTENT_W - 18);
  setCanvasTracking(ctx, 0);
  ctx.restore();

  const quoteBlockHeight =
    72 + quoteLines.length * spec.lineHeight + 60 + 84;
  const availableTop = 295;
  const availableBottom = 1585;
  const startY = Math.max(
    availableTop,
    Math.round(
      availableTop + (availableBottom - availableTop - quoteBlockHeight) * 0.45
    )
  );

  // Aspas geométricas em Lima + Categoria editorial
  ctx.save();
  ctx.translate(X_LEFT, startY);
  ctx.fillStyle = "#C7F000";
  for (const d of QUOTE_GLYPH_PATHS) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();

  ctx.save();
  ctx.font = `700 17px ${monoFont}`;
  setCanvasTracking(ctx, 3.2);
  ctx.fillStyle = "#C7F000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    quote.categoryLabelPt.toUpperCase(),
    X_LEFT + 76,
    startY + 24
  );
  setCanvasTracking(ctx, 0);
  ctx.restore();

  // Citação em escala monumental + ponto final em Lima Sinal
  ctx.save();
  ctx.font = `800 ${spec.fontSize}px ${displayFont}`;
  setCanvasTracking(ctx, spec.letterSpacingPx);
  ctx.textBaseline = "alphabetic";
  let lineY = startY + 64 + spec.fontSize * 0.88;

  for (let i = 0; i < quoteLines.length; i++) {
    const line = quoteLines[i];
    const isLast = i === quoteLines.length - 1;
    ctx.fillStyle = "#F4F3EF";
    ctx.fillText(line, X_LEFT, lineY);

    if (isLast) {
      const w = ctx.measureText(line).width;
      ctx.fillStyle = "#C7F000";
      ctx.fillText(".", X_LEFT + w - 3, lineY);
    }
    lineY += spec.lineHeight;
  }
  setCanvasTracking(ctx, 0);
  ctx.restore();

  // Bloco de Autoria & Contexto com barra vertical Lima
  const authorTopY = lineY - spec.lineHeight + 58;
  ctx.fillStyle = "#C7F000";
  ctx.fillRect(X_LEFT, authorTopY + 4, 4, 68);

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 32px ${displayFont}`;
  setCanvasTracking(ctx, 0.8);
  ctx.fillStyle = "#F4F3EF";
  ctx.fillText(quote.author.toUpperCase(), X_LEFT + 26, authorTopY + 31);

  ctx.font = `600 16.5px ${monoFont}`;
  setCanvasTracking(ctx, 1.6);
  ctx.fillStyle = "#9CA39E";
  const roleLines = wrapCanvasText(
    ctx,
    quote.roleOrContext.toUpperCase(),
    CONTENT_W - 40
  );
  let roleY = authorTopY + 62;
  for (const rLine of roleLines.slice(0, 2)) {
    ctx.fillText(rLine, X_LEFT + 26, roleY);
    roleY += 24;
  }
  setCanvasTracking(ctx, 0);
  ctx.restore();

  // 4. ZONA INFERIOR — Assinatura de Telemetria Pós-Treino (y = 1656..1804)
  const footerRuleY = 1656;
  ctx.strokeStyle = "rgba(244, 243, 239, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X_LEFT, footerRuleY);
  ctx.lineTo(X_RIGHT, footerRuleY);
  ctx.stroke();

  const statusY = footerRuleY + 48;
  ctx.save();
  ctx.translate(X_LEFT, statusY - 17);
  ctx.scale(0.72, 0.72);
  ctx.strokeStyle = "#C7F000";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of PULSE_VECTOR_PATHS) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();

  ctx.save();
  ctx.font = `700 14.5px ${monoFont}`;
  setCanvasTracking(ctx, 1.8);
  ctx.textBaseline = "alphabetic";
  const leadLabel = "CONSTÂNCIA ANUAL";
  ctx.fillStyle = "#F4F3EF";
  ctx.fillText(leadLabel, X_LEFT + 29, statusY);
  const leadW = ctx.measureText(leadLabel).width;
  ctx.fillStyle = "#9CA39E";
  ctx.fillText(
    ` · O TRAÇO DA ADAPTAÇÃO · ${dateStr}`,
    X_LEFT + 29 + leadW,
    statusY
  );
  setCanvasTracking(ctx, 0);
  ctx.restore();

  // Dupla Métrica Monumental na Base (espelho 1:1 do Template Pós-Treino)
  const metricsBaseY = 1800;

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 62px ${monoFont}`;
  setCanvasTracking(ctx, -2.5);
  ctx.fillStyle = "#F4F3EF";
  ctx.fillText(dayPadded, X_LEFT, metricsBaseY);
  const dayW = ctx.measureText(dayPadded).width;

  ctx.font = `700 23px ${monoFont}`;
  setCanvasTracking(ctx, 0);
  ctx.fillStyle = "#C7F000";
  const totalLabel = `/${editorial.totalDaysInYear}`;
  ctx.fillText(totalLabel, X_LEFT + dayW + 6, metricsBaseY);
  const totalW = ctx.measureText(totalLabel).width;

  const dividerX = X_LEFT + dayW + 6 + totalW + 28;
  ctx.strokeStyle = "rgba(244, 243, 239, 0.24)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dividerX, metricsBaseY - 43);
  ctx.lineTo(dividerX, metricsBaseY - 3);
  ctx.stroke();

  const daysX = dividerX + 28;
  ctx.font = `700 62px ${monoFont}`;
  setCanvasTracking(ctx, -2.5);
  ctx.fillStyle = "#F4F3EF";
  const daysStr = String(safeActiveDays);
  ctx.fillText(daysStr, daysX, metricsBaseY);
  const daysW = ctx.measureText(daysStr).width;
  setCanvasTracking(ctx, 0);

  const stackX = daysX + daysW + 12;
  ctx.fillStyle = "#C7F000";
  ctx.beginPath();
  ctx.arc(stackX + 5, metricsBaseY - 30, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 14px ${monoFont}`;
  setCanvasTracking(ctx, 2);
  ctx.fillStyle = "#C7F000";
  ctx.fillText("DIAS", stackX + 15, metricsBaseY - 25);

  ctx.font = `600 14px ${monoFont}`;
  ctx.fillStyle = "rgba(244, 243, 239, 0.88)";
  ctx.fillText("ATIVOS", stackX + 1, metricsBaseY - 5);
  setCanvasTracking(ctx, 0);
  ctx.restore();

  // Âncora direita na base: progresso anual + assinatura de categoria
  ctx.save();
  const gaugeW = 196;
  const gaugeX = X_RIGHT - gaugeW;
  const gaugeY = metricsBaseY - 25;

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 13px ${monoFont}`;
  setCanvasTracking(ctx, 1.8);
  ctx.fillStyle = "#F4F3EF";
  ctx.fillText(
    `CICLO ${editorial.year} · ${editorial.yearProgressPercent}%`,
    X_RIGHT,
    gaugeY - 10
  );

  ctx.fillStyle = "rgba(244, 243, 239, 0.14)";
  ctx.beginPath();
  ctx.roundRect(gaugeX, gaugeY, gaugeW, 5, 2.5);
  ctx.fill();

  ctx.fillStyle = "#C7F000";
  ctx.beginPath();
  ctx.roundRect(
    gaugeX,
    gaugeY,
    Math.max(12, (gaugeW * editorial.yearProgressPercent) / 100),
    5,
    2.5
  );
  ctx.fill();

  ctx.font = `600 12.5px ${monoFont}`;
  setCanvasTracking(ctx, 1.6);
  ctx.fillStyle = "#9CA39E";
  ctx.fillText("GESTÃO FÍSICA PESSOAL", X_RIGHT, metricsBaseY - 2);
  setCanvasTracking(ctx, 0);
  ctx.restore();

  return canvas;
}

export async function renderDailyQuoteStoryBlob(
  options: RenderDailyQuoteOptions
): Promise<Blob> {
  const canvas = await renderDailyQuoteStoryCanvas(options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao exportar PNG"))),
      "image/png",
      1.0
    );
  });
}

/**
 * Preview vetorial 1080×1920 em SVG (espelho fiel do Canvas HD para visualização instantânea).
 */
export function DailyQuoteStorySvgPreview({
  editorial,
  activeDaysInYear,
  hasPhoto = false,
}: {
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
  hasPhoto?: boolean;
}) {
  const safeActiveDays = Math.max(1, Math.round(activeDaysInYear || 1));
  const dayPadded = String(editorial.dayOfYear).padStart(3, "0");
  const dateStr = formatShortDatePt(new Date());
  const { quote } = editorial;

  const coreText = normalizeQuoteCore(quote.messageText);
  const spec = getQuoteTypographySpec(coreText.length);
  const svgLines = wrapSvgLines(coreText, spec.maxCharsPerLine);

  const quoteBlockHeight = 72 + svgLines.length * spec.lineHeight + 60 + 84;
  const startY = Math.max(
    295,
    Math.round(295 + (1585 - 295 - quoteBlockHeight) * 0.45)
  );
  const firstLineY = Math.round(startY + 64 + spec.fontSize * 0.88);
  const authorTopY =
    firstLineY + (svgLines.length - 1) * spec.lineHeight + 58;

  const daysDigits = String(safeActiveDays).length;
  const svgDividerX = 286;
  const svgDaysX = svgDividerX + 28;
  const svgStackOffset = daysDigits === 1 ? 46 : daysDigits === 2 ? 84 : 120;

  return (
    <svg
      viewBox="0 0 1080 1920"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      <defs>
        <linearGradient id="selyeQuoteBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1C2420" />
          <stop offset="50%" stopColor="#111714" />
          <stop offset="100%" stopColor="#070A09" />
        </linearGradient>
        <radialGradient id="selyeQuoteTopGlow" cx="85%" cy="15%" r="62%">
          <stop offset="0%" stopColor="#C7F000" stopOpacity="0.09" />
          <stop offset="55%" stopColor="#3D594B" stopOpacity="0.075" />
          <stop offset="100%" stopColor="#080B0A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="selyeQuoteVig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070A09" stopOpacity="0" />
          <stop offset="45%" stopColor="#070A09" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#070A09" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="selyePhotoScrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A0E0C" stopOpacity="0.72" />
          <stop offset="50%" stopColor="#0A0E0C" stopOpacity="0.64" />
          <stop offset="100%" stopColor="#070A09" stopOpacity="0.94" />
        </linearGradient>
      </defs>

      {!hasPhoto ? (
        <>
          <rect width="1080" height="1920" fill="url(#selyeQuoteBg)" />
          <rect width="1080" height="1920" fill="url(#selyeQuoteTopGlow)" />

          {/* Numeral fantasma da edição */}
          <text
            x="64"
            y="492"
            fill="none"
            stroke="#F4F3EF"
            strokeOpacity="0.042"
            strokeWidth="2"
            fontFamily="var(--font-plex-mono), ui-monospace, monospace"
            fontSize="280"
            fontWeight="800"
            letterSpacing="-10"
          >
            {dayPadded}
          </text>

          {/* Escultura monumental S-Trajectory em baixo-relevo */}
          <g fill="none" strokeLinecap="round">
            <path
              d="M 1110 580 C 940 490, 740 545, 725 705 C 710 855, 865 930, 955 985"
              stroke="#71877A"
              strokeOpacity="0.105"
              strokeWidth="56"
            />
            <path
              d="M 1015 1035 C 1095 1110, 1090 1275, 955 1370 C 835 1455, 675 1445, 575 1365"
              stroke="#71877A"
              strokeOpacity="0.105"
              strokeWidth="56"
            />
            <path
              d="M 1120 535 C 910 440, 680 515, 670 705 C 660 890, 1135 1030, 1010 1335 C 930 1485, 710 1500, 545 1405"
              stroke="#F4F3EF"
              strokeOpacity="0.07"
              strokeWidth="1.5"
              strokeDasharray="7 9"
            />
            <circle
              cx="985"
              cy="1010"
              r="32"
              stroke="#C7F000"
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />
            <circle cx="985" cy="1010" r="8" fill="#C7F000" />
          </g>
        </>
      ) : (
        <rect width="1080" height="1920" fill="url(#selyePhotoScrim)" />
      )}

      <rect x="0" y="1380" width="1080" height="540" fill="url(#selyeQuoteVig)" />

      {/* 1. ZONA SUPERIOR — Masthead Editorial */}
      <g transform="translate(62, 136) scale(0.58)">
        <g
          fill="none"
          stroke="#F4F3EF"
          strokeWidth="7.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {SELYE_SYMBOL_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
          <circle cx="50.5" cy="55.5" r="5.5" fill="#C7F000" stroke="none" />
        </g>
      </g>
      <g transform="translate(126, 150) scale(0.46)">
        <g
          fill="none"
          stroke="#F4F3EF"
          strokeWidth="6.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {SELYE_WORD_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>

      <text
        x="1008"
        y="165"
        textAnchor="end"
        fill="#C7F000"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="16"
        fontWeight="700"
        letterSpacing="2.6"
      >
        FRASE DO DIA
      </text>
      <text
        x="1008"
        y="192"
        textAnchor="end"
        fill="#9CA39E"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="14.5"
        fontWeight="600"
        letterSpacing="1.8"
      >
        EDIÇÃO {dayPadded}/{editorial.totalDaysInYear} · {dateStr}
      </text>

      <line
        x1="72"
        y1="230"
        x2="1008"
        y2="230"
        stroke="#F4F3EF"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />
      <rect x="72" y="228.5" width="72" height="3" fill="#C7F000" />

      {/* 2. ZONA CENTRAL — Citação Imponente */}
      <g transform={`translate(72, ${startY})`} fill="#C7F000">
        {QUOTE_GLYPH_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <text
        x="148"
        y={startY + 24}
        fill="#C7F000"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="17"
        fontWeight="700"
        letterSpacing="3.2"
      >
        {quote.categoryLabelPt.toUpperCase()}
      </text>

      <g
        fontFamily="var(--font-display), system-ui, -apple-system, sans-serif"
        fontSize={spec.fontSize}
        fontWeight="800"
        letterSpacing={spec.letterSpacingPx}
      >
        {svgLines.map((line, idx) => {
          const isLast = idx === svgLines.length - 1;
          return (
            <text
              key={idx}
              x="72"
              y={firstLineY + idx * spec.lineHeight}
              fill="#F4F3EF"
            >
              {line}
              {isLast && <tspan fill="#C7F000">.</tspan>}
            </text>
          );
        })}
      </g>

      {/* Autoria */}
      <rect x="72" y={authorTopY + 4} width="4" height="68" fill="#C7F000" />
      <text
        x="98"
        y={authorTopY + 31}
        fill="#F4F3EF"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="0.8"
      >
        {quote.author.toUpperCase()}
      </text>
      <text
        x="98"
        y={authorTopY + 62}
        fill="#9CA39E"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="16.5"
        fontWeight="600"
        letterSpacing="1.5"
      >
        {quote.roleOrContext.toUpperCase().slice(0, 56)}
      </text>

      {/* 3. ZONA INFERIOR — Telemetria Pós-Treino */}
      <line
        x1="72"
        y1="1656"
        x2="1008"
        y2="1656"
        stroke="#F4F3EF"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />

      <g transform="translate(72, 1687) scale(0.72)">
        <g
          fill="none"
          stroke="#C7F000"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {PULSE_VECTOR_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <text
        x="101"
        y="1704"
        fill="#9CA39E"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="14.5"
        fontWeight="700"
        letterSpacing="1.8"
      >
        <tspan fill="#F4F3EF">CONSTÂNCIA ANUAL</tspan> · O TRAÇO DA ADAPTAÇÃO ·{" "}
        {dateStr}
      </text>

      <g transform="translate(72, 1800)">
        <text
          x="0"
          y="0"
          fill="#F4F3EF"
          fontFamily="var(--font-plex-mono), ui-monospace, monospace"
          fontSize="62"
          fontWeight="700"
          letterSpacing="-2.5"
        >
          {dayPadded}
          <tspan
            fontSize="23"
            fill="#C7F000"
            fontWeight="700"
            dx="6"
            letterSpacing="0"
          >
            /{editorial.totalDaysInYear}
          </tspan>
        </text>

        <line
          x1={svgDividerX - 72}
          y1="-43"
          x2={svgDividerX - 72}
          y2="-3"
          stroke="#F4F3EF"
          strokeOpacity="0.24"
          strokeWidth="1.5"
        />

        <g transform={`translate(${svgDaysX - 72}, 0)`}>
          <text
            x="0"
            y="0"
            fill="#F4F3EF"
            fontFamily="var(--font-plex-mono), ui-monospace, monospace"
            fontSize="62"
            fontWeight="700"
            letterSpacing="-2.5"
          >
            {safeActiveDays}
          </text>
          <g transform={`translate(${svgStackOffset}, 0)`}>
            <circle cx="5" cy="-30" r="3.8" fill="#C7F000" />
            <text
              x="15"
              y="-25"
              fill="#C7F000"
              fontFamily="var(--font-plex-mono), ui-monospace, monospace"
              fontSize="14"
              fontWeight="700"
              letterSpacing="2"
            >
              DIAS
            </text>
            <text
              x="1"
              y="-5"
              fill="#F4F3EF"
              fontFamily="var(--font-plex-mono), ui-monospace, monospace"
              fontSize="14"
              fontWeight="600"
              letterSpacing="2"
              opacity="0.88"
            >
              ATIVOS
            </text>
          </g>
        </g>
      </g>

      {/* Âncora direita inferior */}
      <text
        x="1008"
        y="1765"
        textAnchor="end"
        fill="#F4F3EF"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="13"
        fontWeight="700"
        letterSpacing="1.8"
      >
        CICLO {editorial.year} · {editorial.yearProgressPercent}%
      </text>
      <rect
        x="812"
        y="1775"
        width="196"
        height="5"
        rx="2.5"
        fill="#F4F3EF"
        fillOpacity="0.14"
      />
      <rect
        x="812"
        y="1775"
        width={Math.max(12, Math.round((196 * editorial.yearProgressPercent) / 100))}
        height="5"
        rx="2.5"
        fill="#C7F000"
      />
      <text
        x="1008"
        y="1798"
        textAnchor="end"
        fill="#9CA39E"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize="12.5"
        fontWeight="600"
        letterSpacing="1.6"
      >
        GESTÃO FÍSICA PESSOAL
      </text>
    </svg>
  );
}

export interface DailyQuoteShareModalProps {
  open: boolean;
  onClose: () => void;
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
}

/**
 * Modal unificado de prévia, personalização opcional de foto e exportação HD (1080×1920)
 * para compartilhamento da Frase do Dia no Instagram Stories, Status e WhatsApp.
 */
export function DailyQuoteShareModal({
  open,
  onClose,
  editorial,
  activeDaysInYear,
}: DailyQuoteShareModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const { quote } = editorial;
  const shareCaption = `“${quote.messageText}” — ${quote.author}\n\n${editorial.dayCounterLabel} · ${activeDaysInYear} ${
    activeDaysInYear === 1 ? "dia ativo" : "dias ativos"
  } em ${editorial.year} · Selye`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    shareCaption
  )}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photoDataUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = await renderDailyQuoteStoryBlob({
        editorial,
        activeDaysInYear,
        photoDataUrl,
        zoom,
        offset,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selye-frase-dia-${editorial.dayOfYear}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedbackMsg("Pôster HD salvo! Pronto para Stories ou Status.");
      setTimeout(() => setFeedbackMsg(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    setIsExporting(true);
    try {
      const blob = await renderDailyQuoteStoryBlob({
        editorial,
        activeDaysInYear,
        photoDataUrl,
        zoom,
        offset,
      });
      const file = new File(
        [blob],
        `selye-frase-dia-${editorial.dayOfYear}.png`,
        { type: "image/png" }
      );

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `Selye · ${editorial.dayCounterLabel}`,
          text: shareCaption,
          files: [file],
        });
        setFeedbackMsg("Compartilhado com sucesso!");
      } else {
        await handleDownload();
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareCaption);
          setFeedbackMsg("Pôster HD salvo e legenda copiada!");
          setTimeout(() => setFeedbackMsg(null), 3500);
        }
      }
    } catch {
      // Cancelado pelo usuário
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      ariaLabel="Compartilhar Frase do Dia Selye"
      maxWidthClass="sm:max-w-lg"
    >
      <div className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4 max-h-[92dvh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent-text font-bold inline-flex items-center gap-1">
              <Sparkles size={12} />
              <span>Stories 9:16 · Edição Diária</span>
            </span>
            <h2 className="t-h3 mt-0.5">Pôster Selye — Frase do Dia</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview 9:16 em alta definição */}
        <div className="flex flex-col items-center gap-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative w-[270px] sm:w-[300px] aspect-[9/16] rounded-2xl overflow-hidden border border-line bg-[#0E1412] shadow-xl select-none touch-none ${
              photoDataUrl ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="Fundo personalizado"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            )}

            <DailyQuoteStorySvgPreview
              editorial={editorial}
              activeDaysInYear={activeDaysInYear}
              hasPhoto={Boolean(photoDataUrl)}
            />
          </div>

          {/* Controles opcionais de foto (mesma experiência do Pós-Treino) */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn btn-ghost h-8 px-3 text-[11px] font-mono inline-flex items-center gap-1.5"
            >
              <Camera size={13} className="text-accent-text" />
              <span>Câmera</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost h-8 px-3 text-[11px] font-mono inline-flex items-center gap-1.5"
            >
              <ImagePlus size={13} className="text-accent-text" />
              <span>Foto de Fundo</span>
            </button>
            {photoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setPhotoDataUrl(null);
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                title="Voltar ao fundo editorial Selye"
                className="btn btn-ghost h-8 px-2.5 text-[11px] font-mono inline-flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Pôster Original</span>
              </button>
            )}
          </div>

          {photoDataUrl && (
            <div className="flex items-center gap-2.5 w-full max-w-[300px] px-2">
              <ZoomIn size={13} className="text-muted shrink-0" />
              <input
                type="range"
                min={1}
                max={2.4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom da foto"
                className="w-full accent-lima cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted w-9 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          )}
        </div>

        {feedbackMsg && (
          <div
            role="status"
            className="rounded-xl border border-lima/45 bg-lima/12 px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2"
          >
            <Check size={14} className="text-accent-text shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Ações de Compartilhamento */}
        <div className="flex flex-col gap-2 pt-1 border-t border-line">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleNativeShare}
            className="btn btn-primary h-10 w-full text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Share2 size={14} />
            <span>
              {isExporting
                ? "Gerando Pôster HD..."
                : "Postar no Instagram / Stories"}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-dark h-9 text-xs font-mono inline-flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="btn btn-ghost h-9 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              <span>Baixar PNG (HD)</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
