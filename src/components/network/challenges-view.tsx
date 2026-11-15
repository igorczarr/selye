"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { joinChallenge, getChallengeLeaderboard } from "@/actions/challenges";
import {
  Trophy,
  Calendar,
  Target,
  Users,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
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

export function ChallengesView({ initialChallenges }: ChallengesViewProps) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(
    null
  );
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>(
    {}
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isPending, startTransition] = useTransition();

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
    });
  };

  const toggleLeaderboard = async (challengeId: string) => {
    if (expandedLeaderboard === challengeId) {
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
      case "consistency_week":
        return "Consistência Semanal";
      case "frequency":
        return "Frequência Multimodal";
      case "technical":
        return "Qualidade Técnica";
      default:
        return "Ciclo Coletivo";
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full fade-up">
      {/* Cabeçalho */}
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
          <span className="t-label">Compromisso Coletivo</span>
        </div>
        <h1 className="t-h1 mt-1">Desafios Comunitários</h1>
        <p className="text-muted text-sm mt-1">
          Ciclos focados em assiduidade, autonomia e regularidade semanal — sem estímulo ao excesso de volume.
        </p>
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
              className="card p-6 flex flex-col gap-4"
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

                <div className="flex items-center gap-2 shrink-0">
                  <span className="chip">
                    <Users size={13} />
                    <span className="t-data">
                      {challenge.participantsCount} atletas
                    </span>
                  </span>

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
                      <span>Seu Progresso no Ciclo</span>
                    </span>
                    <span className="t-data text-accent-text font-semibold">
                      {challenge.userProgress} / {challenge.targetValue || "4"}{" "}
                      {challenge.targetMetric || "sessões"} ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-lima rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Controle do Quadro de Participantes */}
              <div className="border-t border-line pt-3 flex justify-between items-center">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleLeaderboard(challenge.id)}
                  className="text-xs text-accent-text hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {isExpanded
                      ? "Ocultar Quadro de Participantes"
                      : "Ver Quadro de Participantes"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                <span className="t-aux text-muted">Adesão & Constância</span>
              </div>

              {isExpanded && (
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
                          className="flex items-center justify-between p-2.5 rounded-lg bg-foreground/[0.02] text-xs border border-line"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 text-center t-data font-semibold text-muted">
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
                              {p.progressValue} / {challenge.targetValue}
                            </span>
                            {p.completed && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-lima text-grafite font-semibold font-mono">
                                Concluído
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      Nenhum participante listado ainda. Participe para inaugurar o quadro!
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
