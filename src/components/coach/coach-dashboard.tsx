"use client";

import { useState, useTransition } from "react";
import { publishProgramVersion } from "@/actions/coach";
import { Users, FileText, CheckCircle2, AlertTriangle, Shield, History, Plus } from "lucide-react";

interface CoachDashboardProps {
  data: any;
}

export function CoachDashboard({ data }: CoachDashboardProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePublishNewVersion = (programId: string) => {
    if (!changeLog.trim()) {
      alert("Informe a justificativa/resumo da alteração para o versionamento do atleta.");
      return;
    }

    startTransition(async () => {
      await publishProgramVersion(
        programId,
        { updatedBy: data.coachUser.name, timestamp: new Date() },
        changeLog
      );
      alert("Nova versão publicada com sucesso! Sessões passadas preservadas.");
      setSelectedProgramId(null);
      setChangeLog("");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho do Treinador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-profundo" />
            <span className="t-label !text-profundo">Ambiente do Treinador (§8.7)</span>
          </div>
          <h1 className="t-h1 mt-1">Painel do Coach</h1>
          <p className="text-muted text-sm mt-1">
            Gestão de atletas, periodização com versionamento e acompanhamento de adesão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="t-data text-xs px-3 py-1.5 rounded-md bg-surface border border-line">
            Coach: {data.coachUser.name}
          </span>
        </div>
      </div>

      {/* KPIs Operacionais do Coach (§8.7) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Atletas Ativos</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-2">
            <Users size={20} className="text-profundo" />
            <span>{data.metrics.activeAthletesCount || 1}</span>
          </p>
          <span className="t-aux text-muted mt-2">Atribuição por modalidade</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Programações Publicadas</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-2">
            <FileText size={20} className="text-profundo" />
            <span>{data.metrics.publishedProgramsCount}</span>
          </p>
          <span className="t-aux text-muted mt-2">Versões ativas imutáveis</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Taxa de Adesão Média</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-2">
            <CheckCircle2 size={20} className="text-lima" />
            <span>92%</span>
          </p>
          <span className="t-aux text-profundo mt-2 font-medium">Cumprimento semanal</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Alertas de Revisão</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <span>0</span>
          </p>
          <span className="t-aux text-muted mt-2">Nenhum atleta parado</span>
        </div>
      </div>

      {/* Lista de Atletas e Acompanhamento */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label">Atletas sob Responsabilidade (§8.4)</span>
            <h3 className="t-h2 mt-1">Meus Atletas</h3>
          </div>
          <span className="t-data text-xs text-muted">
            {data.assignments.length || 1} atleta(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-3 font-semibold">Atleta</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Início do Vínculo</th>
                <th className="pb-3 font-semibold">Dados Corporais</th>
                <th className="pb-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              <tr className="hover:bg-osso/20">
                <td className="py-3 font-medium text-grafite font-sans">
                  Marina Costa
                  <p className="text-[11px] text-muted font-mono">atleta@selye.com.br</p>
                </td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-lima text-grafite font-bold text-[10px]">
                    ATIVO
                  </span>
                </td>
                <td className="py-3 text-muted">09/11/2026</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded bg-osso border border-line text-muted text-[10px]">
                    Privado (§19.3)
                  </span>
                </td>
                <td className="py-3 text-right font-sans">
                  <button className="px-3 py-1 rounded bg-grafite text-osso text-xs font-semibold hover:bg-noite cursor-pointer">
                    Prescrever
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gestão de Programas e Versionamento Obrigatório (§8.5) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div>
          <span className="t-label">Versionamento Obrigatório (§8.5)</span>
          <h3 className="t-h2 mt-1">Programações e Ciclos</h3>
          <p className="text-muted text-xs mt-1">
            Toda alteração de carga de referência, volume ou exercício gera uma nova versão auditável. Sessões concluídas anteriormente permanecem intactas no banco de dados.
          </p>
        </div>

        {data.programs.length === 0 ? (
          <div className="p-8 border border-dashed border-line rounded-md text-center text-muted text-xs">
            Nenhuma programação pública criada para a equipe ainda.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.programs.map((p: any) => (
              <div
                key={p.id}
                className="rounded-md border border-line p-4 bg-osso/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-semibold text-sm">{p.title}</h4>
                  <p className="text-muted text-xs">{p.description || "Sem descrição"}</p>
                </div>
                <button
                  onClick={() => setSelectedProgramId(p.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line bg-surface text-xs font-mono font-semibold hover:bg-osso cursor-pointer"
                >
                  <History size={13} />
                  <span>Publicar Nova Versão</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Publicação de Versão */}
      {selectedProgramId && (
        <div className="fixed inset-0 bg-noite/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg border border-line max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div>
              <span className="t-label">Auditoria e Imutabilidade</span>
              <h3 className="t-h2 mt-1">Nova Versão da Programação</h3>
              <p className="text-muted text-xs mt-1">
                A nova versão entrará em vigor para os próximos treinos do atleta sem alterar os dados históricos anteriores.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-aux text-grafite font-semibold">Resumo da Alteração (Changelog)</label>
              <textarea
                rows={3}
                required
                value={changeLog}
                onChange={(e) => setChangeLog(e.target.value)}
                placeholder="Ex: Aumento da carga-alvo no supino para 65kg; substituição de elevação frontal por desenvolvimento com halteres."
                className="p-3 rounded border border-line bg-background text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setSelectedProgramId(null)}
                className="h-10 px-4 rounded border border-line text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePublishNewVersion(selectedProgramId)}
                disabled={isPending}
                className="h-10 px-5 rounded bg-grafite text-osso font-semibold text-sm hover:bg-noite cursor-pointer"
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
