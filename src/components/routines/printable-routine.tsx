"use client";

import Link from "next/link";
import { SelyeLogo } from "@/components/brand/logo";
import { Printer, ArrowLeft, CheckSquare, FileText } from "lucide-react";

interface PrintableRoutineProps {
  data: {
    program: any;
    creator: any;
    version: any;
    templates: any[];
  };
}

export function PrintableRoutine({ data }: PrintableRoutineProps) {
  const { program, creator, version, templates } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-osso/40 py-8 px-4 sm:px-6">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Link
          href="/treinos"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-grafite"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Minhas Fichas</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted">
            Calibrado para A4 / Impressão e PDF
          </span>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-grafite text-osso font-semibold text-xs hover:bg-noite shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* Documento Físico Imprimível (A4 Standard) */}
      <div className="max-w-4xl mx-auto bg-white border border-line rounded-lg p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-grafite">
        {/* Cabeçalho Oficial do Documento */}
        <div className="flex items-start justify-between border-b-2 border-grafite pb-5">
          <div>
            <SelyeLogo height={32} className="text-grafite" />
            <p className="t-aux text-muted mt-1 uppercase tracking-wider font-mono text-[10px]">
              Ficha Técnica de Prescrição e Execução de Treinamento
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="font-bold text-grafite block">VERSÃO {version.versionNumber}.0</span>
            <span className="text-[10px] text-muted block">
              Emissão: {new Date().toLocaleDateString("pt-BR")}
            </span>
            <span className="text-[10px] text-profundo font-semibold block">
              ID: {program.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Metadados da Ficha e do Atleta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-line text-xs font-mono">
          <div>
            <span className="t-label !text-[9px] block text-muted">Programa</span>
            <span className="font-bold text-grafite text-sm">{program.title}</span>
          </div>
          <div>
            <span className="t-label !text-[9px] block text-muted">Titular / Atleta</span>
            <span className="font-semibold text-grafite">{creator?.name || "Atleta Selye"}</span>
          </div>
          <div>
            <span className="t-label !text-[9px] block text-muted">Modalidade</span>
            <span className="font-semibold text-grafite capitalize">{program.modalityCode}</span>
          </div>
          <div>
            <span className="t-label !text-[9px] block text-muted">Validade Técnica</span>
            <span className="font-semibold text-grafite">Ciclo Atual</span>
          </div>
        </div>

        {/* Prescrições por Sessão/Template */}
        <div className="flex flex-col gap-8 py-6">
          {templates.map((template, tIdx) => (
            <div key={template.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-osso/60 px-3 py-1.5 rounded border border-line">
                <h3 className="font-bold text-sm text-grafite tracking-tight font-mono">
                  Sessão {String.fromCharCode(65 + tIdx)}: {template.title}
                </h3>
                {template.notes && (
                  <span className="text-[11px] text-muted italic font-sans">{template.notes}</span>
                )}
              </div>

              {/* Tabela Técnica de Exercícios */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-grafite/80 text-[10px] font-mono uppercase text-muted">
                    <th className="py-2 px-1 w-8 text-center">[✓]</th>
                    <th className="py-2 px-2">Exercício & Instruções</th>
                    <th className="py-2 px-2 text-center w-16">Séries</th>
                    <th className="py-2 px-2 text-center w-20">Reps</th>
                    <th className="py-2 px-2 text-center w-24">Carga Alvo</th>
                    <th className="py-2 px-2 text-center w-20">Descanso</th>
                    <th className="py-2 px-3 text-left w-36">Carga Real / Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {template.prescriptions.map((p: any, pIdx: number) => (
                    <tr key={p.id} className="hover:bg-osso/20 transition-colors">
                      <td className="py-2.5 px-1 text-center">
                        <div className="w-4 h-4 rounded border border-grafite/60 inline-block align-middle" />
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="font-bold text-grafite block">
                          {pIdx + 1}. {p.exerciseNamePt}
                        </span>
                        {p.notes && (
                          <span className="text-[10px] text-muted block italic">{p.notes}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        {p.targetSets}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">{p.targetReps}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-profundo">
                        {p.targetLoadKg ? `${p.targetLoadKg} kg` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-muted">
                        {p.restSeconds}s
                      </td>
                      <td className="py-2.5 px-3 border-l border-line/40">
                        <div className="w-full h-4 border-b border-dashed border-line/80" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Rodapé de Conformidade & Assinaturas */}
        <div className="mt-8 pt-6 border-t-2 border-grafite/20 flex flex-col sm:flex-row items-end justify-between gap-6 text-[10px] font-mono text-muted">
          <div>
            <p>SELYE PERFORMANCE ENGINE · METODOLOGIA CIENTÍFICA</p>
            <p className="mt-0.5">Registro auditável em banco Neon Serverless · Imutabilidade garantida</p>
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