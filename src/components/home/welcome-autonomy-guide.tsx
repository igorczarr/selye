"use client";

import { useState, useEffect } from "react";
import { Sparkles, Sun, Compass, Play, X, HelpCircle, CheckCircle2 } from "lucide-react";

/**
 * Guia de Boas-Vindas e Autonomia em 3 Passos para Iniciantes e Novos Atletas.
 * Explica de forma 100% humana e acolhedora como aproveitar o Selye no dia a dia,
 * podendo ser reaberto a qualquer momento pelo botão "Como funciona?".
 */
export function WelcomeAutonomyGuide({
  totalCompletedWorkouts = 0,
}: {
  totalCompletedWorkouts?: number;
}) {
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("selye-autonomy-guide-dismissed");
      if (saved === "true") {
        setDismissed(true);
      } else {
        // Se tem poucos treinos ou nunca fechou o guia, mostra aberto para acolher
        setDismissed(totalCompletedWorkouts > 5);
      }
    } catch {
      setDismissed(false);
    }
  }, [totalCompletedWorkouts]);

  const handleClose = () => {
    setDismissed(true);
    try {
      localStorage.setItem("selye-autonomy-guide-dismissed", "true");
    } catch {
      // ignora
    }
  };

  const handleReopen = () => {
    setDismissed(false);
    try {
      localStorage.setItem("selye-autonomy-guide-dismissed", "false");
    } catch {
      // ignora
    }
  };

  if (!mounted) return null;

  if (dismissed) {
    return (
      <div className="flex items-center justify-end -mb-2">
        <button
          type="button"
          onClick={handleReopen}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <HelpCircle size={13} className="text-accent-text" />
          <span>Novo por aqui? Veja como o Selye funciona em 3 passos</span>
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Como usar o Selye no seu dia a dia"
      className="card p-4 sm:p-5 border-l-4 border-l-lima bg-gradient-to-r from-lima/[0.08] via-surface to-surface flex flex-col gap-3.5 fade-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="t-label !text-accent-text inline-flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Simples, Humano & Feito para o Seu Ritmo</span>
          </span>
          <h2 className="t-h3 mt-0.5 text-foreground">
            Como aproveitar o Selye todos os dias (mesmo começando do zero)
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Você não precisa entender termos técnicos. Nós traduzimos os sinais do seu corpo para você evoluir com autonomia e segurança:
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Entendi, recolher guia"
          className="h-7 px-2.5 rounded-lg border border-line bg-surface hover:bg-foreground/5 text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <CheckCircle2 size={12} className="text-accent-text" />
          <span>Entendi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-surface/90 p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sun size={13} className="text-accent-text" />
              <span>Conte como acordou</span>
            </h3>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              Clique em <strong>Check-in Matinal</strong> logo abaixo e marque em 4 toques como foi seu sono e sua energia.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface/90 p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Compass size={13} className="text-accent-text" />
              <span>Siga a Orientação do Dia</span>
            </h3>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              Veja sua <strong>Bateria do Corpo (EA)</strong>: o Selye avisa se hoje é dia de treinar forte, ir moderado ou descansar sem culpa.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface/90 p-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-lima text-grafite font-mono font-bold text-xs flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Play size={13} className="text-accent-text" />
              <span>Treine ou Registre Livre</span>
            </h3>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              Escolha uma ficha pronta (com vídeos passo a passo) ou clique em <strong>Registrar Atividade</strong> no topo para qualquer esporte.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
