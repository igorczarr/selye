"use client";

import { useState } from "react";
import type { DailyEditorialResult } from "@/core/editorial/daily-quotes";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  CalendarCheck2,
  Download,
  Share2,
  X,
  Check,
  MessageCircle,
} from "lucide-react";

interface DailyQuoteCardProps {
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
}

/** Quebra texto em linhas respeitando largura máxima no Canvas 1080x1920 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
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

/** Gera um PNG 1080x1920 (formato oficial Instagram Story 9:16) no cliente sem dependências externas */
async function renderStoryPngBlob(
  editorial: DailyEditorialResult,
  activeDaysInYear: number
): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  // Fundo arquitetônico Noite -> Grafite
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#151C1A");
  bg.addColorStop(0.55, "#1B2421");
  bg.addColorStop(1, "#202A27");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Halo sutil Lima no canto superior direito
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.14, 40, W * 0.85, H * 0.14, 540);
  glow.addColorStop(0, "rgba(199, 217, 119, 0.14)");
  glow.addColorStop(1, "rgba(199, 217, 119, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Grade sutil de pontos
  ctx.fillStyle = "rgba(243, 242, 236, 0.05)";
  for (let x = 60; x < W; x += 48) {
    for (let y = 60; y < H; y += 48) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Moldura interna sutil
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  // Topo: Símbolo Selye + Dia X de 365
  ctx.save();
  ctx.translate(108, 130);
  ctx.scale(0.68, 0.68);
  ctx.strokeStyle = "#F3F2EC";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const p1 = new Path2D(
    "M75 21 C63 12 42 12 29 21 C15 31 16 45 31 51 C37 54 43 55 46 56"
  );
  const p2 = new Path2D(
    "M55 56 C62 58 70 61 76 66 C86 75 82 88 71 94 C57 102 36 98 23 86"
  );
  ctx.stroke(p1);
  ctx.stroke(p2);
  ctx.fillStyle = "#C7D977";
  ctx.beginPath();
  ctx.arc(50.5, 55.5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#F3F2EC";
  ctx.font = "600 32px Inter, system-ui, sans-serif";
  ctx.fillText("SELYE", 190, 179);

  // Badge "DIA X DE 365" no canto superior direito
  const badgeText = editorial.dayCounterLabel.toUpperCase();
  ctx.font = "600 24px ui-monospace, monospace";
  const badgeW = ctx.measureText(badgeText).width + 56;
  const badgeX = W - 112 - badgeW;
  ctx.fillStyle = "rgba(199, 217, 119, 0.14)";
  ctx.beginPath();
  ctx.roundRect(badgeX, 138, badgeW, 54, 27);
  ctx.fill();
  ctx.strokeStyle = "rgba(199, 217, 119, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#C7D977";
  ctx.fillText(badgeText, badgeX + 28, 173);

  // Categoria editorial
  ctx.fillStyle = "#C7D977";
  ctx.font = "500 24px ui-monospace, monospace";
  ctx.fillText(
    `NOTA DO DIA  ·  ${editorial.quote.categoryLabelPt.toUpperCase()}`,
    112,
    560
  );

  // Barra vertical Lima lateral à citação
  ctx.fillStyle = "#C7D977";
  ctx.fillRect(112, 620, 6, 420);

  // Citação principal
  ctx.fillStyle = "#F3F2EC";
  ctx.font = "400 58px Inter, system-ui, sans-serif";
  const quoteLines = wrapCanvasText(
    ctx,
    `“${editorial.quote.messageText}”`,
    W - 260
  );
  let cursorY = 685;
  for (const line of quoteLines) {
    ctx.fillText(line, 152, cursorY);
    cursorY += 80;
  }

  // Autor + contexto
  cursorY += 44;
  ctx.fillStyle = "#F3F2EC";
  ctx.font = "600 34px Inter, system-ui, sans-serif";
  ctx.fillText(`— ${editorial.quote.author}`, 152, cursorY);

  cursorY += 46;
  ctx.fillStyle = "#AAB2AA";
  ctx.font = "400 26px Inter, system-ui, sans-serif";
  const contextLines = wrapCanvasText(ctx, editorial.quote.roleOrContext, W - 260);
  for (const l of contextLines) {
    ctx.fillText(l, 152, cursorY);
    cursorY += 36;
  }

  // Progresso do ano + Dias ativos no rodapé
  const barY = H - 310;
  const barW = W - 224;
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.roundRect(112, barY, barW, 8, 4);
  ctx.fill();

  ctx.fillStyle = "#C7D977";
  ctx.beginPath();
  ctx.roundRect(
    112,
    barY,
    Math.max(12, (barW * editorial.yearProgressPercent) / 100),
    8,
    4
  );
  ctx.fill();

  ctx.fillStyle = "#F3F2EC";
  ctx.font = "500 26px ui-monospace, monospace";
  const activeLabel = `${activeDaysInYear} ${
    activeDaysInYear === 1 ? "dia ativo" : "dias ativos"
  } em ${editorial.year}`;
  ctx.fillText(activeLabel, 112, barY + 56);

  ctx.fillStyle = "#AAB2AA";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText(
    "ORGANIZAR · REGISTRAR · ACOMPANHAR",
    112,
    H - 135
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Erro ao gerar PNG"))),
      "image/png"
    );
  });
}

