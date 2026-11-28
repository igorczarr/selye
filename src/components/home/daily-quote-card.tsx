"use client";

import { useState } from "react";
import type { DailyEditorialResult } from "@/core/editorial/daily-quotes";
import { DailyQuoteShareModal } from "@/components/home/daily-quote-story-template";
import { CalendarCheck2, Share2 } from "lucide-react";

interface DailyQuoteCardProps {
  editorial: DailyEditorialResult;
  activeDaysInYear: number;
}

export function DailyQuoteCard({
  editorial,
  activeDaysInYear,
}: DailyQuoteCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const { quote } = editorial;
  const dayPadded = String(editorial.dayOfYear).padStart(3, "0");

  return (
    <>
      <section className="col-span-12 lg:col-span-7 xl:col-span-6 relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#1C2420] via-[#121815] to-[#080B0A] p-6 sm:p-7 text-[#F4F3EF] shadow-xl flex flex-col justify-between gap-6">
        {/* Glow atmosférico e escultura Selye em baixo-relevo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C7F000]/10 blur-3xl"
        />

        {/* Cabeçalho estilo Masthead Pós-Treino */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C7F000]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C7F000]">
              {quote.categoryLabelPt}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[#9CA39E]">
              EDIÇÃO {dayPadded}/{editorial.totalDaysInYear}
            </span>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Compartilhar pôster da frase do dia"
              className="h-7 px-3 rounded-full bg-[#C7F000] text-[#121815] hover:brightness-105 text-[11px] font-mono font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 size={12} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>

        {/* Citação em escala editorial imponente */}
        <figure className="relative z-10 space-y-4">
          <blockquote className="font-display text-xl sm:text-[26px] font-extrabold leading-[1.2] tracking-[-0.025em] text-[#F4F3EF] text-balance">
            {quote.messageText.replace(/[.!?]+$/, "")}
            <span className="text-[#C7F000]">.</span>
          </blockquote>
          <figcaption className="border-l-2 border-[#C7F000] pl-3 space-y-0.5">
            <p className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#F4F3EF]">
              {quote.author}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#9CA39E]">
              {quote.roleOrContext}
            </p>
          </figcaption>
        </figure>

        {/* Rodapé de telemetria espelhando o Template Pós-Treino */}
        <div className="relative z-10 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex items-baseline gap-4">
            <div className="font-mono">
              <span className="text-2xl font-black tracking-tight text-[#F4F3EF]">
                {dayPadded}
              </span>
              <span className="ml-1 text-xs font-extrabold text-[#C7F000]">
                /{editorial.totalDaysInYear}
              </span>
            </div>
            <span className="h-5 w-px bg-white/20 self-center" aria-hidden />
            <div className="flex items-center gap-2 font-mono">
              <span className="text-2xl font-black tracking-tight text-[#F4F3EF]">
                {activeDaysInYear}
              </span>
              <span className="flex flex-col leading-none text-[9.5px] font-extrabold tracking-widest uppercase">
                <span className="text-[#C7F000]">• DIAS</span>
                <span className="text-[#F4F3EF]/85 mt-0.5">ATIVOS</span>
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1.5 font-mono text-[10px] text-[#9CA39E]">
            <span className="inline-flex items-center gap-1">
              <CalendarCheck2 size={12} className="text-[#C7F000]" />
              <span>{editorial.yearProgressPercent}% DE {editorial.year}</span>
            </span>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#C7F000]"
                style={{ width: `${editorial.yearProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <DailyQuoteShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        editorial={editorial}
        activeDaysInYear={activeDaysInYear}
      />
    </>
  );
}
