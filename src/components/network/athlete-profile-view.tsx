"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  followUser,
  unfollowUser,
  blockUser,
  reportContent,
} from "@/actions/network";
import {
  Flame,
  UserPlus,
  UserCheck,
  MapPin,
  ArrowLeft,
  MoreHorizontal,
  Flag,
  UserX,
  X,
  CheckCircle2,
  Award,
} from "lucide-react";

interface AthleteProfileViewProps {
  data: any;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export function AthleteProfileView({ data }: AthleteProfileViewProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(data.isFollowing);
  const [followersCount, setFollowersCount] = useState(data.stats.followers);
  const [isPending, startTransition] = useTransition();

  const [menuOpen, setMenuOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState(
    "Spam ou publicidade indevida"
  );
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleToggleFollow = () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev: number) => (nextState ? prev + 1 : prev - 1));

    startTransition(async () => {
      if (nextState) {
        await followUser(data.user.id);
      } else {
        await unfollowUser(data.user.id);
      }
    });
  };

  const confirmBlock = () => {
    startTransition(async () => {
      await blockUser(data.user.id);
      setBlockModalOpen(false);
      router.push("/comunidade");
    });
  };

  const handleReport = () => {
    startTransition(async () => {
      await reportContent({
        targetType: "user",
        targetId: data.user.id,
        reason: reportReason,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModalOpen(false);
      }, 1600);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full fade-up">
      <div>
        <Link
          href="/comunidade/atletas"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Descoberta de Atletas</span>
        </Link>
      </div>

      {/* Cabeçalho do Perfil Público */}
      <section className="card p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-2xl shrink-0">
              {data.user.name?.[0] || "A"}
            </div>
            <div>
              <h1 className="t-h1">{data.user.name}</h1>
              <p className="t-data text-xs text-muted">@{data.user.username}</p>
              {data.user.location && (
                <div className="flex items-center gap-1 text-xs text-muted mt-1">
                  <MapPin size={12} />
                  <span>{data.user.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!data.isSelf ? (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isPending}
                  className={`btn h-10 px-4 text-xs ${
                    isFollowing ? "btn-ghost" : "btn-primary"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={14} className="text-accent-text" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Seguir</span>
                    </>
                  )}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    aria-label="Opções do perfil"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="btn btn-ghost h-10 w-10 p-0"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-48 rounded-xl border border-line bg-surface shadow-lg py-1.5 z-20 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setReportModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-foreground/5 text-foreground cursor-pointer"
                      >
                        <Flag size={14} className="text-accent-text" />
                        <span>Denunciar perfil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBlockModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-center gap-2 hover:bg-foreground/5 text-muted hover:text-foreground cursor-pointer border-t border-line"
                      >
                        <UserX size={14} />
                        <span>Bloquear atleta</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/perfil" className="btn btn-ghost h-10 px-4 text-xs">
                Editar Meu Perfil
              </Link>
            )}
          </div>
        </div>

        {data.user.bio && (
          <p className="text-sm text-muted leading-relaxed bg-foreground/[0.02] p-3.5 rounded-xl border border-line">
            {data.user.bio}
          </p>
        )}

        {/* Indicadores do Atleta */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-foreground/[0.02] border border-line text-center">
            <span className="t-label block">Streak Semanal</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Flame size={15} className="text-accent-text" />
              <span className="t-data text-lg font-semibold text-foreground">
                {data.streak.weekly} sem
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-foreground/[0.02] border border-line text-center">
            <span className="t-label block">Seguidores</span>
            <p className="t-data text-lg font-semibold text-foreground mt-1">
              {followersCount}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-foreground/[0.02] border border-line text-center">
            <span className="t-label block">Seguindo</span>
            <p className="t-data text-lg font-semibold text-foreground mt-1">
              {data.stats.following}
            </p>
          </div>
        </div>
      </section>

      {/* Modalidades Praticadas */}
      <section className="card p-6 flex flex-col gap-3">
        <span className="t-label">Modalidades Praticadas</span>
        <div className="flex flex-wrap gap-2">
          {data.sports.map((s: any) => (
            <div
              key={s.id}
              className="px-3.5 py-2 rounded-xl bg-foreground/[0.03] border border-line flex items-center gap-2 text-xs"
            >
              <span className="font-semibold text-foreground">{s.namePt}</span>
              <span className="text-muted font-mono">
                · {EXPERIENCE_LABELS[s.experienceLevel] || s.experienceLevel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Conquistas e Marcos */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Constância Auditada</span>
            <h2 className="t-h2 mt-0.5">Marcos & Conquistas</h2>
          </div>
          <span className="t-data text-xs text-muted">
            {data.achievements.length}{" "}
            {data.achievements.length === 1 ? "conquista" : "conquistas"}
          </span>
        </div>

        {data.achievements.length === 0 ? (
          <p className="text-xs text-muted">
            Nenhuma conquista desbloqueada até o momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.achievements.map((ach: any) => (
              <div
                key={ach.id}
                className="p-3.5 rounded-xl border border-line bg-foreground/[0.02] flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-lima/25 text-foreground flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-foreground">
                    {ach.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-1">
                    {ach.description}
                  </p>
                  <span className="t-data text-xs text-accent-text block mt-1">
                    {new Date(ach.unlockedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Confirmação de Bloqueio */}
      {blockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-noite/70 backdrop-blur-xs p-4"
        >
          <div className="card max-w-md w-full p-6 flex flex-col gap-4 shadow-xl fade-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <UserX size={18} className="text-accent-text" />
                <h3 className="t-h3">Bloquear @{data.user.username}?</h3>
              </div>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Você deixará de seguir este atleta e as publicações dele não serão exibidas no seu mural.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmBlock}
                className="btn btn-dark h-10 px-4 text-xs"
              >
                {isPending ? "Bloqueando..." : "Confirmar Bloqueio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Denúncia */}
      {reportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-noite/70 backdrop-blur-xs p-4"
        >
          <div className="card max-w-md w-full p-6 shadow-xl flex flex-col gap-4 fade-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <Flag size={18} className="text-accent-text" />
                <h3 className="t-h3">Denunciar Perfil</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={36} className="text-accent-text" />
                <h4 className="font-semibold text-sm text-foreground">
                  Denúncia Enviada
                </h4>
                <p className="text-xs text-muted">
                  A equipe de moderação do Selye revisará este perfil.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Informe o motivo da denúncia para{" "}
                  <strong className="text-foreground">
                    @{data.user.username}
                  </strong>
                  :
                </p>

                <div className="flex flex-col gap-2">
                  {[
                    "Spam ou publicidade indevida",
                    "Conteúdo tóxico ou assédio",
                    "Falsidade ideológica ou conduta antidesportiva",
                    "Outro motivo",
                  ].map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2.5 text-xs p-3 rounded-lg border border-line bg-foreground/[0.02] cursor-pointer hover:bg-foreground/[0.05]"
                    >
                      <input
                        type="radio"
                        name="repReason"
                        checked={reportReason === r}
                        onChange={() => setReportReason(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="btn btn-ghost h-10 px-4 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={isPending}
                    className="btn btn-primary h-10 px-4 text-xs"
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
