"use client";

import { useState, useTransition } from "react";
import { addDailyMessage, syncMuscleGroupExercises } from "@/actions/admin";
import { RefreshCw, Shield, CheckCircle2, X } from "lucide-react";

interface AdminPanelProps {
  data: {
    stats: {
      usersCount: number;
      exercisesCount: number;
      teamsCount: number;
      sessionsCount: number;
    };
    messages: any[];
  };
}

export function AdminPanel({ data }: AdminPanelProps) {
  const [isPending, startTransition] = useTransition();

  const [msgDate, setMsgDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [msgText, setMsgText] = useState("");
  const [msgCategory, setMsgCategory] = useState("consistencia");
  const [msgAuthor, setMsgAuthor] = useState("Selye Editorial");

  const [selectedMuscle, setSelectedMuscle] = useState("chest");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;

    startTransition(async () => {
      await addDailyMessage(
        msgDate,
        msgText.trim(),
        msgCategory,
        msgAuthor.trim() || "Selye Editorial"
      );
      setMsgText("");
      setStatusBanner("Nota do Dia programada e publicada com sucesso.");
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const count = await syncMuscleGroupExercises(selectedMuscle);
      setStatusBanner(
        `Sincronização concluída: ${count} movimentos verificados e atualizados no catálogo.`
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-accent-text" />
          <span className="t-label !text-accent-text">
            Governança & Curadoria
          </span>
        </div>
        <h1 className="t-h1 mt-1">Painel Administrativo</h1>
        <p className="text-muted text-sm mt-1">
          Curadoria editorial da Nota do Dia, atualização do catálogo biomecânico e indicadores globais.
        </p>
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

      {/* Métricas Globais */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Contas Registradas</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {data.stats.usersCount}
          </p>
          <span className="t-aux text-muted mt-2">Atletas & Treinadores</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Catálogo de Movimentos</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {data.stats.exercisesCount}
          </p>
          <span className="t-aux text-accent-text mt-2 font-medium">
            Padronizados em PT-BR
          </span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Equipes Ativas</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {data.stats.teamsCount}
          </p>
          <span className="t-aux text-muted mt-2">Assessorias e clubes</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Sessões Auditadas</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {data.stats.sessionsCount}
          </p>
          <span className="t-aux text-accent-text mt-2 font-medium">
            Histórico consolidado
          </span>
        </div>
      </section>

      {/* Curadoria Editorial: Nota do Dia */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <span className="t-label">Curadoria Editorial</span>
          <h2 className="t-h2 mt-1">Programar &ldquo;Nota do Dia&rdquo;</h2>
          <p className="text-muted text-xs mt-1">
            Mensagens breves e alinhadas aos princípios de constância, paciência e autonomia física.
          </p>
        </div>

        <form onSubmit={handleAddMessage} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="msg-date"
                className="t-aux text-foreground font-semibold"
              >
                Data de Exibição
              </label>
              <input
                id="msg-date"
                type="date"
                required
                value={msgDate}
                onChange={(e) => setMsgDate(e.target.value)}
                className="input h-10 text-xs font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="msg-cat"
                className="t-aux text-foreground font-semibold"
              >
                Eixo Temático
              </label>
              <select
                id="msg-cat"
                value={msgCategory}
                onChange={(e) => setMsgCategory(e.target.value)}
                className="input h-10 text-xs"
              >
                <option value="consistencia">Consistência</option>
                <option value="disciplina">Disciplina</option>
                <option value="recuperacao">Recuperação</option>
                <option value="evolucao">Evolução</option>
                <option value="paciencia">Paciência</option>
                <option value="autonomia">Autonomia</option>
                <option value="aprendizado">Aprendizado</option>
                <option value="superacao_pessoal">Superação Pessoal</option>
                <option value="conhecimento_esportivo">
                  Conhecimento Esportivo
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="msg-author"
                className="t-aux text-foreground font-semibold"
              >
                Autoria / Fonte
              </label>
              <input
                id="msg-author"
                type="text"
                value={msgAuthor}
                onChange={(e) => setMsgAuthor(e.target.value)}
                placeholder="Ex: Selye Editorial"
                className="input h-10 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="msg-body"
              className="t-aux text-foreground font-semibold"
            >
              Texto da Nota
            </label>
            <textarea
              id="msg-body"
              rows={2}
              required
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Ex: O desenvolvimento físico não acontece em saltos repentinos, mas na constância silenciosa dos dias comuns."
              className="input h-auto py-2.5 text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !msgText.trim()}
              className="btn btn-primary h-10 px-5 text-xs"
            >
              {isPending ? "Salvando..." : "Publicar Nota"}
            </button>
          </div>
        </form>

        {/* Mensagens Programadas */}
        <div className="border-t border-line pt-4">
          <span className="t-label block mb-2.5">
            Notas Programadas Recentemente
          </span>
          <div className="space-y-2">
            {data.messages.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-foreground/[0.02] border border-line text-xs"
              >
                <div className="flex justify-between items-center text-muted font-mono">
                  <span>{m.publishDate}</span>
                  <span className="capitalize text-accent-text font-semibold">
                    {m.category}
                  </span>
                </div>
                <p className="mt-1.5 font-medium text-foreground italic">
                  &ldquo;{m.messageText}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Atualização do Catálogo de Exercícios */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <span className="t-label">Base Biomecânica</span>
          <h2 className="t-h2 mt-1">Expansão do Catálogo de Exercícios</h2>
          <p className="text-muted text-xs mt-1">
            Importe e atualize movimentos por grupamento muscular com instruções técnicas e equipamentos traduzidos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            aria-label="Selecionar grupamento muscular para sincronização"
            className="input h-10 sm:w-64 text-xs"
          >
            <option value="chest">Peitoral (Chest)</option>
            <option value="biceps">Bíceps (Biceps)</option>
            <option value="triceps">Tríceps (Triceps)</option>
            <option value="lats">Dorsais (Lats)</option>
            <option value="quadriceps">Quadríceps (Quadriceps)</option>
            <option value="hamstrings">Isquiotibiais (Hamstrings)</option>
            <option value="glutes">Glúteos (Glutes)</option>
            <option value="abdominals">Abdômen (Abdominals)</option>
            <option value="forearms">Antebraços (Forearms)</option>
            <option value="calves">Panturrilhas (Calves)</option>
          </select>

          <button
            type="button"
            onClick={handleSync}
            disabled={isPending}
            className="btn btn-dark h-10 px-4 text-xs"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            <span>
              {isPending ? "Sincronizando..." : "Sincronizar Grupamento"}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
