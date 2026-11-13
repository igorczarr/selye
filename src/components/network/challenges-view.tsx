"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { joinChallenge, getChallengeLeaderboard } from "@/actions/challenges";
import { Trophy, Calendar, Target, Users, CheckCircle2, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

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
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleJoin = (challengeId: string) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, hasJoined: true, participantsCount: c.participantsCount + 1 }
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
        return "Desafio";
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <Link
          href="/comunidade"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-grafite mb-2"
        >
          <ArrowLeft size={13} />
          <span>Voltar ao Mural</span>
        </Link>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-profundo" />
          <span className="t-label block">Gamificação Ética (§13 e §15)</span>
        </div>
        <h1 className="t-h1 mt-1">Desafios Comunitários</h1>
        <p className="text-muted text-xs mt-1">
          Desafios focados em consistência, autonomia e hábitos esportivos saudáveis. Sem rankings tóxicos de volume.
        </p>
      </div>

      {/* Lista de Desafios */}
      <div className="flex flex-col gap-4">
        {challenges.map((challenge) => {
          const isExpanded = expandedLeaderboard === challenge.id;
          const currentBoard = leaderboardData[challenge.id];

          return (
            <div
              key={challenge.id}
              className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-osso text-profundo border border-line font-semibold">
                      {getTypeText(challenge.challengeType)}
                    </span>
                    <span className="t-data text-xs text-muted flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(challenge.startDate).toLocaleDateString("pt-BR")} até{" "}
                      {new Date(challenge.endDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="t-h2 mt-2">{challenge.title}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted px-2.5 py-1 rounded bg-osso border border-line">
                    <Users size={13} />
                    <span className="font-mono">{challenge.participantsCount} atletas</span>
                  </div>

                  {challenge.hasJoined ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-profundo/10 text-profundo border border-profundo/30 text-xs font-semibold">
                      <CheckCircle2 size={13} />
                      <span>Inscrito</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoin(challenge.id)}
                      disabled={isPending}
                      className="px-4 py-1.5 rounded-md bg-grafite text-osso hover:bg-noite text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Participar
                    </button>
                  )}
                </div>
              </div>

              {challenge.description && (
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {challenge.description}
                </p>
              )}

              {/* Barra de Progresso do Usuário (se inscrito) */}
              {challenge.hasJoined && (
                <div className="p-3 rounded-md bg-osso/40 border border-line/60 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-grafite flex items-center gap-1">
                      <Target size={13} className="text-profundo" />
                      Seu Progresso
                    </span>
                    <span className="font-mono text-profundo font-bold">
                      {challenge.userProgress} / {challenge.targetValue || "4"} {challenge.targetMetric || "sessões"}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full bg-profundo rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(challenge.userProgress) / Number(challenge.targetValue || 4)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Botão para Expandir Quadro de Consistência */}
              <div className="border-t border-line/60 pt-3 flex justify-between items-center">
                <button
                  onClick={() => toggleLeaderboard(challenge.id)}
                  className="text-xs text-profundo hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isExpanded ? "Ocultar Quadro de Participantes" : "Ver Quadro de Participantes"}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <span className="t-aux text-muted">Adesão & Consistência</span>
              </div>

              {/* Quadro de Participantes Expandido */}
              {isExpanded && (
                <div className="mt-2 border-t border-line/40 pt-3">
                  {loadingLeaderboard && !currentBoard ? (
                    <p className="text-xs text-muted font-mono animate-pulse">Carregando participantes...</p>
                  ) : currentBoard && currentBoard.participants.length > 0 ? (
                    <div className="space-y-1.5">
                      {currentBoard.participants.map((p: any, idx: number) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded bg-osso/20 text-xs border border-line/40"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center font-mono font-bold text-muted">
                              {idx + 1}º
                            </span>
                            <div className="w-6 h-6 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-[10px]">
                              {p.name?.[0] || "A"}
                            </div>
                            <Link
                              href={`/atleta/${p.username}`}
                              className="font-medium text-grafite hover:underline"
                            >
                              {p.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-profundo font-semibold">
                              {p.progressValue} / {challenge.targetValue}
                            </span>
                            {p.completed && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-lima text-grafite font-bold font-mono">
                                META CUMPRIDA
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">Nenhum participante registrado ainda. Seja o pioneiro!</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}