export function DailyQuoteCard({
  editorial,
  activeDaysInYear,
}: DailyQuoteCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const { quote } = editorial;

  const handleDownloadStory = async () => {
    setIsExporting(true);
    try {
      const blob = await renderStoryPngBlob(editorial, activeDaysInYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selye-dia-${editorial.dayOfYear}-story.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const shareCaption = `“${quote.messageText}” — ${quote.author}\n\n${editorial.dayCounterLabel} · ${activeDaysInYear} ${
    activeDaysInYear === 1 ? "dia ativo" : "dias ativos"
  } em ${editorial.year} · Selye`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    shareCaption
  )}`;

  const handleNativeShare = async () => {
    setIsExporting(true);
    try {
      const blob = await renderStoryPngBlob(editorial, activeDaysInYear);
      const file = new File(
        [blob],
        `selye-dia-${editorial.dayOfYear}.png`,
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
      } else {
        await handleDownloadStory();
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareCaption);
          setCopiedCaption(true);
          setTimeout(() => setCopiedCaption(false), 2600);
        }
      }
    } catch {
      // usuário cancelou compartilhamento
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <section className="col-span-12 lg:col-span-7 xl:col-span-6 surface-hero p-6 sm:p-7 flex flex-col justify-between gap-5">
        {/* Camadas sutis de textura editorial */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(199,217,119,0.1)_1px,transparent_1px)] [background-size:22px_22px] opacity-45"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lima/12 blur-3xl"
        />

        {/* Cabeçalho Editorial */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-lima" />
            <span className="t-label !text-nevoa">
              {quote.categoryLabelPt}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="t-data text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-lima">
              {editorial.dayCounterLabel}
            </span>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Compartilhar nota do dia"
              title="Compartilhar no WhatsApp, Status, Stories e redes"
              className="h-7 px-2.5 rounded-full bg-white/[0.08] hover:bg-lima hover:text-grafite text-osso border border-white/10 text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 size={12} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>

        {/* Bloco Central da Citação */}
        <figure className="relative z-10 pl-4 sm:pl-5 border-l-2 border-lima/80 space-y-3 my-1">
          <blockquote className="text-lg sm:text-[23px] leading-[1.35] tracking-[-0.015em] font-normal text-osso text-balance">
            &ldquo;{quote.messageText}&rdquo;
          </blockquote>
          <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="text-osso font-semibold">— {quote.author}</span>
            <span className="text-nevoa/80 hidden sm:inline">
              · {quote.roleOrContext}
            </span>
          </figcaption>
        </figure>

        {/* Rodapé: Progresso Anual + Dias Ativos Sutis */}
        <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
            <span className="text-nevoa inline-flex items-center gap-1.5">
              <CalendarCheck2 size={13} className="text-lima shrink-0" />
              <span>
                <strong className="text-osso">{activeDaysInYear}</strong>{" "}
                {activeDaysInYear === 1 ? "dia ativo" : "dias ativos"} em{" "}
                {editorial.year}
              </span>
            </span>
            <span className="text-nevoa/80">
              {editorial.yearProgressPercent}% do ano
            </span>
          </div>
          <div
            className="h-1 w-full rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={editorial.yearProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${editorial.yearProgressPercent}% de ${editorial.year} concluído`}
          >
            <div
              className="h-full bg-lima rounded-full transition-all duration-500"
              style={{ width: `${editorial.yearProgressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* Modal de Prévia e Exportação via ModalPortal (9:16 · 1080×1920) */}
      <ModalPortal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        ariaLabel="Compartilhar nota do dia"
        maxWidthClass="max-w-sm"
      >
        <div className="card w-full bg-surface border border-line p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="t-label !text-accent-text">
                  WhatsApp · Status · Stories
                </span>
                <h3 className="t-h3 mt-0.5">Compartilhar Nota do Dia</h3>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                aria-label="Fechar prévia"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Prévia visual fiel ao card 9:16 */}
            <div className="mx-auto w-full max-w-[230px] aspect-[9/16] rounded-2xl bg-gradient-to-br from-noite via-[#1b2421] to-grafite text-osso p-5 flex flex-col justify-between border border-white/12 shadow-lg relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(199,217,119,0.12)_1px,transparent_1px)] [background-size:14px_14px] opacity-40"
              />
              <div className="relative z-10 flex items-center justify-between text-[9px] font-mono">
                <span className="font-semibold tracking-widest text-osso">
                  SELYE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-lima/15 text-lima border border-lima/30">
                  {editorial.dayCounterLabel}
                </span>
              </div>

              <div className="relative z-10 border-l-2 border-lima pl-3 space-y-2 my-auto">
                <span className="block text-[8px] font-mono uppercase tracking-widest text-lima">
                  {quote.categoryLabelPt}
                </span>
                <p className="text-[12px] leading-snug text-osso font-normal">
                  &ldquo;{quote.messageText}&rdquo;
                </p>
                <p className="text-[10px] font-semibold text-nevoa">
                  — {quote.author}
                </p>
              </div>

              <div className="relative z-10 space-y-1.5">
                <div className="h-0.5 w-full bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lima"
                    style={{ width: `${editorial.yearProgressPercent}%` }}
                  />
                </div>
                <p className="text-[9px] font-mono text-nevoa">
                  {activeDaysInYear}{" "}
                  {activeDaysInYear === 1 ? "dia ativo" : "dias ativos"} em{" "}
                  {editorial.year}
                </p>
              </div>
            </div>

            {copiedCaption && (
              <p className="text-center text-xs font-mono text-accent-text flex items-center justify-center gap-1.5">
                <Check size={13} />
                <span>Imagem baixada e legenda copiada!</span>
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleNativeShare}
                className="btn btn-primary h-10 w-full text-xs"
              >
                <Share2 size={14} />
                <span>
                  {isExporting
                    ? "Preparando imagem..."
                    : "Compartilhar (Stories / Status / Apps)"}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-dark h-9 text-xs font-mono"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadStory}
                  className="btn btn-ghost h-9 text-xs font-mono"
                >
                  <Download size={13} />
                  <span>Baixar PNG</span>
                </button>
              </div>
            </div>
          </div>
      </ModalPortal>
    </>
  );
}
