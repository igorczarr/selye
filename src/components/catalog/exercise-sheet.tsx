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
import { X, ShieldAlert, Dumbbell, ImageOff } from "lucide-react";
import { getExerciseDetail, type ExerciseDetail } from "@/actions/catalog";

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-xl bg-white"
        aria-label={`Passo a passo ilustrado: ${name}`}
      >
        {images.map((src, i) => (
          <div key={src} className="snap-center shrink-0 w-full aspect-[4/3] relative">
            {failed[i] ? (
              <div className="absolute inset-0 grid place-items-center text-muted">
                <ImageOff size={28} />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={`${name} — passo ${i + 1} de ${images.length}`}
                loading={i === 0 ? "eager" : "lazy"}
                onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}
            <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-noite/85 text-osso text-[11px] font-mono">
              Passo {i + 1}/{images.length}
            </span>
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para o passo ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === index ? "w-5 bg-foreground" : "w-1.5 bg-foreground/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    getExerciseDetail(exerciseId)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setStatus(d ? "ready" : "error");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [exerciseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const hasVideo = !!detail && (detail.videos.length > 0 || detail.youtubeEmbeds.length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={detail ? `Ficha técnica: ${detail.namePt}` : "Ficha técnica do exercício"}
      className="fixed inset-0 z-[60] bg-noite/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] bg-surface border border-line rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden fade-up">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <span className="t-label !text-accent-text">
              {detail?.primaryMuscle ?? "Ficha técnica"}
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
              {detail.images.length > 0 ? (
                <MediaCarousel images={detail.images} name={detail.namePt} />
              ) : (
                !hasVideo && (
                  <div className="rounded-xl border border-dashed border-line py-8 flex flex-col items-center gap-2 text-muted">
                    <Dumbbell size={24} />
                    <p className="text-xs">Ilustração em breve para este movimento.</p>
                  </div>
                )
              )}

              {detail.youtubeEmbeds.map((src) => (
                <div key={src} className="aspect-video rounded-xl overflow-hidden bg-noite">
                  <iframe
                    src={src}
                    title={`Vídeo: ${detail.namePt}`}
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
    </div>
  );
}
