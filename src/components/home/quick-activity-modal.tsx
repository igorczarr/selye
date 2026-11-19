"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFreeActivity, startFreeActivity } from "@/actions/workout";
import {
  calculateUnifiedSessionLoad,
  getModalityProfile,
} from "@/core/performance/training-load";
import { ModalPortal } from "@/components/ui/modal-portal";
import { Plus, Play, Check, X, Clock, Flame, Zap } from "lucide-react";

const ACTIVITY_PRESETS = [
  { code: "running", label: "Corrida" },
  { code: "cycling", label: "Ciclismo" },
  { code: "futsal", label: "Futsal" },
  { code: "beach_volleyball", label: "Vôlei de Praia" },
  { code: "footvolley", label: "Futevôlei" },
  { code: "swimming", label: "Natação" },
  { code: "walking", label: "Caminhada" },
  { code: "beach_tennis", label: "Beach Tennis" },
  { code: "martial_arts", label: "Lutas / Jiu-Jitsu" },
  { code: "strength", label: "Musculação" },
  { code: "functional", label: "Funcional" },
  { code: "other", label: "Outra atividade" },
] as const;

export function QuickActivityLauncher({
  variant = "primary",
  compact = false,
}: {
  variant?: "primary" | "secondary";
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"log" | "live">("log");
  const [isPending, startTransition] = useTransition();

  const [modalityCode, setModalityCode] = useState<string>("running");
  const [title, setTitle] = useState("Corrida");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [rpe, setRpe] = useState(7);
  const [distanceKm, setDistanceKm] = useState("");
  const [localDate, setLocalDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modProfile = getModalityProfile(modalityCode);
  const previewLoadUa = calculateUnifiedSessionLoad({
    durationMinutes: Number(durationMinutes) || 0,
    rpe,
    modalityCode,
    distanceKm: distanceKm ? Number(distanceKm) : null,
  });

  const selectPreset = (code: string, label: string) => {
    setModalityCode(code);
    if (code === "other") {
      setTitle("");
    } else {
      setTitle(label);
    }
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg("Digite o nome da atividade (ex: Futsal, Pedal, Corrida).");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      if (mode === "live") {
        await startFreeActivity({ title: cleanTitle, modalityCode });
      } else {
        await logFreeActivity({
          title: cleanTitle,
          modalityCode,
          durationMinutes: Number(durationMinutes) || 45,
          rpe,
          localDate,
          distanceKm: distanceKm ? Number(distanceKm) : null,
          notes,
        });
      }
      setOpen(false);
      setDistanceKm("");
      setNotes("");
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Registrar atividade física"
        className={
          variant === "primary"
            ? "btn btn-primary h-9 px-2.5 sm:px-3 text-xs shrink-0 inline-flex items-center gap-1.5"
            : "h-9 px-2.5 sm:px-3 rounded-lg border border-line bg-surface text-foreground hover:bg-foreground/5 text-xs font-mono font-medium transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
        }
      >
        <Plus size={14} strokeWidth={2.4} />
        <span className={compact ? "hidden sm:inline" : "inline"}>
          Registrar Atividade
        </span>
      </button>

      <ModalPortal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Registrar ou iniciar qualquer atividade física"
        maxWidthClass="sm:max-w-lg"
      >
        <form
          onSubmit={handleSubmit}
          className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto"
        >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="t-label !text-accent-text">
                  Atividade Livre · Sem Restrições
                </span>
                <h2 className="t-h2 mt-0.5">Qualquer Esporte ou Movimento</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar janela"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Alternador: Registrar Concluída vs Iniciar Cronômetro Ao Vivo */}
            <div
              role="tablist"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-line bg-background"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "log"}
                onClick={() => setMode("log")}
                className={`h-9 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mode === "log"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Check size={13} />
                <span>Já concluí</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "live"}
                onClick={() => setMode("live")}
                className={`h-9 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mode === "live"
                    ? "bg-lima text-grafite"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Play size={12} fill="currentColor" />
                <span>Iniciar agora</span>
              </button>
            </div>

            {/* Chips rápidos de modalidade (inclui Futsal, Corrida, Ciclismo, etc.) */}
            <div className="flex flex-col gap-1.5">
              <span className="t-label">Escolha ou personalize abaixo</span>
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_PRESETS.map((p) => {
                  const selected = modalityCode === p.code;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => selectPreset(p.code, p.label)}
                      className={`h-8 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? "bg-lima text-grafite font-semibold"
                          : "bg-foreground/6 text-muted hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nome livre da atividade */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="free-activity-title"
                className="t-aux text-foreground font-semibold"
              >
                Nome da Atividade
              </label>
              <input
                id="free-activity-title"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ex: Futsal com amigos, Corrida 5km, Pedal na orla..."
                className="input h-10 text-sm"
              />
              {errorMsg && (
                <span className="text-xs text-red-500">{errorMsg}</span>
              )}
            </div>

            {/* Campos exclusivos do modo "Já concluí" */}
            {mode === "log" && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="free-activity-duration"
                      className="t-aux text-foreground font-semibold inline-flex items-center gap-1"
                    >
                      <Clock size={12} className="text-accent-text" />
                      <span>Duração (min)</span>
                    </label>
                    <input
                      id="free-activity-duration"
                      type="number"
                      min={5}
                      max={600}
                      value={durationMinutes}
                      onChange={(e) =>
                        setDurationMinutes(Number(e.target.value) || 0)
                      }
                      className="input h-10 text-sm t-data"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="free-activity-date"
                      className="t-aux text-foreground font-semibold"
                    >
                      Data
                    </label>
                    <input
                      id="free-activity-date"
                      type="date"
                      value={localDate}
                      onChange={(e) => setLocalDate(e.target.value)}
                      className="input h-10 text-xs t-data"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                    <label
                      htmlFor="free-activity-distance"
                      className="t-aux text-foreground font-semibold"
                    >
                      Distância (km, opc.)
                    </label>
                    <input
                      id="free-activity-distance"
                      type="number"
                      min={0}
                      step={0.1}
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                      placeholder="Ex: 5.2"
                      className="input h-10 text-sm t-data"
                    />
                  </div>
                </div>

                {/* Esforço Percebido (1–10) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="t-aux text-foreground font-semibold inline-flex items-center gap-1">
                      <Zap size={12} className="text-accent-text" />
                      <span>Quão intenso foi? (Nota {rpe} de 10)</span>
                    </span>
                    <span className="t-aux text-muted">
                      {rpe <= 4
                        ? "Leve / Conversando fácil"
                        : rpe <= 7
                          ? "Moderado / Suor bom"
                          : "Forte / Desafiador"}
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRpe(v)}
                        aria-pressed={rpe === v}
                        className={`h-9 rounded-md border t-data text-xs cursor-pointer transition-colors ${
                          rpe === v
                            ? "bg-foreground text-background border-foreground font-semibold"
                            : "border-line bg-background text-muted hover:text-foreground"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="free-activity-notes"
                    className="t-aux text-foreground font-semibold"
                  >
                    Notas (Opcional)
                  </label>
                  <input
                    id="free-activity-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: 2 gols no futsal, ritmo forte nos últimos 2km..."
                    className="input h-10 text-xs"
                  />
                </div>

                {/* Prévia do Impacto na Reserva de Energia Adaptativa (EA) */}
                <div className="rounded-xl border border-line bg-foreground/[0.03] px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="t-label block">
                      Impacto na Energia Adaptativa (EA)
                    </span>
                    <p className="text-xs text-muted">
                      {modalityCode === "walking" && rpe <= 4
                        ? "Sessão Regenerativa · Recarrega sua reserva (+EA)"
                        : `${modProfile.labelPt} · Fator ${modProfile.systemicFactor.toFixed(2)}×`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`t-data text-lg font-semibold ${
                        modalityCode === "walking" && rpe <= 4
                          ? "text-accent-text"
                          : "text-foreground"
                      }`}
                    >
                      {modalityCode === "walking" && rpe <= 4
                        ? `+${Math.round(Math.min(95, Math.max(35, (Number(durationMinutes) || 0) * 1.5)))} EA`
                        : `-${previewLoadUa} EA`}
                    </span>
                  </div>
                </div>
              </>
            )}

            {mode === "live" && (
              <div className="rounded-xl border border-line bg-foreground/[0.02] p-3.5 text-xs text-muted flex items-start gap-2.5">
                <Flame size={15} className="text-accent-text shrink-0 mt-0.5" />
                <span>
                  O cronômetro ao vivo será iniciado imediatamente no painel inicial para você marcar o tempo real e finalizar ao concluir a atividade.
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary h-10 px-5 text-xs"
              >
                {mode === "live" ? (
                  <>
                    <Play size={13} fill="currentColor" />
                    <span>{isPending ? "Iniciando..." : "Iniciar Cronômetro"}</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.4} />
                    <span>{isPending ? "Salvando..." : "Salvar Atividade"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
      </ModalPortal>
    </>
  );
}
