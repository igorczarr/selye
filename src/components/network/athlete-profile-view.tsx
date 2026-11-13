"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { followUser, unfollowUser, blockUser, reportContent } from "@/actions/network";
import {
  Flame,
  UserPlus,
  UserCheck,
  MapPin,
  Calendar,
  Shield,
  ArrowLeft,
  MoreHorizontal,
  Flag,
  UserX,
  X,
  CheckCircle2,
} from "lucide-react";

interface AthleteProfileViewProps {
  data: any;
}

export function AthleteProfileView({ data }: AthleteProfileViewProps) {
  const [isFollowing, setIsFollowing] = useState(data.isFollowing);
  const [followersCount, setFollowersCount] = useState(data.stats.followers);
  const [isPending, startTransition] = useTransition();

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam ou publicidade indevida");
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

  const handleBlock = () => {
    if (confirm(`Deseja realmente bloquear @${data.user.username}?`)) {
      startTransition(async () => {
        await blockUser(data.user.id);
        alert(`@${data.user.username} foi bloqueado.`);
        window.location.href = "/comunidade";
      });
    }
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
      }, 1800);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Top Back link */}
      <div>
        <Link
          href="/comunidade/atletas"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-grafite"
        >
          <ArrowLeft size={13} />
          <span>Voltar para Descoberta de Atletas</span>
        </Link>
      </div>

      {/* Cartão de Perfil do Atleta */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-grafite text-osso flex items-center justify-center font-bold text-2xl shadow-xs">
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
                  onClick={handleToggleFollow}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isFollowing
                      ? "border border-line bg-osso/60 text-grafite hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      : "bg-grafite text-osso hover:bg-noite shadow-xs"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={14} className="text-profundo" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Seguir</span>
                    </>
                  )}
                </button>

                {/* Opções */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded-md border border-line text-muted hover:text-grafite hover:bg-osso transition-colors cursor-pointer"
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded-md border border-line bg-surface shadow-md py-1 z-20 text-xs">
                      <button
                        onClick={() => {
                          setReportModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-osso text-amber-700 cursor-pointer"
                      >
                        <Flag size={13} />
                        <span>Denunciar perfil</span>
                      </button>
                      <button
                        onClick={handleBlock}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-osso text-red-600 cursor-pointer border-t border-line/50"
                      >
                        <UserX size={13} />
                        <span>Bloquear atleta</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/perfil"
                className="px-4 py-2 rounded-md border border-line bg-osso text-xs font-semibold text-grafite hover:bg-osso/80"
              >
                Editar Meu Perfil
              </Link>
            )}
          </div>
        </div>

        {/* Bio */}
        {data.user.bio && (
          <p className="text-xs text-foreground/85 leading-relaxed bg-osso/20 p-3 rounded-md border border-line/40">
            {data.user.bio}
          </p>
        )}

        {/* Estatísticas do Atleta (§11 e §13) */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-3 rounded-md bg-surface border border-line text-center">
            <span className="t-label !text-[9px]">Streak Semanal</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Flame size={14} className="text-amber-600" />
              <span className="t-data text-base font-bold text-grafite">
                {data.streak.weekly} sem
              </span>
            </div>
          </div>
          <div className="p-3 rounded-md bg-surface border border-line text-center">
            <span className="t-label !text-[9px]">Seguidores</span>
            <p className="t-data text-base font-bold text-grafite mt-1">{followersCount}</p>
          </div>
          <div className="p-3 rounded-md bg-surface border border-line text-center">
            <span className="t-label !text-[9px]">Seguindo</span>
            <p className="t-data text-base font-bold text-grafite mt-1">{data.stats.following}</p>
          </div>
        </div>
      </div>

      {/* Modalidades Praticadas */}
      <div className="rounded-lg border border-line bg-surface p-5 flex flex-col gap-3 shadow-xs">
        <span className="t-label">Modalidades Esportivas</span>
        <div className="flex flex-wrap gap-2">
          {data.sports.map((s: any) => (
            <div
              key={s.id}
              className="px-3 py-1.5 rounded-md bg-osso border border-line flex items-center gap-2 text-xs"
            >
              <span className="font-semibold text-grafite">{s.namePt}</span>
              <span className="text-[10px] text-muted font-mono capitalize">
                ({s.experienceLevel})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conquistas & Distintivos (§13 e §15) */}
      <div className="rounded-lg border border-line bg-surface p-5 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="t-label">Marcos de Evolução & Conquistas</span>
          <span className="t-data text-xs text-muted font-mono">
            {data.achievements.length} conquistadas
          </span>
        </div>

        {data.achievements.length === 0 ? (
          <p className="text-xs text-muted italic">Nenhuma conquista desbloqueada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.achievements.map((ach: any) => (
              <div
                key={ach.id}
                className="p-3 rounded-md border border-line/60 bg-osso/20 flex items-center gap-3"
              >
                <span className="text-2xl p-1.5 rounded bg-surface border border-line">
                  {ach.icon}
                </span>
                <div>
                  <h4 className="font-semibold text-xs text-grafite">{ach.title}</h4>
                  <p className="text-[11px] text-muted line-clamp-1">{ach.description}</p>
                  <span className="text-[9px] text-profundo font-mono block mt-0.5">
                    {new Date(ach.unlockedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Denúncia */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface border border-line rounded-lg max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Flag size={18} />
                <h3 className="font-semibold text-sm">Denunciar Perfil</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-muted hover:text-grafite"
              >
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={36} className="text-profundo" />
                <h4 className="font-semibold text-sm">Denúncia Enviada</h4>
                <p className="text-xs text-muted">A moderação do SELYE revisará este perfil.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted">
                  Informe o motivo da denúncia para o atleta <strong>@{data.user.username}</strong>:
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
                      className="flex items-center gap-2 text-xs p-2 rounded border border-line/60 bg-osso/20 cursor-pointer"
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
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-1.5 rounded text-xs text-muted hover:text-grafite"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={isPending}
                    className="px-4 py-2 rounded bg-amber-700 text-white font-semibold text-xs hover:bg-amber-800 cursor-pointer"
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