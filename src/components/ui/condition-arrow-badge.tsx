"use client";

import { useId } from "react";
import {
  resolveConditionArrow,
  type ConditionArrowStatus,
  type ConditionArrowTier,
} from "@/core/performance/condition-arrow";

interface ConditionArrowBadgeProps {
  reservePercent: number;
  availableReserveEa?: number;
  personalCapacityEa?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const ARROW_GRADIENTS: Record<
  ConditionArrowTier,
  { top: string; bottom: string; highlight: string }
> = {
  peak_up: {
    top: "#7CF7FF",
    bottom: "#00A8FF",
    highlight: "#D4FDFF",
  },
  good_up: {
    top: "#6EF597",
    bottom: "#16A34A",
    highlight: "#C7FCD8",
  },
  steady_flat: {
    top: "#FDE047",
    bottom: "#CA8A04",
    highlight: "#FEF9C3",
  },
  tired_down: {
    top: "#FDBA74",
    bottom: "#EA580C",
    highlight: "#FFEDD5",
  },
  exhausted_down: {
    top: "#FCA5A5",
    bottom: "#DC2626",
    highlight: "#FEE2E2",
  },
};

/**
 * Setinha de Condição Física estilo PES / FIFA acoplada diretamente à foto de perfil (sem círculo).
 * Desenho vetorial facetado com gradiente, brilho especular e contorno escuro para destacar sobre qualquer foto.
 */
export function ConditionArrowBadge({
  reservePercent,
  availableReserveEa,
  personalCapacityEa,
  size = "sm",
  showLabel = false,
  className = "",
}: ConditionArrowBadgeProps) {
  const uid = useId().replace(/:/g, "");
  const status: ConditionArrowStatus = resolveConditionArrow({
    reservePercent,
    availableReserveEa,
    personalCapacityEa,
  });
  const grad = ARROW_GRADIENTS[status.tier];

  const pxSize = size === "lg" ? 26 : size === "md" ? 22 : 18;
  const tooltip = `${status.labelPt} · ${status.descriptionPt}`;

  const arrowIcon = (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center justify-center shrink-0 select-none ${
        status.tier === "peak_up" ? "animate-arrow-float" : ""
      }`}
      style={{
        width: pxSize,
        height: pxSize,
        filter: `drop-shadow(0 2px 3px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 7px ${status.glowHex})`,
      }}
    >
      <svg
        width={pxSize}
        height={pxSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
          transform: `rotate(${status.rotationDeg}deg)`,
          transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <defs>
          <linearGradient
            id={`selye-arr-${uid}`}
            x1="12"
            y1="2"
            x2="12"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={grad.top} />
            <stop offset="100%" stopColor={grad.bottom} />
          </linearGradient>
        </defs>

        {/* Corpo principal da seta esportiva facetada (sem círculo) */}
        <path
          d="M12 2.2L20.8 11.4H15.6V21.2C15.6 21.6 15.25 21.9 14.85 21.9H9.15C8.75 21.9 8.4 21.6 8.4 21.2V11.4H3.2L12 2.2Z"
          fill={`url(#selye-arr-${uid})`}
          stroke="#0C1210"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />

        {/* Faceta esquerda iluminada (efeito 3D estilo PES / FIFA) */}
        <path
          d="M12 3.7L5.1 10.6H9.25V20.5H12V3.7Z"
          fill={grad.highlight}
          fillOpacity="0.34"
        />
      </svg>
    </span>
  );

  if (!showLabel) {
    return <span className={`inline-flex ${className}`}>{arrowIcon}</span>;
  }

  return (
    <div
      title={tooltip}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface/90 shadow-sm ${className}`}
    >
      {arrowIcon}
      <div className="flex flex-col leading-none">
        <span
          className="text-[11px] font-semibold tracking-tight"
          style={{ color: status.colorHex }}
        >
          {status.labelPt}
        </span>
        <span className="text-[10px] font-mono text-muted mt-0.5">
          {typeof availableReserveEa === "number"
            ? `${availableReserveEa} EA (${status.reservePercent}%)`
            : `${status.reservePercent}% EA`}
        </span>
      </div>
    </div>
  );
}
