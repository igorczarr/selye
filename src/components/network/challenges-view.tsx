"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  joinChallenge,
  getChallengeLeaderboard,
  createChallengeIn3Taps,
  type ChallengeScoringFormat,
} from "@/actions/challenges";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Trophy,
  Calendar,
  Target,
  Users,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageCircle,
  Zap,
  Clock,
  CalendarCheck2,
  X,
  Check,
} from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  challengeType: string;
  targetMetric: string | null;
  targetValue: string | null;
  participantsCount: number;
  hasJoined: boolean;
  userProgress: string;
  isCompleted: boolean;
}

interface ChallengesViewProps {
  initialChallenges: Challenge[];
}

const SCORING_OPTIONS: {
  id: ChallengeScoringFormat;
  label: string;
  unit: string;
  desc: string;
  icon: typeof CalendarCheck2;
}[] = [
  {
    id: "active_days",
    label: "Dias Ativos",
    unit: "dias ativos",
    desc: "1 ponto por dia com qualquer esporte registrado (musculação, areia, corrida, futsal)",
    icon: CalendarCheck2,
  },
  {
    id: "adaptive_energy",
    label: "Energia do Corpo (EA)",
    unit: "EA",
    desc: "Placar unificado Selye: soma esforço multimodal e também hábitos regenerativos (+EA)",
    icon: Zap,
  },
  {
    id: "minutes",
    label: "Minutos em Movimento",
    unit: "min",
    desc: "Soma a duração ativa de todas as sessões concluídas no período",
    icon: Clock,
  },
];

const DURATION_OPTIONS: { days: 7 | 28 | 90; label: string; sub: string }[] = [
  { days: 7, label: "7 Dias", sub: "Sprint Semanal" },
  { days: 28, label: "28 Dias", sub: "Ciclo Mensal" },
  { days: 90, label: "90 Dias", sub: "Trimestre" },
];

