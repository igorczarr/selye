"use client";

import { useState, useTransition } from "react";
import { addDailyMessage, syncMuscleGroupExercises } from "@/actions/admin";
import { Settings, RefreshCw, Plus, Users, Dumbbell, Calendar, Shield } from "lucide-react";

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

  // Estados de nova mensagem da Nota do Dia
  const [msgDate, setMsgDate] = useState(new Date().toISOString().split("T")[0]);
  const [msgText, setMsgText] = useState("");
  const [msgCategory, setMsgCategory] = useState("consistencia");
  const [msgAuthor, setMsgAuthor] = useState("Selye Editorial");

  // Estado de sincronização
  const [selectedMuscle, setSelectedMuscle] = useState("chest");

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;

    startTransition(async () => {
      await addDailyMessage(msgDate, msgText, msgCategory, msgAuthor);
      setMsgText("");
      alert("Mensagem editorial publicada com sucesso!");
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const count = await syncMuscleGroupExercises(selectedMuscle);
      alert(`Sincronização concluída! ${count} novos exercícios catalogados.`);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-profundo" />
          <span className="t-label !text-profundo">Governança & Backoffice (§20)</span>
        </div>
        <h1 className="t-h1 mt-1">Painel Administrativo do Selye</h1>
        <p className="text-muted text-sm mt-1">
          Gestão editorial da Nota do Dia, catálogo de exercícios e métricas agregadas da plataforma.
        </p>
      </div>

      {/* Métricas Agregadas do Negócio (§20.5 e §22.2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Usuários Cadastrados</span>
          <p className="t-data text-2xl mt-1 text-grafite">{data.stats.usersCount}</p>
          <span className="t-aux text-muted mt-2">Atletas & Coaches</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Catálogo de Exercícios</span>
          <p className="t-data text-2xl mt-1 text-grafite">{data.stats.exercisesCount}</p>
          <span className="t-aux text-profundo mt-2 font-medium">API Ninjas + Custom</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Equipes Criadas</span>
          <p className="t-data text-2xl mt-1 text-grafite">{data.stats.teamsCount}</p>
          <span className="t-aux text-muted mt-2">Assessorias ativas</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Treinos Executados</span>
          <p className="t-data text-2xl mt-1 text-grafite">{data.stats.sessionsCount}</p>
          <span className="t-aux text-profundo mt-2 font-medium">Sessões registradas</span>
        </div>
      </div>

      {/* Gestão Editorial: Nota do Dia (§14 e §20.4) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div>
          <span className="t-label">Biblioteca Editorial (§14)</span>
          <h3 className="t-h2 mt-1">Cadastrar Nova "Nota do Dia"</h3>
          <p className="text-muted text-xs mt-1">
            Mensagens originais, curtas e coerentes com a voz do manual de identidade visual Selye.
          </p>
        </div>

        <form onSubmit={handleAddMessage} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="t-aux text-muted">Data de Publicação</label>
              <input
                type="date"
                required
                value={msgDate}
                onChange={(e) => setMsgDate(e.target.value)}
                className="h-9 px-3 rounded border border-line bg-background text-xs font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="t-aux text-muted">Categoria Editorial (§14.2)</label>
              <select
                value={msgCategory}
                onChange={(e) => setMsgCategory(e.target.value)}
                className="h-9 px-3 rounded border border-line bg-background text-xs"
              >
                <option value="consistencia">Consistência</option>
                <option value="disciplina">Disciplina</option>
                <option value="recuperacao">Recuperação</option>
                <option value="evolucao">Evolução</option>
                <option value="paciencia">Paciência</option>
                <option value="autonomia">Autonomia</option>
                <option value="aprendizado">Aprendizado</option>
                <option value="superacao_pessoal">Superação Pessoal</option>
                <option value="conhecimento_esportivo">Conhecimento Esportivo</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="t-aux text-muted">Autor</label>
              <input
                type="text"
                value={msgAuthor}
                onChange={(e) => setMsgAuthor(e.target.value)}
                placeholder="Ex: Selye Editorial"
                className="h-9 px-3 rounded border border-line bg-background text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="t-aux text-muted">Texto da Mensagem</label>
            <textarea
              rows={2}
              required
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Ex: O desenvolvimento físico não acontece em saltos repentinos, mas na constância silenciosa dos dias comuns."
              className="p-3 rounded border border-line bg-background text-xs focus:outline-none focus:ring-1 focus:ring-profundo"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !msgText.trim()}
              className="h-9 px-4 rounded bg-grafite text-osso font-semibold text-xs hover:bg-noite transition-colors cursor-pointer"
            >
              {isPending ? "Salvando..." : "Salvar Mensagem"}
            </button>
          </div>
        </form>

        {/* Mensagens Cadastradas */}
        <div className="border-t border-line/60 pt-3">
          <span className="t-aux text-muted font-mono uppercase tracking-wider">
            Mensagens Programadas Recentemente
          </span>
          <div className="mt-2 space-y-2">
            {data.messages.map((m) => (
              <div key={m.id} className="p-3 rounded bg-osso/30 border border-line/50 text-xs">
                <div className="flex justify-between items-center text-muted text-[11px] font-mono">
                  <span>Data: {m.publishDate}</span>
                  <span className="capitalize text-profundo font-semibold">{m.category}</span>
                </div>
                <p className="mt-1 font-medium text-grafite italic">"{m.messageText}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sincronização do Catálogo (§20.3) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div>
          <span className="t-label">API Ninjas & Catálogo (§6 e §20.3)</span>
          <h3 className="t-h2 mt-1">Sincronização Externa de Exercícios</h3>
          <p className="text-muted text-xs mt-1">
            Execute chamadas para a API Ninjas e alimente o catálogo local com instruções, músculos e equipamentos traduzidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            className="h-10 px-3 rounded border border-line bg-background text-xs"
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
            onClick={handleSync}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded bg-grafite text-osso font-semibold text-xs hover:bg-noite transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            <span>{isPending ? "Sincronizando..." : "Sincronizar Músculo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
