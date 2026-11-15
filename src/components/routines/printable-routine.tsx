"use client";

import Link from "next/link";
import { SelyeLogo } from "@/components/brand/logo";
import { Printer, ArrowLeft } from "lucide-react";

interface PrintableRoutineProps {
  data: {
    program: any;
    creator: any;
    version: any;
    templates: any[];
  };
}

const MODALITY_LABELS: Record<string, string> = {
  strength: "Musculação",
  calisthenics: "Calistenia",
  functional: "Funcional",
  running: "Corrida",
};

export function PrintableRoutine({ data }: PrintableRoutineProps) {
  const { program, creator, version, templates } = data;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 print:bg-white print:p-0">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Link
          href="/treinos"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Rotinas</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="t-aux text-muted">Formato A4 · Pronto para impressão</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary h-10 px-4 text-xs"
          >
            <Printer size={15} />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* Folha A4 (sempre clara para papel e exportação PDF) */}
      <div className="max-w-4xl mx-auto bg-white border border-line rounded-xl p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-grafite">
        {/* Cabeçalho do Documento */}
        <div className="flex items-start justify-between border-b-2 border-grafite pb-5">
          <div>
            <SelyeLogo height={32} className="text-grafite" />
            <p className="t-label mt-1.5 !text-profundo">
              Ficha Técnica de Prescrição e Registro de Treinamento
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="font-bold text-grafite block">
              VERSÃO {version.versionNumber}.0
            </span>
            <span className="text-muted block">
              Emissão: {new Date().toLocaleDateString("pt-BR")}
            </span>
            <span className="text-profundo font-semibold block">
              REF: {program.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Metadados da Ficha e do Atleta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-line text-xs font-mono">
          <div>
            <span className="t-label block">Programa</span>
            <span className="font-bold text-grafite text-sm mt-0.5 block">
              {program.title}
            </span>
          </div>
          <div>
            <span className="t-label block">Atleta</span>
            <span className="font-semibold text-grafite mt-0.5 block">
              {creator?.name || "Atleta Selye"}
            </span>
          </div>
          <div>
            <span className="t-label block">Modalidade</span>
            <span className="font-semibold text-grafite mt-0.5 block">
              {MODALITY_LABELS[program.modalityCode] || program.modalityCode}
            </span>
          </div>
          <div>
            <span className="t-label block">Ciclo</span>
            <span className="font-semibold text-grafite mt-0.5 block">
              Prescrição Ativa
            </span>
          </div>
        </div>

        {/* Sessões e Tabelas */}
        <div className="flex flex-col gap-8 py-6">
          {templates.map((template, tIdx) => (
            <div key={template.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-osso px-3.5 py-2 rounded-md border border-line">
                <h2 className="font-bold text-sm text-grafite font-mono">
                  Sessão {String.fromCharCode(65 + tIdx)} · {template.title}
                </h2>
                {template.notes && (
                  <span className="text-xs text-muted italic">{template.notes}</span>
                )}
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-grafite/80 font-mono uppercase text-muted">
                    <th className="py-2 px-1 w-8 text-center">OK</th>
                    <th className="py-2 px-2">Movimento</th>
                    <th className="py-2 px-2 text-center w-16">Séries</th>
                    <th className="py-2 px-2 text-center w-20">Reps</th>
                    <th className="py-2 px-2 text-center w-24">Carga Alvo</th>
                    <th className="py-2 px-2 text-center w-20">Pausa</th>
                    <th className="py-2 px-3 text-left w-36">Carga Real / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {template.prescriptions.map((p: any, pIdx: number) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-1 text-center">
                        <span className="w-4 h-4 rounded border border-grafite/60 inline-block align-middle" />
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="font-bold text-grafite block">
                          {String(pIdx + 1).padStart(2, "0")}. {p.exerciseNamePt}
                        </span>
                        {p.notes && (
                          <span className="text-muted block italic">{p.notes}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center t-data font-bold">
                        {p.targetSets}
                      </td>
                      <td className="py-2.5 px-2 text-center t-data">
                        {p.targetReps}
                      </td>
                      <td className="py-2.5 px-2 text-center t-data font-bold text-profundo">
                        {p.targetLoadKg ? `${p.targetLoadKg} kg` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-center t-data text-muted">
                        {p.restSeconds}s
                      </td>
                      <td className="py-2.5 px-3 border-l border-line/40">
                        <div className="w-full h-4 border-b border-dashed border-line" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Rodapé institucional da folha impressa */}
        <div className="mt-8 pt-6 border-t border-grafite/20 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs font-mono text-muted">
          <div>
            <p className="font-semibold text-grafite">
              SELYE · GESTÃO FÍSICA PESSOAL
            </p>
            <p className="mt-0.5">Organizar. Registrar. Acompanhar.</p>
          </div>

          <div className="flex gap-8">
            <div className="w-36 text-center border-t border-grafite pt-1">
              <span>Assinatura do Atleta</span>
            </div>
            <div className="w-36 text-center border-t border-grafite pt-1">
              <span>Visto do Treinador</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
