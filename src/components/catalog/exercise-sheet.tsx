"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  X,
  ShieldAlert,
  Dumbbell,
  ImageOff,
  Play,
  Pause,
  ExternalLink,
  PlayCircle,
} from "lucide-react";
import { getExerciseDetail, type ExerciseDetail } from "@/actions/catalog";
import { ModalPortal } from "@/components/ui/modal-portal";

interface ExerciseSheetContextValue {
  open: (exerciseId: string) => void;
  close: () => void;
}

const ExerciseSheetContext = createContext<ExerciseSheetContextValue | null>(null);

/** Abre a ficha técnica de um exercício de qualquer tela: `useExerciseSheet().open(id)`. */
export function useExerciseSheet(): ExerciseSheetContextValue {
  const ctx = useContext(ExerciseSheetContext);
  if (!ctx) {
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}

export function ExerciseSheetProvider({ children }: { children: ReactNode }) {
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const open = useCallback((id: string) => setExerciseId(id), []);
  const close = useCallback(() => setExerciseId(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ExerciseSheetContext.Provider value={value}>
      {children}
      {exerciseId && <ExerciseSheet key={exerciseId} exerciseId={exerciseId} onClose={close} />}
    </ExerciseSheetContext.Provider>
  );
}

function MediaCarousel({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(images.length > 1);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  // Modo demonstração animada gratuita (alterna Posição Inicial ↔ Execução a cada 1.1s)
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 1150);
    return () => clearInterval(timer);
  }, [isPlaying, images.length]);

  const currentSrc = images[index] ?? images[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative rounded-xl overflow-hidden bg-white border border-line aspect-[4/3]"
        aria-label={`Demonstração animada: ${name}`}
      >
        {failed[index] ? (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <ImageOff size={28} />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentSrc}
            alt={`${name} — passo ${index + 1} de ${images.length}`}
            onError={() => setFailed((f) => ({ ...f, [index]: true }))}
            className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200"
          />
        )}

        <span className="absolute left-2.5 top-2.5 px-2.5 py-0.5 rounded-full bg-noite/85 text-osso text-[11px] font-mono">
          {index === 0 ? "Posição Inicial" : `Fase ${index + 1}/${images.length}`}
        </span>

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pausar demonstração" : "Reproduzir demonstração"}
            className="absolute right-2.5 top-2.5 h-8 px-2.5 rounded-full bg-noite/85 text-lima hover:bg-noite text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
            <span>{isPlaying ? "Pausar" : "Animar"}</span>
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver passo ${i + 1}`}
              onClick={() => {
                setIsPlaying(false);
                setIndex(i);
              }}
              className={`h-7 px-2.5 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                i === index
                  ? "bg-foreground text-background font-semibold"
                  : "bg-foreground/6 text-muted hover:text-foreground"
              }`}
            >
              Passo {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mediaTab, setMediaTab] = useState<"video" | "ilustracao">("video");

  useEffect(() => {
    let active = true;
    getExerciseDetail(exerciseId)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        if (d) {
          const hasEmbeddedVideo = d.youtubeEmbeds.length > 0 || d.videos.length > 0;
          setMediaTab(hasEmbeddedVideo ? "video" : "ilustracao");
        }
        setStatus(d ? "ready" : "error");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [exerciseId]);

  const hasVideo = !!detail && (detail.videos.length > 0 || detail.youtubeEmbeds.length > 0);

  return (
    <ModalPortal
      open={true}
      onClose={onClose}
      ariaLabel={detail ? `Ficha técnica: ${detail.namePt}` : "Ficha técnica do exercício"}
      maxWidthClass="sm:max-w-lg"
    >
      <div className="w-full max-h-[88dvh] bg-surface border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <span className="t-label !text-accent-text">
              {detail?.categoryLabel ?? detail?.primaryMuscle ?? "Ficha técnica"}
              {detail ? ` · ${detail.level}` : ""}
            </span>
            <h2 className="t-h2 mt-1">{detail?.namePt ?? (status === "error" ? "Exercício indisponível" : "Carregando…")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha técnica"
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 flex flex-col gap-5">
          {status === "loading" && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-4 w-full" />
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-muted py-6 text-center">
              Não foi possível carregar este exercício agora. Tente novamente em instantes.
            </p>
          )}

          {status === "ready" && detail && (
            <>
              {/* Chave de alternância quando há Vídeo e Ilustração */}
              {hasVideo && detail.images.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Modo de demonstração"
                  className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-foreground/[0.04] border border-line"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mediaTab === "video"}
                    onClick={() => setMediaTab("video")}
                    className={`h-8 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      mediaTab === "video"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <PlayCircle size={14} />
                    <span>Vídeo (YouTube)</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mediaTab === "ilustracao"}
                    onClick={() => setMediaTab("ilustracao")}
                    className={`h-8 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      mediaTab === "ilustracao"
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Dumbbell size={14} />
                    <span>Ilustração Passo a Passo</span>
                  </button>
                </div>
              )}

              {/* Aba 1: Vídeo Demonstrativo Incorporado */}
              {hasVideo && (mediaTab === "video" || detail.images.length === 0) && (
                <div className="flex flex-col gap-2.5">
                  {detail.youtubeEmbeds.map((src) => (
                    <div
                      key={src}
                      className="aspect-video rounded-xl overflow-hidden bg-noite border border-line"
                    >
                      <iframe
                        src={src}
                        title={`Vídeo demonstrativo: ${detail.namePt}`}
                        loading="lazy"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                  {detail.videos.map((src) => (
                    <video
                      key={src}
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-xl bg-noite aspect-video"
                    />
                  ))}
                </div>
              )}

              {/* Aba 2: Ilustração Animada Passo a Passo */}
              {detail.images.length > 0 && (!hasVideo || mediaTab === "ilustracao") && (
                <MediaCarousel images={detail.images} name={detail.namePt} />
              )}

              {!hasVideo && detail.images.length === 0 && (
                <div className="rounded-xl border border-dashed border-line py-8 flex flex-col items-center gap-2 text-muted">
                  <Dumbbell size={24} />
                  <p className="text-xs">Ilustração em breve para este movimento.</p>
                </div>
              )}

              {/* Acesso gratuito imediato a demonstração em vídeo no YouTube quando não houver vídeo embutido */}
              {!hasVideo && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${detail.namePt} execucao tecnica correta`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost h-10 w-full justify-between px-3.5 text-xs font-mono"
                >
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle size={16} className="text-accent-text" />
                    <span>Pesquisar no YouTube</span>
                  </span>
                  <ExternalLink size={13} className="text-muted" />
                </a>
              )}

              <div className="flex flex-wrap gap-1.5">
                {detail.equipment.map((e) => (
                  <span key={e} className="chip">{e}</span>
                ))}
                {detail.secondaryMuscles.map((m) => (
                  <span key={m} className="chip">{m}</span>
                ))}
              </div>

              <section>
                <span className="t-label block mb-2">Como executar</span>
                {detail.steps.length > 0 ? (
                  <ol className="flex flex-col gap-2.5">
                    {detail.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed">
                        <span className="t-data text-xs w-6 h-6 shrink-0 rounded-full bg-lima text-grafite grid place-items-center">
                          {i + 1}
                        </span>
                        <span className="text-foreground">{s}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">
                    {detail.stepsPendingTranslation
                      ? "Descrição em português em preparação. Use as ilustrações como referência."
                      : "Sem descrição cadastrada para este movimento."}
                  </p>
                )}
              </section>

              {detail.safety && (
                <div className="rounded-xl border border-line bg-foreground/[0.03] p-3.5 flex gap-2.5 text-xs text-muted leading-relaxed">
                  <ShieldAlert size={16} className="text-accent-text shrink-0 mt-0.5" />
                  <span>{detail.safety}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
