"use client";

import { useState, useEffect } from "react";
import type { DailyEditorialResult } from "@/core/editorial/daily-quotes";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Share2,
  HelpCircle,
  Sparkles,
  Sun,
  Compass,
  Play,
  CheckCircle2,
  X,
  MessageCircle,
  Download,
  Check,
} from "lucide-react";

interface HomeEditorialHeaderProps {
  userName?: string | null;
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

/** Gera Story PNG 1080x1920 para WhatsApp / Instagram Stories */
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

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#151C1A");
  bg.addColorStop(0.55, "#1B2421");
  bg.addColorStop(1, "#202A27");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.85, H * 0.14, 40, W * 0.85, H * 0.14, 540);
  glow.addColorStop(0, "rgba(199, 217, 119, 0.14)");
  glow.addColorStop(1, "rgba(199, 217, 119, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "#C7F000";
  ctx.fillText("SELYE", 108, 140);

  ctx.font = "20px monospace";
  ctx.fillStyle = "#A8B3AE";
  ctx.fillText(editorial.dayCounterLabel, 108, 175);

  const quote = editorial.quote;
  ctx.fillStyle = "#C7F000";
  ctx.fillRect(108, H * 0.38 - 18, 5, 220);

  ctx.font = 'normal 46px "Times New Roman", Georgia, serif';
  ctx.fillStyle = "#F3F2EC";
  const lines = wrapCanvasText(ctx, `“${quote.messageText}”`, W - 260);
  let y = H * 0.38 + 20;
  for (const line of lines) {
    ctx.fillText(line, 130, y);
    y += 58;
  }

  y += 24;
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "#F3F2EC";
  ctx.fillText(`— ${quote.author}`, 130, y);

  if (quote.roleOrContext) {
    y += 34;
    ctx.font = "normal 21px sans-serif";
    ctx.fillStyle = "#A8B3AE";
    ctx.fillText(quote.roleOrContext, 130, y);
  }

  ctx.font = "18px monospace";
  ctx.fillStyle = "#A8B3AE";
  ctx.fillText(
    `${activeDaysInYear} dias ativos em ${editorial.year} · selye.app`,
    108,
    H - 120
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Falha ao gerar blob do canvas"));
    }, "image/png");
  });
}

