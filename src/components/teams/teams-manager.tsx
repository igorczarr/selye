"use client";

import { useState, useTransition } from "react";
import { createTeam, joinTeamByCode, createTeamGroup } from "@/actions/teams";
import { Users, Plus, Shield, MapPin, Key, Layers, FolderPlus } from "lucide-react";

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

export function TeamsManager({ teams }: { teams: TeamItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamLocation, setTeamLocation] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Subgroup states
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamSlug.trim()) return;

    startTransition(async () => {
      await createTeam({
        name: teamName,
        slug: teamSlug,
        description: teamDescription,
        location: teamLocation,
      });
      setIsCreateOpen(false);
      setTeamName("");
      setTeamSlug("");
      setTeamDescription("");
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    startTransition(async () => {
      try {
        await joinTeamByCode(inviteCode);
        alert("Você agora é membro da equipe!");
        setIsJoinOpen(false);
        setInviteCode("");
      } catch (err: any) {
        alert(err.message || "Erro ao entrar na equipe.");
      }
    });
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeamId || !groupName.trim()) return;

    startTransition(async () => {
      await createTeamGroup(targetTeamId, groupName, groupDescription);
      setIsGroupOpen(false);
      setGroupName("");
      setGroupDescription("");
      setTargetTeamId(null);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="t-label">Estrutura Coletiva (§8)</span>
          <h1 className="t-h1 mt-1">Equipes e Assessorias</h1>
          <p className="text-muted text-sm mt-1">
            Integre grupos de treinamento, receba programações de coaches e compartilhe sua evolução.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-line bg-surface text-xs font-semibold hover:bg-osso transition-colors cursor-pointer"
          >
            <Key size={14} />
            <span>Código de Convite</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-grafite text-osso text-xs font-semibold hover:bg-noite transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Criar Equipe</span>
          </button>
        </div>
      </div>

      {/* Grid de Equipes */}
      {teams.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-12 text-center flex flex-col items-center gap-3">
          <Users size={36} className="text-muted" strokeWidth={1.5} />
          <h3 className="t-h2">Nenhuma equipe cadastrada ainda</h3>
          <p className="text-muted text-sm max-w-sm">
            Crie sua equipe, assessoria esportiva ou academia para gerenciar atletas e programações coletivas.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-2 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-lima text-grafite font-bold text-sm cursor-pointer"
          >
            Cadastrar Primeira Equipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between hover:border-profundo/50 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="t-label !text-profundo">Privacidade: {t.privacy}</span>
                  <span className="t-data text-xs text-muted flex items-center gap-1">
                    <Users size={12} />
                    <span>{t.membersCount} atletas</span>
                  </span>
                </div>

                <h3 className="t-h2 mt-2">{t.name}</h3>
                {t.description && (
                  <p className="text-muted text-xs mt-1 leading-relaxed">{t.description}</p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-muted font-mono">
                  {t.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{t.location}</span>
                    </span>
                  )}
                  <span>Responsável: {t.ownerName}</span>
                </div>

                {/* Subgrupos da Equipe (§8.2) */}
                <div className="mt-4 pt-3 border-t border-line/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="t-aux text-muted flex items-center gap-1">
                      <Layers size={11} />
                      <span>Subgrupos & Frentes</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTeamId(t.id);
                        setIsGroupOpen(true);
                      }}
                      className="text-[11px] text-profundo hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <FolderPlus size={11} />
                      <span>Criar Subgrupo</span>
                    </button>
                  </div>

                  {t.groups && t.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {t.groups.map((g) => (
                        <span
                          key={g.id}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-osso text-grafite border border-line"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted italic">Nenhum subgrupo criado ainda.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-xs">
                <span className="text-profundo font-semibold font-mono">/@{t.slug}</span>
                <span className="px-3 py-1 rounded bg-osso text-grafite font-semibold">
                  Mural da Equipe →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Subgrupo */}
      {isGroupOpen && (
        <div className="fixed inset-0 bg-noite/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateGroup}
            className="bg-surface rounded-lg border border-line max-w-sm w-full p-6 flex flex-col gap-4 shadow-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Subdivisão Esportiva (§8.2)</span>
                <h3 className="t-h2 mt-1">Criar Subgrupo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGroupOpen(false)}
                className="text-muted hover:text-grafite font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Nome do Subgrupo</label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Corrida - Longão de Sábado, LPO Avançado..."
                className="h-10 px-3 rounded-md border border-line bg-background text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Descrição (Opcional)</label>
              <textarea
                rows={2}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Ex: Grupo focado em rodagens acima de 15km aos finais de semana..."
                className="p-3 rounded-md border border-line bg-background text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !groupName.trim()}
              className="mt-2 h-10 rounded-md bg-grafite text-osso font-semibold text-xs hover:bg-noite transition-colors shadow-xs cursor-pointer"
            >
              {isPending ? "Criando..." : "Confirmar Subgrupo"}
            </button>
          </form>
        </div>
      )}

      {/* Modal Criar Equipe */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-noite/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-surface rounded-lg border border-line max-w-md w-full p-6 flex flex-col gap-4 shadow-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Nova Organização Esportiva</span>
                <h3 className="t-h2 mt-1">Cadastrar Equipe</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-grafite font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Nome da Equipe</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Selye Performance Club"
                className="h-10 px-3 rounded-md border border-line bg-background text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Slug Identificador</label>
              <input
                type="text"
                required
                value={teamSlug}
                onChange={(e) => setTeamSlug(e.target.value)}
                placeholder="ex: selye-performance"
                className="h-10 px-3 rounded-md border border-line bg-background text-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Localização (Opcional)</label>
              <input
                type="text"
                value={teamLocation}
                onChange={(e) => setTeamLocation(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="h-10 px-3 rounded-md border border-line bg-background text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Descrição</label>
              <textarea
                rows={2}
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Descrição dos objetivos, modalidades e metodologia..."
                className="p-3 rounded-md border border-line bg-background text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-10 px-4 rounded border border-line text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-10 px-5 rounded bg-grafite text-osso font-semibold text-sm hover:bg-noite cursor-pointer"
              >
                {isPending ? "Cadastrando..." : "Cadastrar Equipe"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Ingressar por Código */}
      {isJoinOpen && (
        <div className="fixed inset-0 bg-noite/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleJoin}
            className="bg-surface rounded-lg border border-line max-w-sm w-full p-6 flex flex-col gap-4 shadow-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Filiação Rápida</span>
                <h3 className="t-h2 mt-1">Entrar em Equipe</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinOpen(false)}
                className="text-muted hover:text-grafite font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Código de Convite</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ex: SELYE-XXXXXX"
                className="h-11 px-3 text-center uppercase tracking-widest rounded-md border border-line bg-background text-base font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsJoinOpen(false)}
                className="h-10 px-4 rounded border border-line text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-10 px-5 rounded bg-grafite text-osso font-semibold text-sm hover:bg-noite cursor-pointer"
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
