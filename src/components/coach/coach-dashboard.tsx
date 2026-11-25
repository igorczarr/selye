"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { publishProgramVersion } from "@/actions/coach";
import { HealthyHabitsManager } from "@/components/profile/healthy-habits-manager";
import {
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  PlusCircle,
  X,
  Lock,
} from "lucide-react";

interface CoachDashboardProps {
  data: any;
}

export function CoachDashboard({ data }: CoachDashboardProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null
  );
  const [changeLog, setChangeLog] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePublishNewVersion = (programId: string) => {
    if (!changeLog.trim()) {
      setFormError(
        "Descreva o resumo técnico das alterações para registrar a nova versão."
      );
      return;
    }

    setFormError(null);
    startTransition(async () => {
      await publishProgramVersion(
        programId,
        { updatedBy: data.coachUser.name, timestamp: new Date() },
        changeLog.trim()
      );
      setSelectedProgramId(null);
      setChangeLog("");
      setStatusBanner(
        "Nova versão publicada com sucesso. O histórico das sessões anteriores permanece preservado."
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho do Treinador */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lima" />
            <span className="t-label !text-accent-text">
              Prescrição & Supervisão
            </span>
          </div>
          <h1 className="t-h1 mt-1">Painel do Treinador</h1>
          <p className="text-muted text-sm mt-1">
            Acompanhamento de atletas, periodização com controle de versão e monitoramento de adesão.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="chip t-data">Resp.: {data.coachUser.name}</span>
          <Link href="/treinos/novo" className="btn btn-primary h-10 px-4 text-xs">
            <PlusCircle size={15} />
            <span>Nova Prescrição</span>
          </Link>
        </div>
      </div>

      {statusBanner && (
        <div
          role="status"
          className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 flex items-center justify-between gap-3 text-xs text-foreground"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent-text shrink-0" />
            <span className="font-medium">{statusBanner}</span>
          </div>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setStatusBanner(null)}
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Indicadores Operacionais do Coach */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Atletas Ativos</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-2">
            <Users size={18} className="text-accent-text" />
            <span>{data.metrics.activeAthletesCount || 1}</span>
          </p>
          <span className="t-aux text-muted mt-2">Vínculos vigentes</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Programas Ativos</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-2">
            <FileText size={18} className="text-accent-text" />
            <span>{data.metrics.publishedProgramsCount}</span>
          </p>
          <span className="t-aux text-muted mt-2">Com controle de versão</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Adesão Média</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-2">
            <CheckCircle2 size={18} className="text-accent-text" />
            <span>92%</span>
          </p>
          <span className="t-aux text-accent-text mt-2 font-medium">
            Cumprimento semanal
          </span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Alertas de Carga</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-2">
            <AlertTriangle size={18} className="text-muted" />
            <span>0</span>
          </p>
          <span className="t-aux text-muted mt-2">Nenhum desvio crítico</span>
        </div>
      </section>

      {/* Atletas sob Supervisão */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label">Acompanhamento Individual</span>
            <h2 className="t-h2 mt-1">Atletas Vinculados</h2>
          </div>
          <span className="t-data text-xs text-muted">
            {data.assignments.length || 1}{" "}
            {(data.assignments.length || 1) === 1 ? "atleta" : "atletas"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-line text-muted uppercase">
                <th className="pb-3 font-semibold">Atleta</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Início do Ciclo</th>
                <th className="pb-3 font-semibold">Biometria</th>
                <th className="pb-3 font-semibold text-right">Prescrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-3.5 font-sans">
                  <span className="font-semibold text-foreground block">
                    {data.coachUser.name}
                  </span>
                  <span className="text-xs text-muted font-mono">
                    {data.coachUser.email}
                  </span>
                </td>
                <td className="py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-lima text-grafite font-semibold text-xs">
                    ATIVO
                  </span>
                </td>
                <td className="py-3.5 text-muted">Ciclo Vigente</td>
                <td className="py-3.5">
                  <span className="chip">
                    <Lock size={11} />
                    <span>Protegido pelo Titular</span>
                  </span>
                </td>
                <td className="py-3.5 text-right font-sans">
                  <Link
                    href="/treinos/novo"
                    className="btn btn-dark h-8 px-3 text-xs"
                  >
                    Prescrever
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Prescrição de Hábitos Saudáveis Diários para o Aluno */}
      {data.primaryAthleteHabits && (
        <HealthyHabitsManager
          snapshot={data.primaryAthleteHabits}
          targetUserId={data.primaryAthleteId}
          createdByRole="coach"
          compactTitle="Prescrição de Hábitos Saudáveis Diários"
        />
      )}

      {/* Gestão de Programações e Versionamento */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <span className="t-label">Histórico Imutável</span>
          <h2 className="t-h2 mt-1">Programações & Versionamento</h2>
          <p className="text-muted text-xs mt-1">
            Toda atualização de carga, volume ou seleção de movimentos gera uma nova versão numerada, preservando o registro histórico das sessões passadas.
          </p>
        </div>

        {data.programs.length === 0 ? (
          <div className="p-8 border border-dashed border-line rounded-xl text-center text-muted text-xs">
            Nenhuma programação publicada ainda. Crie uma rotina para habilitar o versionamento.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.programs.map((p: any) => (
              <div
                key={p.id}
                className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {p.title}
                  </h3>
                  <p className="text-muted text-xs mt-0.5">
                    {p.description || "Prescrição técnica ativa"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setSelectedProgramId(p.id);
                  }}
                  className="btn btn-ghost h-9 px-3.5 text-xs font-mono shrink-0"
                >
                  <History size={14} />
                  <span>Publicar Nova Versão</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Publicação de Versão */}
      {selectedProgramId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-noite/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div className="card max-w-md w-full p-6 flex flex-col gap-4 shadow-xl fade-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="t-label">Evolução de Ciclo</span>
                <h3 className="t-h2 mt-1">Nova Versão da Programação</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => setSelectedProgramId(null)}
                className="btn btn-ghost h-8 w-8 p-0"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-muted text-xs leading-relaxed">
              A nova versão entrará em vigor nas próximas sessões sem sobrescrever os treinos já concluídos.
            </p>

            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-profundo bg-lima/20 px-3 py-2 text-xs text-foreground"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="changelog-input"
                className="t-aux text-foreground font-semibold"
              >
                Resumo das Alterações (Changelog)
              </label>
              <textarea
                id="changelog-input"
                rows={3}
                required
                value={changeLog}
                onChange={(e) => {
                  setChangeLog(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Ex: Progressão de +5 kg no agachamento livre; redução do intervalo acessório para 75s."
                className="input h-auto py-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSelectedProgramId(null)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handlePublishNewVersion(selectedProgramId)}
                disabled={isPending}
                className="btn btn-primary h-10 px-5 text-xs"
              >
                {isPending ? "Publicando..." : "Confirmar e Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