export function ChallengesView({ initialChallenges }: ChallengesViewProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(
    initialChallenges[0]?.id || null
  );
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>(
    {}
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal Criar Desafio em 3 Toques (Fase 14)
  const [createOpen, setCreateOpen] = useState(false);
  const [scoringFormat, setScoringFormat] =
    useState<ChallengeScoringFormat>("active_days");
  const [durationDays, setDurationDays] = useState<7 | 28 | 90>(7);
  const [customTitle, setCustomTitle] = useState("");

  const handleJoin = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              hasJoined: true,
              participantsCount: c.participantsCount + 1,
            }
          : c
      )
    );

    startTransition(async () => {
      await joinChallenge(challengeId);
      const data = await getChallengeLeaderboard(challengeId);
      setLeaderboardData((prev) => ({ ...prev, [challengeId]: data }));
      setExpandedLeaderboard(challengeId);
      router.refresh();
    });
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const created = await createChallengeIn3Taps({
        scoringFormat,
        durationDays,
        title: customTitle.trim() || undefined,
      });
      setCreateOpen(false);
      setCustomTitle("");
      setChallenges((prev) => [
        {
          ...created,
          startDate: String(created.startDate),
          endDate: String(created.endDate),
          participantsCount: 1,
          hasJoined: true,
          userProgress: "1",
          isCompleted: false,
        },
        ...prev,
      ]);
      router.refresh();
    });
  };

  const toggleLeaderboard = async (challengeId: string) => {
    if (expandedLeaderboard === challengeId && leaderboardData[challengeId]) {
      setExpandedLeaderboard(null);
      return;
    }

    setExpandedLeaderboard(challengeId);

    if (!leaderboardData[challengeId]) {
      setLoadingLeaderboard(true);
      const data = await getChallengeLeaderboard(challengeId);
      setLeaderboardData((prev) => ({ ...prev, [challengeId]: data }));
      setLoadingLeaderboard(false);
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "adaptive_energy":
        return "Placar Energia do Corpo (EA)";
      case "minutes":
        return "Minutos em Movimento";
      case "active_days":
      case "consistency_week":
        return "Dias Ativos · Qualquer Esporte";
      case "frequency":
        return "Frequência Multimodal";
      case "technical":
        return "Qualidade Técnica";
      default:
        return "Ciclo Coletivo";
    }
  };

  const buildWhatsAppInviteUrl = (challenge: Challenge) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://selye.app";
    const text = `Bora entrar no desafio "${challenge.title}" no Selye?\n\nPlacar: ${getTypeText(
      challenge.challengeType
    )} · Meta: ${challenge.targetValue || "4"} ${
      challenge.targetMetric || "sessões"
    }.\nCada um pontua no seu esporte (musculação, vôlei de praia, corrida, futsal)!\n\nAcesse: ${origin}/comunidade/desafios`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full fade-up">
      {/* Cabeçalho + Botão Criar em 3 Toques */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link
            href="/comunidade"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Mural</span>
          </Link>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-accent-text" />
            <span className="t-label">Hábito Coletivo & Placar Multimodal</span>
          </div>
          <h1 className="t-h1 mt-1">Desafios entre Amigos</h1>
          <p className="text-muted text-sm mt-1">
            Compita com amigos em Dias Ativos, Minutos ou Energia do Corpo (EA) — cada pessoa na sua modalidade e respeitando o descanso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn btn-primary h-10 px-4 text-xs shrink-0 self-start sm:self-auto"
        >
          <Plus size={15} strokeWidth={2.3} />
          <span>Criar Desafio (3 Toques)</span>
        </button>
      </div>

      {/* Lista de Desafios */}
      <div className="flex flex-col gap-4">
        {challenges.map((challenge) => {
          const isExpanded = expandedLeaderboard === challenge.id;
          const currentBoard = leaderboardData[challenge.id];
          const progressPct = Math.min(
            100,
            Math.round(
              (Number(challenge.userProgress) /
                Math.max(1, Number(challenge.targetValue || 4))) *
                100
            )
          );

          return (
            <article
              key={challenge.id}
              className="card p-5 sm:p-6 flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">
                      {getTypeText(challenge.challengeType)}
                    </span>
                    <span className="t-data text-xs text-muted flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>
                        {new Date(challenge.startDate).toLocaleDateString(
                          "pt-BR"
                        )}{" "}
                        —{" "}
                        {new Date(challenge.endDate).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    </span>
                  </div>
                  <h2 className="t-h2 mt-2">{challenge.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="chip">
                    <Users size={13} />
                    <span className="t-data">
                      {challenge.participantsCount}{" "}
                      {challenge.participantsCount === 1 ? "atleta" : "atletas"}
                    </span>
                  </span>

                  <a
                    href={buildWhatsAppInviteUrl(challenge)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Convidar amigos pelo WhatsApp"
                    className="btn btn-ghost h-9 px-3 text-xs font-mono"
                  >
                    <MessageCircle size={13} className="text-accent-text" />
                    <span>Convidar</span>
                  </a>

                  {challenge.hasJoined ? (
                    <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-lima/25 text-foreground text-xs font-semibold">
                      <CheckCircle2 size={14} className="text-accent-text" />
                      <span>Inscrito</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(challenge.id)}
                      disabled={isPending}
                      className="btn btn-primary h-9 px-4 text-xs"
                    >
                      Participar
                    </button>
                  )}
                </div>
              </div>

              {challenge.description && (
                <p className="text-xs text-muted leading-relaxed">
                  {challenge.description}
                </p>
              )}

              {/* Progresso do Atleta Inscrito */}
              {challenge.hasJoined && (
                <div className="p-4 rounded-xl bg-foreground/[0.02] border border-line flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Target size={14} className="text-accent-text" />
                      <span>Sua Pontuação no Desafio</span>
                    </span>
                    <span className="t-data text-accent-text font-semibold">
                      {challenge.userProgress} / {challenge.targetValue || "4"}{" "}
                      {challenge.targetMetric || "sessões"} ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-lima rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, progressPct)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Controle do Placar de Participantes */}
              <div className="border-t border-line pt-3 flex justify-between items-center">
                <button
                  type="button"
                  aria-expanded={isExpanded && Boolean(currentBoard)}
                  onClick={() => toggleLeaderboard(challenge.id)}
                  className="text-xs text-accent-text hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {isExpanded && currentBoard
                      ? "Ocultar Placar de Atletas"
                      : "Ver Placar Ao Vivo"}
                  </span>
                  {isExpanded && currentBoard ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                <span className="t-aux text-muted">
                  Meta: {challenge.targetValue || "4"}{" "}
                  {challenge.targetMetric || "sessões"}
                </span>
              </div>

              {isExpanded && (loadingLeaderboard || currentBoard) && (
                <div className="border-t border-line/60 pt-3">
                  {loadingLeaderboard && !currentBoard ? (
                    <div className="space-y-2" aria-busy="true">
                      <div className="skeleton h-10 w-full" />
                      <div className="skeleton h-10 w-full" />
                    </div>
                  ) : currentBoard && currentBoard.participants.length > 0 ? (
                    <div className="space-y-2">
                      {currentBoard.participants.map((p: any, idx: number) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs border ${
                            idx === 0
                              ? "bg-lima/12 border-lima/50"
                              : "bg-foreground/[0.02] border-line"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center t-data font-semibold ${
                                idx === 0
                                  ? "bg-lima text-grafite"
                                  : "text-muted"
                              }`}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-xs">
                              {p.name?.[0] || "A"}
                            </div>
                            <Link
                              href={`/atleta/${p.username}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {p.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="t-data text-accent-text font-semibold">
                              {p.progressValue} / {challenge.targetValue}{" "}
                              {challenge.targetMetric || ""}
                            </span>
                            {p.completed && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] bg-lima text-grafite font-semibold font-mono">
                                Meta Batida
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      Clique em <strong>Ver Placar Ao Vivo</strong> para carregar a classificação dos atletas.
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Modal: Criar Desafio em 3 Toques (via ModalPortal) */}
      <ModalPortal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        ariaLabel="Criar desafio entre amigos em 3 toques"
        maxWidthClass="sm:max-w-lg"
      >
        <form
          onSubmit={handleCreateChallenge}
          className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text">
                Social Multimodal · 3 Toques
              </span>
              <h2 className="t-h2 mt-0.5">Criar Desafio entre Amigos</h2>
              <p className="text-xs text-muted mt-0.5">
                Escolha o formato do placar e a duração. Em seguida, convide seu grupo pelo WhatsApp com 1 clique.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              aria-label="Fechar criação de desafio"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Toque 1: Formato do Placar */}
          <div className="flex flex-col gap-2">
            <span className="t-label">
              1. Formato do Placar (Qualquer Esporte)
            </span>
            <div className="flex flex-col gap-2">
              {SCORING_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = scoringFormat === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setScoringFormat(opt.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      active
                        ? "border-lima bg-lima/15 text-foreground"
                        : "border-line bg-foreground/[0.02] hover:bg-foreground/[0.04] text-foreground"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        active
                          ? "bg-lima text-grafite"
                          : "bg-foreground/6 text-muted"
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toque 2: Duração */}
          <div className="flex flex-col gap-2">
            <span className="t-label">2. Duração do Ciclo</span>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => {
                const active = durationDays === d.days;
                return (
                  <button
                    key={d.days}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDurationDays(d.days)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      active
                        ? "bg-foreground text-background border-foreground font-semibold"
                        : "border-line bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="t-data text-sm font-semibold">
                      {d.label}
                    </span>
                    <span className="text-[10px] font-mono opacity-80">
                      {d.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toque 3: Nome personalizado opcional */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="challenge-custom-title"
              className="t-label"
            >
              3. Nome do Desafio (Opcional)
            </label>
            <input
              id="challenge-custom-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ex: Grupo Areia & Academia · Sprint de Novembro"
              className="input h-10 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn btn-ghost h-10 px-4 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary h-10 px-5 text-xs"
            >
              <Check size={14} strokeWidth={2.4} />
              <span>
                {isPending ? "Criando..." : "Lançar Desafio Agora"}
              </span>
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
}
