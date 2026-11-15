"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createTeam, joinTeamByCode, createTeamGroup } from "@/actions/teams";
import {
  Users,
  Plus,
  MapPin,
  Key,
  Layers,
  FolderPlus,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  privacy: string;
  location: string | null;
  ownerName: string;
  membersCount: number;
  groups?: { id: string; name: string; description: string | null }[];
}

const PRIVACY_LABELS: Record<string, string> = {
  public: "Pública",
  private: "Restrita",
  invite_only: "Somente convite",
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function TeamsManager({ teams }: { teams: TeamItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

  // Estados de formulário
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLocation, setTeamLocation] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Feedback sem alert() nativo
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estados de subgrupo
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamSlug.trim()) return;

    startTransition(async () => {
      await createTeam({
        name: teamName.trim(),
        slug: teamSlug.trim(),
        description: teamDescription.trim(),
        location: teamLocation.trim(),
      });
      setIsCreateOpen(false);
      setTeamName("");
      setTeamSlug("");
      setTeamDescription("");
      setTeamLocation("");
      setFeedbackBanner({
        type: "success",
        text: "Equipe criada e registrada com sucesso.",
      });
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    startTransition(async () => {
      try {
        await joinTeamByCode(inviteCode.trim());
        setIsJoinOpen(false);
        setInviteCode("");
        setFeedbackBanner({
          type: "success",
          text: "Filiação confirmada! Você agora faz parte da equipe.",
        });
      } catch (err: any) {
        setFeedbackBanner({
          type: "error",
          text: err?.message || "Código de convite inválido ou expirado.",
        });
      }
    });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeamId || !groupName.trim()) return;

    startTransition(async () => {
      await createTeamGroup(
        targetTeamId,
        groupName.trim(),
        groupDescription.trim()
      );
      setIsGroupOpen(false);
      setGroupName("");
      setGroupDescription("");
      setTargetTeamId(null);
      setFeedbackBanner({
        type: "success",
        text: "Subgrupo adicionado à estrutura da equipe.",
      });
    });
  };

  return (
    <div className="flex flex-col gap-6 fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Organização Coletiva</span>
          <h1 className="t-h1 mt-1">Equipes e Assessorias</h1>
          <p className="text-muted text-sm mt-1">
            Integre grupos de treinamento, acompanhe subgrupos por modalidade e compartilhe sua evolução.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setFeedbackBanner(null);
              setIsJoinOpen(true);
            }}
            className="btn btn-ghost h-10 px-4 text-xs"
          >
            <Key size={14} />
            <span>Código de Convite</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedbackBanner(null);
              setIsCreateOpen(true);
            }}
            className="btn btn-primary h-10 px-4 text-xs"
          >
            <Plus size={15} />
            <span>Criar Equipe</span>
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
            feedbackBanner.type === "success"
              ? "border-profundo bg-lima/20 text-foreground"
              : "border-mineral bg-foreground/5 text-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === "success" ? (
              <CheckCircle2 size={16} className="text-accent-text shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-accent-text shrink-0" />
            )}
            <span className="font-medium">{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setFeedbackBanner(null)}
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Grade de Equipes */}
      {teams.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-muted">
            <Users size={24} strokeWidth={1.75} />
          </div>
          <h2 className="t-h2 mt-1">Nenhuma equipe cadastrada ainda</h2>
          <p className="text-muted text-sm max-w-sm">
            Crie sua equipe, assessoria esportiva ou clube de treinamento para reunir atletas e subgrupos.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary mt-2"
          >
            <Plus size={16} />
            <span>Cadastrar Primeira Equipe</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <article
              key={t.id}
              className="card card-interactive p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="chip">
                    {PRIVACY_LABELS[t.privacy] || t.privacy}
                  </span>
                  <span className="t-data text-xs text-muted flex items-center gap-1.5">
                    <Users size={13} />
                    <span>{t.membersCount} atletas</span>
                  </span>
                </div>

                <h2 className="t-h2 mt-3">{t.name}</h2>
                {t.description && (
                  <p className="text-muted text-xs mt-1 leading-relaxed">
                    {t.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted font-mono">
                  {t.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{t.location}</span>
                    </span>
                  )}
                  <span>Coordenação: {t.ownerName}</span>
                </div>

                {/* Subgrupos */}
                <div className="mt-4 pt-3 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <span className="t-aux text-muted flex items-center gap-1.5">
                      <Layers size={12} />
                      <span>Subgrupos & Pelotões</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTeamId(t.id);
                        setIsGroupOpen(true);
                      }}
                      className="text-xs text-accent-text hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <FolderPlus size={12} />
                      <span>Novo Subgrupo</span>
                    </button>
                  </div>

                  {t.groups && t.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {t.groups.map((g) => (
                        <span key={g.id} className="chip">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      Nenhum subgrupo configurado.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-xs">
                <span className="t-data text-accent-text">/@{t.slug}</span>
                <Link
                  href="/comunidade?tab=teams"
                  className="btn btn-ghost h-8 px-3 text-xs"
                >
                  Mural da Equipe →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Criar Subgrupo */}
      {isGroupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-noite/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <form
            onSubmit={handleCreateGroup}
            className="card max-w-md w-full p-6 flex flex-col gap-4 shadow-xl fade-up"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Frente Esportiva</span>
                <h3 className="t-h2 mt-1">Criar Subgrupo</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setIsGroupOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="subgroup-name" className="t-aux text-foreground font-semibold">
                Nome do Subgrupo
              </label>
              <input
                id="subgroup-name"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Pelotão 10K, Força & LPO..."
                className="input h-10 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="subgroup-desc" className="t-aux text-foreground font-semibold">
                Descrição (Opcional)
              </label>
              <textarea
                id="subgroup-desc"
                rows={2}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Objetivos e dias de encontro deste subgrupo..."
                className="input h-auto py-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsGroupOpen(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !groupName.trim()}
                className="btn btn-primary h-10 px-4 text-xs"
              >
                {isPending ? "Criando..." : "Confirmar Subgrupo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Criar Equipe */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-noite/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <form
            onSubmit={handleCreate}
            className="card max-w-md w-full p-6 flex flex-col gap-4 shadow-xl fade-up"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Nova Organização</span>
                <h3 className="t-h2 mt-1">Cadastrar Equipe</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="team-name" className="t-aux text-foreground font-semibold">
                Nome da Equipe
              </label>
              <input
                id="team-name"
                type="text"
                required
                value={teamName}
                onChange={(e) => {
                  const val = e.target.value;
                  setTeamName(val);
                  setTeamSlug(toSlug(val));
                }}
                placeholder="Ex: Selye Performance Club"
                className="input h-10 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="team-slug" className="t-aux text-foreground font-semibold">
                Identificador (@slug)
              </label>
              <input
                id="team-slug"
                type="text"
                required
                value={teamSlug}
                onChange={(e) => setTeamSlug(toSlug(e.target.value))}
                placeholder="ex: selye-performance"
                className="input h-10 text-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="team-location" className="t-aux text-foreground font-semibold">
                Cidade / Estado (Opcional)
              </label>
              <input
                id="team-location"
                type="text"
                value={teamLocation}
                onChange={(e) => setTeamLocation(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="input h-10 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="team-desc" className="t-aux text-foreground font-semibold">
                Descrição
              </label>
              <textarea
                id="team-desc"
                rows={2}
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Metodologia, modalidades e proposta da equipe..."
                className="input h-auto py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary h-10 px-5 text-xs"
              >
                {isPending ? "Cadastrando..." : "Cadastrar Equipe"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Ingressar por Código */}
      {isJoinOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-noite/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <form
            onSubmit={handleJoin}
            className="card max-w-sm w-full p-6 flex flex-col gap-4 shadow-xl fade-up"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Filiação Rápida</span>
                <h3 className="t-h2 mt-1">Entrar com Código</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setIsJoinOpen(false)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-code" className="t-aux text-foreground font-semibold">
                Código de Convite Fornecido pelo Treinador
              </label>
              <input
                id="invite-code"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="SELYE-XXXXXX"
                className="input h-11 text-center uppercase tracking-widest text-base font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsJoinOpen(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary h-10 px-5 text-xs"
              >
                {isPending ? "Validando..." : "Ingressar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
