"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

let activeModalCount = 0;

interface ModalPortalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Alinhamento vertical: 'center' (padrão) ou 'top' (ex: Command Palette) */
  align?: "center" | "top";
  /** Largura máxima do container interno (ex: 'max-w-lg', 'max-w-xl', 'max-w-sm') */
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Portal Universal de Modais do Selye:
 * 1. Monta diretamente em `document.body` (escapando de qualquer `.card` ou `.fade-up` com transform/filter).
 * 2. Trava o scroll da página (`html` e `body`) enquanto aberto e restaura com segurança ao fechar.
 * 3. Aplica desfoque gaussiano (`backdrop-blur-md`) em 100% da janela atrás do modal, mantendo o popup nítido.
 */
export function ModalPortal({
  open,
  onClose,
  ariaLabel,
  align = "center",
  maxWidthClass = "sm:max-w-lg",
  children,
}: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    activeModalCount += 1;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        html.style.overflow = prevHtmlOverflow || "";
        body.style.overflow = prevBodyOverflow || "";
      }
    };
  }, [open, mounted, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 z-[100] flex justify-center overflow-y-auto p-3 sm:p-4 ${
        align === "top"
          ? "items-start pt-6 sm:pt-[10vh]"
          : "items-end sm:items-center"
      }`}
    >
      {/* Camada 1: Backdrop de tela inteira com desfoque gaussiano uniforme */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-noite/75 backdrop-blur-md transition-opacity"
      />

      {/* Camada 2: Popup nítido acima do desfoque */}
      <div
        className={`relative z-10 w-full ${maxWidthClass} my-auto max-h-[90dvh] flex flex-col pointer-events-auto`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