export function HomeEditorialHeader({
  userName,
  editorial,
  activeDaysInYear,
}: HomeEditorialHeaderProps) {
  const [greeting, setGreeting] = useState<string>("Olá");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Bom dia");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Boa tarde");
    } else {
      setGreeting("Boa noite");
    }
  }, []);

  const firstName = userName?.trim()
    ? userName.trim().split(" ")[0]
    : null;

  const quote = editorial.quote;
  const shareCaption = `"${quote.messageText}" — ${quote.author} (${editorial.dayCounterLabel} · Selye)`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareCaption)}`;

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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `selye-dia-${editorial.dayOfYear}.png`;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareCaption);
          setCopiedCaption(true);
          setTimeout(() => setCopiedCaption(false), 2600);
        }
      }
    } catch {
      // Ignora cancelamento
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadStory = async () => {
    setIsExporting(true);
    try {
      const blob = await renderStoryPngBlob(editorial, activeDaysInYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selye-dia-${editorial.dayOfYear}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="flex flex-col gap-1.5 pt-1 pb-1">
      {/* Linha 1: Saudação elegante e discreta + Ações rápidas */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {greeting}
          {firstName ? `, ${firstName}!` : "!"}
        </h1>

        <div className="flex items-center gap-2">
          {/* Botão Sutil "Como funciona o Selye" (somente sob demanda) */}
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            aria-label="Como o Selye funciona em 3 passos"
            title="Como o Selye funciona em 3 passos"
            className="h-7 px-2.5 rounded-full border border-line bg-surface hover:bg-foreground/5 text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle size={13} className="text-accent-text" />
            <span className="hidden sm:inline">Como funciona?</span>
          </button>

          {/* Botão Sutil de Compartilhar a Citação do Dia */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Compartilhar frase do dia"
            title="Compartilhar frase do dia (Stories / WhatsApp)"
            className="h-7 w-7 sm:w-auto sm:px-2.5 rounded-full border border-line bg-surface hover:bg-foreground/5 text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center justify-center sm:gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 size={12} className="text-accent-text" />
            <span className="hidden sm:inline">Frase do dia</span>
          </button>
        </div>
      </div>

      {/* Linha 2: Frase do Dia completa, sutil e elegante */}
      <div className="text-xs sm:text-sm text-muted leading-relaxed">
        <p className="italic">
          &ldquo;{quote.messageText}&rdquo;
          <span className="not-italic text-foreground/80 font-medium ml-1.5">
            — {quote.author}
          </span>
        </p>
      </div>

      {/* MODAL 1: Como o Selye funciona em 3 passos (apenas quando solicitado) */}
      <ModalPortal
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        ariaLabel="Como o Selye funciona"
        maxWidthClass="max-w-xl"
      >
        <div className="card w-full bg-surface border border-line p-5 sm:p-6 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text inline-flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Simples, Humano & Feito para o Seu Ritmo</span>
              </span>
              <h2 className="t-h3 mt-1">Como o Selye funciona no seu dia a dia</h2>
              <p className="text-xs text-muted mt-0.5">
                Você não precisa de termos técnicos. O Selye traduz seus sinais corporais para você treinar com clareza e autonomia:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHowItWorksOpen(false)}
              aria-label="Fechar guia"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-line bg-foreground/[0.02] p-3.5 flex flex-col gap-2">
              <div className="w-7 h-7 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sun size={13} className="text-accent-text" />
                <span>Check-in Matinal</span>
              </h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Em 4 toques, marque como foi seu sono e energia ao acordar para calibrar sua bateria diária (+EA).
              </p>
            </div>

            <div className="rounded-xl border border-line bg-foreground/[0.02] p-3.5 flex flex-col gap-2">
              <div className="w-7 h-7 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Compass size={13} className="text-accent-text" />
                <span>Decisão do Dia</span>
              </h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Veja sua <strong>Bateria do Corpo (EA)</strong>: o Selye indica se hoje é dia de treinar forte, manter ritmo ou descansar.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-foreground/[0.02] p-3.5 flex flex-col gap-2">
              <div className="w-7 h-7 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Play size={13} className="text-accent-text" />
                <span>Treino ou Registro</span>
              </h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Inicie uma ficha pronta com cronômetro ou registre qualquer esporte (corrida, pedal, vôlei, futsal) no botão do topo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHowItWorksOpen(false)}
            className="btn btn-primary h-9 w-full text-xs font-mono font-bold mt-1"
          >
            <CheckCircle2 size={14} />
            <span>Entendi, pronto para treinar</span>
          </button>
        </div>
      </ModalPortal>

      {/* MODAL 2: Compartilhar Citação do Dia */}
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
              <h3 className="t-h3 mt-0.5">Compartilhar Frase do Dia</h3>
            </div>
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Prévia visual 9:16 */}
          <div className="mx-auto w-full max-w-[210px] aspect-[9/16] rounded-2xl bg-gradient-to-br from-noite via-[#1b2421] to-grafite text-osso p-4 flex flex-col justify-between border border-white/12 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between text-[9px] font-mono">
              <span className="font-semibold tracking-widest text-osso">SELYE</span>
              <span className="px-2 py-0.5 rounded-full bg-lima/15 text-lima border border-lima/30">
                {editorial.dayCounterLabel}
              </span>
            </div>

            <div className="relative z-10 border-l-2 border-lima pl-2.5 space-y-1.5 my-auto">
              <p className="text-[11px] leading-snug text-osso font-normal">
                &ldquo;{quote.messageText}&rdquo;
              </p>
              <p className="text-[9px] font-semibold text-nevoa">
                — {quote.author}
              </p>
            </div>

            <p className="relative z-10 text-[8px] font-mono text-nevoa">
              {activeDaysInYear} dias ativos em {editorial.year}
            </p>
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
                {isExporting ? "Preparando imagem..." : "Compartilhar nos Stories"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-dark h-9 text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadStory}
                className="btn btn-ghost h-9 text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Baixar PNG</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </header>
  );
}
