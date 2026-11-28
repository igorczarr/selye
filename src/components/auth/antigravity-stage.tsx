"use client";

import { useEffect, useRef, useState } from "react";

type ParticleTone = "primary" | "mineral" | "lima";

interface CapsuleParticle {
  normIndex: number;
  baseTheta: number;
  ambientAngle: number;
  ambientRadiusNorm: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  length: number;
  thickness: number;
  alpha: number;
  phase: number;
  driftFreq: number;
  driftAmp: number;
  tone: ParticleTone;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const SYMBOL_PATHS = [
  "M75 21 C63 12 42 12 29 21 C15 31 16 45 31 51 C37 54 43 55 46 56",
  "M55 56 C62 58 70 61 76 66 C86 75 82 88 71 94 C57 102 36 98 23 86",
] as const;

const WORD_PATHS = [
  "M49 10 C42 4 31 3 21 5 C8 8 3 16 7 26 C10 33 21 36 33 40 C46 44 50 53 45 61 C40 69 25 71 12 67 C8 66 5 64 2 62",
  "M105 7 H73 V66 H106 M73 36 H99",
  "M133 7 V66 H169",
  "M194 7 L216 35 L239 7 M216 35 V66",
  "M296 7 H264 V66 H297 M264 36 H290",
] as const;

const LIMA_DOT = "#C7D977";

/**
 * Mantido em memória do módulo:
 * - Em qualquer carregamento real ou F5, inicia como `false` e executa o pre-loader completo.
 * - Na navegação SPA rápida entre `/login` e `/sign-up`, evita bloquear novamente o usuário.
 */
let hasCompletedIntroInMemory = false;

function lerpAngle(current: number, target: number, factor: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createParticles(width: number, height: number): CapsuleParticle[] {
  const isCompact = width < 640;
  const count = isCompact ? 108 : 196;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxDim = Math.hypot(width, height) * 0.5;

  const list: CapsuleParticle[] = [];
  for (let i = 0; i < count; i++) {
    const normIndex = (i + 0.5) / count;
    const baseTheta = i * GOLDEN_ANGLE;
    const startR = maxDim * (0.35 + Math.sqrt(normIndex) * 0.72);
    const startX = cx + Math.cos(baseTheta) * startR;
    const startY = cy + Math.sin(baseTheta) * startR;

    let tone: ParticleTone = "primary";
    if (i % 7 === 0) {
      tone = "lima";
    } else if (i % 3 === 0) {
      tone = "mineral";
    }

    list.push({
      normIndex,
      baseTheta,
      ambientAngle: baseTheta + (i % 5) * 0.17,
      ambientRadiusNorm: 0.28 + Math.sqrt(normIndex) * 0.72,
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      angle: baseTheta + Math.PI * 0.5,
      length: isCompact ? 4.4 + (i % 4) * 1.15 : 5 + (i % 5) * 1.25,
      thickness: isCompact ? 1.65 : 1.85 + (i % 3) * 0.22,
      alpha: 0.34 + (1 - normIndex) * 0.44,
      phase: (i * 0.73) % (Math.PI * 2),
      driftFreq: 0.42 + (i % 7) * 0.08,
      driftAmp: isCompact ? 9 + (i % 4) * 3.5 : 13 + (i % 5) * 4.5,
      tone,
    });
  }

  return list;
}

interface AntigravityAuthStageProps {
  /** Sinaliza quando o SDK de autenticação (Clerk) terminou de hidratar. */
  isAuthReady: boolean;
  /** Callback disparado assim que o pre-loader conclui e libera a caixa central. */
  onRevealChange?: (revealed: boolean) => void;
  /** Define se o ponteiro está sobre o cartão central para acalmar o magnetismo. */
  isPointerInsideCard?: boolean;
}

/**
 * Palco zero-gravity e pre-loader inspirado no padrão Google Antigravity:
 * 1. Pre-loader: micro-cápsulas orientadas convergem em um halo orbital pulsante ao redor
 *    da assinatura oficial Selye enquanto o SDK de login prepara os controles sem layout shift.
 * 2. Dispersão Antigravity: o halo expande suavemente em gravidade zero, revelando o centro limpo
 *    e permanecendo como campo periférico sutil e responsivo ao cursor.
 */
export function AntigravityAuthStage({
  isAuthReady,
  onRevealChange,
  isPointerInsideCard = false,
}: AntigravityAuthStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const stageModeRef = useRef<"preloader" | "ambient">("preloader");
  const authReadyRef = useRef(isAuthReady);
  const pointerInsideCardRef = useRef(isPointerInsideCard);
  const onRevealRef = useRef(onRevealChange);

  const [showPreloader, setShowPreloader] = useState(true);
  const [isExitingPreloader, setIsExitingPreloader] = useState(false);

  useEffect(() => {
    authReadyRef.current = isAuthReady;
    pointerInsideCardRef.current = isPointerInsideCard;
    onRevealRef.current = onRevealChange;
  }, [isAuthReady, isPointerInsideCard, onRevealChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const skipIntro = prefersReducedMotion || hasCompletedIntroInMemory;
    if (skipIntro) {
      hasCompletedIntroInMemory = true;
      stageModeRef.current = "ambient";
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();

    let particles = createParticles(width, height);
    if (stageModeRef.current === "ambient") {
      // Posiciona diretamente na órbita ambiente quando pula o intro
      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);
      const maxDim = Math.hypot(width, height) * 0.52;
      const innerClear = Math.max(210, minDim * 0.3);
      for (const p of particles) {
        const r = innerClear + p.ambientRadiusNorm * Math.max(120, maxDim - innerClear);
        p.x = cx + Math.cos(p.ambientAngle) * r;
        p.y = cy + Math.sin(p.ambientAngle) * r;
      }
    }

    const pointer = {
      x: width * 0.5,
      y: height * 0.5,
      active: false,
      burstAt: -10,
      burstX: 0,
      burstY: 0,
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (pointerInsideCardRef.current) return;
      pointer.burstX = e.clientX;
      pointer.burstY = e.clientY;
      pointer.burstAt = performance.now() * 0.001;
    };

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      syncCanvasSize();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const next = createParticles(width, height);
        if (stageModeRef.current === "ambient") {
          const cx = width * 0.5;
          const cy = height * 0.5;
          const minDim = Math.min(width, height);
          const maxDim = Math.hypot(width, height) * 0.52;
          const innerClear = Math.max(210, minDim * 0.3);
          for (const p of next) {
            const r =
              innerClear + p.ambientRadiusNorm * Math.max(120, maxDim - innerClear);
            p.x = cx + Math.cos(p.ambientAngle) * r;
            p.y = cy + Math.sin(p.ambientAngle) * r;
          }
        }
        particles = next;
      }, 140);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    const startMs = performance.now();
    const MIN_INTRO_MS = 1450;
    const MAX_WAIT_MS = 2300;
    let releaseTriggered = stageModeRef.current === "ambient";
    let unmountTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId = 0;

    const readThemePalette = () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      return isDark
        ? {
            isDark: true,
            primary: "244, 245, 240",
            mineral: "118, 143, 130",
            lima: "199, 227, 91",
            baseOpacity: 0.72,
          }
        : {
            isDark: false,
            primary: "32, 42, 39",
            mineral: "96, 118, 106",
            lima: "152, 180, 48",
            baseOpacity: 0.68,
          };
    };

    let palette = readThemePalette();
    const themeObserver = new MutationObserver(() => {
      palette = readThemePalette();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const triggerAntigravityRelease = () => {
      if (releaseTriggered) return;
      releaseTriggered = true;
      hasCompletedIntroInMemory = true;
      stageModeRef.current = "ambient";

      // Impulso radial suave em gravidade zero para abrir o centro da tela
      const cx = width * 0.5;
      const cy = height * 0.5;
      for (const p of particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const impulse = 5.5 + p.ambientRadiusNorm * 6.5;
        p.vx += (dx / dist) * impulse;
        p.vy += (dy / dist) * impulse;
      }

      setIsExitingPreloader(true);
      onRevealRef.current?.(true);

      unmountTimer = setTimeout(() => {
        setShowPreloader(false);
      }, 560);
    };

    let lastTime = startMs * 0.001;
    let instantSkipHandled = false;

    const renderFrame = (nowMs: number) => {
      if (skipIntro && !instantSkipHandled) {
        instantSkipHandled = true;
        setIsExitingPreloader(true);
        setShowPreloader(false);
        onRevealRef.current?.(true);
      }

      const elapsedMs = nowMs - startMs;
      const nowSec = nowMs * 0.001;
      const dt = Math.min(0.05, Math.max(0.001, nowSec - lastTime));
      lastTime = nowSec;

      // Atualiza barra sutil de progresso durante o pre-loader
      if (!releaseTriggered) {
        const timeRatio = Math.min(1, elapsedMs / MIN_INTRO_MS);
        const eased = 1 - Math.pow(1 - timeRatio, 2.4);
        const visualProgress = authReadyRef.current
          ? eased
          : Math.min(0.92, eased * 0.92);

        if (progressFillRef.current) {
          progressFillRef.current.style.transform = `scaleX(${visualProgress.toFixed(4)})`;
        }

        const readyToRelease =
          (elapsedMs >= MIN_INTRO_MS && authReadyRef.current) ||
          elapsedMs >= MAX_WAIT_MS;

        if (readyToRelease) {
          if (progressFillRef.current) {
            progressFillRef.current.style.transform = "scaleX(1)";
          }
          triggerAntigravityRelease();
        }
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);
      const maxDim = Math.hypot(width, height) * 0.54;
      const isAmbient = stageModeRef.current === "ambient";

      const ringInner = Math.max(96, Math.min(148, minDim * 0.175));
      const ringSpan = Math.max(68, Math.min(145, minDim * 0.165));
      const ambientInner = Math.max(220, minDim * 0.31);

      const burstAge = nowSec - pointer.burstAt;
      const hasActiveBurst = burstAge >= 0 && burstAge < 0.75;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let targetX: number;
        let targetY: number;
        let targetAngle: number;
        let visibilityScale = 1;

        if (!isAmbient) {
          // Modo Pre-loader: Halo orbital pulsante estilo Antigravity medusa
          const orbitSpeed = 0.34 + (1 - p.normIndex) * 0.24;
          const theta = p.baseTheta + nowSec * orbitSpeed;
          const medusaWave =
            Math.sin(theta * 4 - nowSec * 3.2 + p.normIndex * 4.5) * 7.5 +
            Math.cos(theta * 3 + nowSec * 2.1) * 4.5;
          const r = ringInner + Math.sqrt(p.normIndex) * ringSpan + medusaWave;

          targetX = cx + Math.cos(theta) * r;
          targetY = cy + Math.sin(theta) * r;
          targetAngle =
            theta +
            Math.PI * 0.5 +
            Math.cos(theta * 4 - nowSec * 3.2) * 0.22;

          const spring = prefersReducedMotion ? 0.2 : 0.085;
          p.vx = (p.vx + (targetX - p.x) * spring) * 0.8;
          p.vy = (p.vy + (targetY - p.y) * spring) * 0.8;
        } else {
          // Modo Ambiente: Campo zero-gravity calmo ao redor do cartão central
          const slowSpin = nowSec * 0.022 * (i % 2 === 0 ? 1 : -0.75);
          const theta = p.ambientAngle + slowSpin;
          const baseR =
            ambientInner +
            p.ambientRadiusNorm * Math.max(130, maxDim - ambientInner);

          const driftX = Math.cos(nowSec * p.driftFreq + p.phase) * p.driftAmp;
          const driftY =
            Math.sin(nowSec * p.driftFreq * 0.84 + p.phase) * p.driftAmp -
            Math.sin(nowSec * 0.32 + p.phase) * 8;

          targetX = cx + Math.cos(theta) * baseR + driftX;
          targetY = cy + Math.sin(theta) * baseR + driftY;
          targetAngle =
            theta +
            Math.PI * 0.5 +
            Math.sin(nowSec * p.driftFreq + p.phase) * 0.35;

          // Interação magnética Antigravity com o cursor (apenas fora do cartão de login)
          if (pointer.active && !pointerInsideCardRef.current && !prefersReducedMotion) {
            const dxCursor = p.x - pointer.x;
            const dyCursor = p.y - pointer.y;
            const distCursor = Math.hypot(dxCursor, dyCursor);
            const influenceRadius = 195;

            if (distCursor < influenceRadius && distCursor > 0.1) {
              const influence = 1 - distCursor / influenceRadius;
              const haloRadius = 74 + (i % 4) * 9;
              const cursorAngle =
                Math.atan2(dyCursor, dxCursor) + dt * 1.4 * influence;
              const haloX = pointer.x + Math.cos(cursorAngle) * haloRadius;
              const haloY = pointer.y + Math.sin(cursorAngle) * haloRadius;

              targetX = p.x + (haloX - p.x) * (influence * 0.65);
              targetY = p.y + (haloY - p.y) * (influence * 0.65);
              targetAngle = lerpAngle(
                targetAngle,
                cursorAngle + Math.PI * 0.5,
                influence * 0.85
              );
              visibilityScale = 1 + influence * 0.35;
            }
          }

          if (hasActiveBurst) {
            const bDx = p.x - pointer.burstX;
            const bDy = p.y - pointer.burstY;
            const bDist = Math.hypot(bDx, bDy) || 1;
            if (bDist < 240) {
              const push = (1 - bDist / 240) * (1 - burstAge / 0.75) * 2.4;
              p.vx += (bDx / bDist) * push;
              p.vy += (bDy / bDist) * push;
            }
          }

          p.vx = (p.vx + (targetX - p.x) * 0.026) * 0.9;
          p.vy = (p.vy + (targetY - p.y) * 0.026) * 0.9;
        }

        if (prefersReducedMotion) {
          p.x = targetX;
          p.y = targetY;
          p.angle = targetAngle;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.angle = lerpAngle(p.angle, targetAngle, isAmbient ? 0.09 : 0.16);
        }

        // Zona limpa central no modo ambiente para leitura cristalina da caixa de login
        if (isAmbient) {
          const distCenter = Math.hypot(p.x - cx, p.y - cy);
          visibilityScale *= smoothstep(155, 290, distCenter);
        }

        const finalAlpha = Math.min(
          0.92,
          p.alpha * palette.baseOpacity * visibilityScale * (isAmbient ? 0.68 : 1)
        );

        if (finalAlpha <= 0.015) continue;

        const rgb =
          p.tone === "lima"
            ? palette.lima
            : p.tone === "mineral"
              ? palette.mineral
              : palette.primary;

        const halfLen = p.length * 0.5;
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);

        ctx.strokeStyle = `rgba(${rgb}, ${finalAlpha.toFixed(3)})`;
        ctx.lineWidth = p.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x - cosA * halfLen, p.y - sinA * halfLen);
        ctx.lineTo(p.x + cosA * halfLen, p.y + sinA * halfLen);
        ctx.stroke();
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      themeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      />

      {showPreloader && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Preparando acesso ao Selye"
          className={`fixed inset-0 z-30 grid place-items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isExitingPreloader
              ? "pointer-events-none scale-[1.03] opacity-0"
              : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center gap-5 select-none">
            {/* Assinatura oficial Selye com desenho contínuo em movimento */}
            <div className="flex flex-col items-center gap-3">
              <svg
                viewBox="12 8 78 96"
                width={39}
                height={48}
                aria-hidden="true"
                className="text-foreground"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={7.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {SYMBOL_PATHS.map((d, idx) => (
                    <path
                      key={d}
                      d={d}
                      pathLength={1}
                      className={
                        idx === 0
                          ? "auth-preloader-stroke-1"
                          : "auth-preloader-stroke-2"
                      }
                    />
                  ))}
                  <circle
                    cx={50.5}
                    cy={55.5}
                    r={5.5}
                    fill={LIMA_DOT}
                    stroke="none"
                    className="auth-preloader-dot"
                  />
                </g>
              </svg>

              <svg
                viewBox="-2 0 304 74"
                height={15}
                width={62}
                aria-hidden="true"
                className="text-foreground auth-preloader-wordmark"
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={6.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {WORD_PATHS.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              </svg>
            </div>

            {/* Indicador linear minimalista */}
            <div
              aria-hidden="true"
              className="h-[1.5px] w-24 overflow-hidden rounded-full bg-foreground/12"
            >
              <div
                ref={progressFillRef}
                className="h-full w-full origin-left scale-x-0 rounded-full bg-foreground transition-transform duration-100 ease-out"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
