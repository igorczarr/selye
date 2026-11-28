"use client";

import { useState, useSyncExternalStore } from "react";
import type { DailyEditorialResult } from "@/core/editorial/daily-quotes";
import { ModalPortal } from "@/components/ui/modal-portal";
import { DailyQuoteShareModal } from "@/components/home/daily-quote-story-template";
import {
  Share2,
  HelpCircle,
  Sparkles,
  Sun,
  Compass,
  Play,
  CheckCircle2,
  X,
} from "lucide-react";

interface HomeEditorialHeaderProps {
  userName?: string | null;
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
}

const emptySubscribe = () => () => {};

function getClientGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomeEditorialHeader({
  userName,
  editorial,
  activeDaysInYear,
}: HomeEditorialHeaderProps) {
  const greeting = useSyncExternalStore(
    emptySubscribe,
    getClientGreeting,
    () => "Olá"
  );
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const firstName = userName?.trim()
    ? userName.trim().split(" ")[0]
    : null;

  const { quote } = editorial;

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

          {/* Botão de Compartilhar o Pôster da Frase do Dia */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Compartilhar frase do dia"
            title="Compartilhar pôster da frase do dia (Stories / Status)"
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

      {/* MODAL 1: Como o Selye funciona em 3 passos */}
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

      {/* MODAL 2: Pôster HD da Frase do Dia (identidade Pós-Treino) */}
      <DailyQuoteShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        editorial={editorial}
        activeDaysInYear={activeDaysInYear}
      />
    </header>
  );
}
