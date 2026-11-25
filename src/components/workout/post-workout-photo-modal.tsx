"use client";

import { useState, useRef } from "react";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Camera,
  Download,
  Share2,
  ImagePlus,
  ZoomIn,
  RotateCcw,
  X,
  Check,
  Sparkles,
} from "lucide-react";

/** Geometria oficial do wordmark SELYE (apenas o nome, sem o símbolo em S). */
const SELYE_WORD_PATHS = [
  "M49 10 C42 4 31 3 21 5 C8 8 3 16 7 26 C10 33 21 36 33 40 C46 44 50 53 45 61 C40 69 25 71 12 67 C8 66 5 64 2 62",
  "M105 7 H73 V66 H106 M73 36 H99",
  "M133 7 V66 H169",
  "M194 7 L216 35 L239 7 M216 35 V66",
  "M296 7 H264 V66 H297 M264 36 H290",
];

const MODALITY_LABELS_UPPER: Record<string, string> = {
  strength: "MUSCULAÇÃO",
  beach_volleyball: "VÔLEI DE PRAIA",
  footvolley: "FUTEVÔLEI",
  beach_tennis: "BEACH TENNIS",
  running: "CORRIDA",
  cycling: "CICLISMO",
  swimming: "NATAÇÃO",
  functional: "FUNCIONAL",
  cross_training: "CROSS TRAINING",
  calisthenics: "CALISTENIA",
  futsal: "FUTSAL",
  football: "FUTEBOL",
  martial_arts: "LUTAS",
  combat: "LUTAS",
  mobility: "MOBILIDADE",
  walking: "CAMINHADA",
};

/**
 * Ícones vetoriais (paths 32x28) por modalidade para renderização idêntica no SVG e no Canvas HD.
 */
function getModalityVectorPaths(modalityCode?: string | null): string[] {
  const code = (modalityCode || "strength").toLowerCase();
  if (
    code.includes("volley") ||
    code.includes("foot") ||
    code.includes("fut") ||
    code.includes("beach")
  ) {
    // Esfera esportiva / bola com linhas curvas
    return [
      "M16 3 A11 11 0 1 0 16 25 A11 11 0 1 0 16 3 Z",
      "M7 9 Q16 14 25 9",
      "M7 19 Q16 14 25 19",
      "M16 3 V25",
    ];
  }
  if (code.includes("run") || code.includes("walk")) {
    // Raio / passada dinâmica
    return ["M18 3 L8 15 H16 L14 25 L24 13 H16 Z"];
  }
  if (code.includes("cycl")) {
    // Duas rodas + quadro
    return [
      "M8 19 A5 5 0 1 0 8 20 Z",
      "M24 19 A5 5 0 1 0 24 20 Z",
      "M8 19 L14 10 H21 L16 19 H8",
      "M21 10 L24 19",
    ];
  }
  if (code.includes("swim")) {
    // Ondas
    return [
      "M4 11 Q9 7 14 11 T24 11 T29 11",
      "M4 18 Q9 14 14 18 T24 18 T29 18",
    ];
  }
  // Padrão: Haltere / Dumbbell (Musculação, Funcional, Calistenia)
  return [
    "M4 9 v10",
    "M9 5 v18",
    "M9 14 h14",
    "M23 5 v18",
    "M28 9 v10",
  ];
}

function formatCompletionDateTimePt(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  const months = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()] || "NOV";
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} · ${hours}:${mins}`;
}

export interface PostWorkoutPhotoModalProps {
  open: boolean;
  onClose: () => void;
  workoutTitle: string;
  modalityCode?: string | null;
  durationMinutes: number;
  activeDaysInYear: number;
  finishedAt?: string | Date | null;
}

export function PostWorkoutPhotoModal({
  open,
  onClose,
  workoutTitle,
  modalityCode = "strength",
  durationMinutes,
  activeDaysInYear,
  finishedAt,
}: PostWorkoutPhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState(workoutTitle);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const safeDuration = Math.max(1, Math.round(durationMinutes || 45));
  const safeActiveDays = Math.max(1, Math.round(activeDaysInYear || 1));
  const modalityLabel =
    MODALITY_LABELS_UPPER[modalityCode || "strength"] ||
    (modalityCode || "TREINO").toUpperCase();
  const dateTimeStr = formatCompletionDateTimePt(finishedAt);
  const modalityPaths = getModalityVectorPaths(modalityCode);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!photoDataUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setDragStart(null);
  };

  /**
   * Renderiza a foto + moldura minimalista aprovada em um Canvas HD 1080x1920 (9:16 Stories)
   * com margem inferior exata de 10px.
   */
  const renderHighResCanvas = async (): Promise<HTMLCanvasElement> => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");

    // 1. Fundo ou Foto do Atleta
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#1C2420");
    bgGrad.addColorStop(0.5, "#131916");
    bgGrad.addColorStop(1, "#0B0F0D");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    if (photoDataUrl) {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = photoDataUrl;
      });

      const imgRatio = img.width / img.height;
      const canvasRatio = W / H;
      let drawW = W;
      let drawH = H;
      if (imgRatio > canvasRatio) {
        drawH = H;
        drawW = H * imgRatio;
      } else {
        drawW = W;
        drawH = W / imgRatio;
      }

      drawW *= zoom;
      drawH *= zoom;

      // Escala o offset do preview (~300px) para o canvas HD (1080px)
      const scaleFactor = W / 300;
      const drawX = (W - drawW) / 2 + offset.x * scaleFactor;
      const drawY = (H - drawH) / 2 + offset.y * scaleFactor;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // 2. Vinheta Inferior Suave (protege leitura sem caixa)
    const vig = ctx.createLinearGradient(0, 1460, 0, H);
    vig.addColorStop(0, "rgba(7, 10, 9, 0)");
    vig.addColorStop(0.35, "rgba(7, 10, 9, 0.52)");
    vig.addColorStop(1, "rgba(7, 10, 9, 0.92)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 1460, W, 460);

    // 3. Bloco Minimalista Inferior Esquerdo (Base em y = 1910 -> 10px de margem inferior!)
    const baseX = 64;
    const blockTopY = 1756;

    // 3.1. Logo SELYE pequena pairando sobre todas as informações
    ctx.save();
    ctx.translate(baseX, blockTopY);
    ctx.scale(0.24, 0.24);
    ctx.strokeStyle = "rgba(244, 243, 239, 0.92)";
    ctx.lineWidth = 6.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of SELYE_WORD_PATHS) {
      const p = new Path2D(d);
      ctx.stroke(p);
    }
    ctx.restore();

    // 3.2. Ícone da Modalidade + MODALIDADE · TREINO CONCLUÍDO · DATA · HORA
    ctx.save();
    ctx.translate(baseX, blockTopY + 31);
    ctx.scale(0.6, 0.6);
    ctx.strokeStyle = "#C7F000";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of modalityPaths) {
      const p = new Path2D(d);
      ctx.stroke(p);
    }
    ctx.restore();

    ctx.save();
    ctx.font = "700 13.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "alphabetic";
    const modY = blockTopY + 44;
    ctx.fillStyle = "#F4F3EF";
    ctx.fillText(modalityLabel, baseX + 26, modY);
    const modWidth = ctx.measureText(modalityLabel).width;
    ctx.fillStyle = "#9CA39E";
    ctx.fillText(
      ` · TREINO CONCLUÍDO · ${dateTimeStr}`,
      baseX + 26 + modWidth,
      modY
    );
    ctx.restore();

    // 3.3. Título do Treino
    ctx.save();
    ctx.font = "800 40px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#F4F3EF";
    ctx.textBaseline = "alphabetic";
    const displayTitle = (customTitle || workoutTitle || "Treino Concluído").slice(
      0,
      36
    );
    ctx.fillText(displayTitle, baseX, blockTopY + 86);
    ctx.restore();

    // 3.4. Diagramação Editorial Harmonizada na Base (y = 1910 -> 10px da margem inferior)
    const metricsBaseY = 1910;

    // Métrica 1: Duração (ex: 48 min)
    ctx.save();
    ctx.font = "900 56px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "#F4F3EF";
    ctx.textBaseline = "alphabetic";
    const durStr = String(safeDuration);
    ctx.fillText(durStr, baseX, metricsBaseY);
    const durW = ctx.measureText(durStr).width;

    ctx.font = "800 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "#C7F000";
    ctx.fillText("min", baseX + durW + 6, metricsBaseY);
    const minW = ctx.measureText("min").width;

    // Divisor Arquitetônico Vertical
    const dividerX = baseX + durW + 6 + minW + 24;
    ctx.strokeStyle = "rgba(244, 243, 239, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dividerX, metricsBaseY - 40);
    ctx.lineTo(dividerX, metricsBaseY - 2);
    ctx.stroke();

    // Métrica 2: Dias Ativos com mesma escala numérica + rótulo empilhado
    const daysX = dividerX + 24;
    ctx.font = "900 56px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "#F4F3EF";
    const daysStr = String(safeActiveDays);
    ctx.fillText(daysStr, daysX, metricsBaseY);
    const daysW = ctx.measureText(daysStr).width;

    // Rótulo empilhado • DIAS / ATIVOS
    const stackX = daysX + daysW + 10;
    ctx.fillStyle = "#C7F000";
    ctx.beginPath();
    ctx.arc(stackX + 5, metricsBaseY - 27, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "800 13.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "#C7F000";
    ctx.fillText("DIAS", stackX + 14, metricsBaseY - 22);

    ctx.font = "700 13.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(244, 243, 239, 0.88)";
    ctx.fillText("ATIVOS", stackX + 1, metricsBaseY - 4);
    ctx.restore();

    return canvas;
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderHighResCanvas();
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `selye-treino-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedbackMsg("Imagem HD salva! Pronta para postar no Instagram.");
      setTimeout(() => setFeedbackMsg(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareInstagram = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderHighResCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 1.0)
      );
      if (!blob) return;

      const file = new File([blob], "selye-pos-treino.png", {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: customTitle || workoutTitle,
        });
        setFeedbackMsg("Compartilhado com sucesso!");
      } else {
        // Fallback em desktop: baixa o PNG HD automaticamente
        await handleDownload();
      }
    } catch {
      // Usuário cancelou o menu nativo de compartilhamento
    } finally {
      setIsExporting(false);
    }
  };

  // Coordenadas dinâmicas no SVG preview para acompanhar números de 1 a 3 dígitos
  const durDigits = String(safeDuration).length;
  const svgDividerX = durDigits === 1 ? 118 : durDigits === 2 ? 158 : 194;
  const svgDaysX = svgDividerX + 24;
  const daysDigits = String(safeActiveDays).length;
  const svgStackOffset = daysDigits === 1 ? 44 : daysDigits === 2 ? 78 : 110;

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      ariaLabel="Moldura de Foto Pós-Treino para Instagram"
      maxWidthClass="sm:max-w-lg"
    >
      <div className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4 max-h-[92dvh] overflow-y-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent-text font-bold inline-flex items-center gap-1">
              <Sparkles size={12} />
              <span>Stories 9:16 · Pós-Treino</span>
            </span>
            <h2 className="t-h3 mt-0.5">Moldura Selye para Instagram</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inputs ocultos para Câmera e Galeria */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview Interativo 9:16 com a Moldura Minimalista Aprovada */}
        <div className="flex flex-col items-center gap-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-[270px] sm:w-[300px] aspect-[9/16] rounded-2xl overflow-hidden border border-line bg-[#121815] shadow-xl select-none touch-none cursor-grab active:cursor-grabbing"
          >
            {/* Foto do usuário (com zoom e arraste) */}
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="Foto pós-treino"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            )}

            {/* Overlay Vetorial Idêntico ao Template Aprovado */}
            <svg
              viewBox="0 0 1080 1920"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                <linearGradient id="selyeStoryVig" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#070A09" stopOpacity="0" />
                  <stop offset="35%" stopColor="#070A09" stopOpacity="0.52" />
                  <stop offset="100%" stopColor="#070A09" stopOpacity="0.92" />
                </linearGradient>
              </defs>

              {!photoDataUrl && (
                <g opacity="0.55" transform="translate(540, 760)" textAnchor="middle">
                  <circle
                    cx="0"
                    cy="0"
                    r="190"
                    fill="none"
                    stroke="#F4F3EF"
                    strokeOpacity="0.2"
                    strokeWidth="2"
                    strokeDasharray="8 8"
                  />
                  <text
                    y="-8"
                    fill="#F4F3EF"
                    fontFamily="system-ui, sans-serif"
                    fontSize="26"
                    fontWeight="700"
                    letterSpacing="3"
                  >
                    ADICIONE SUA FOTO
                  </text>
                  <text
                    y="28"
                    fill="#9CA39E"
                    fontFamily="ui-monospace, monospace"
                    fontSize="19"
                    letterSpacing="1.5"
                  >
                    CÂMERA OU GALERIA ABAIXO
                  </text>
                </g>
              )}

              {/* Vinheta inferior suave */}
              <rect
                x="0"
                y="1460"
                width="1080"
                height="460"
                fill="url(#selyeStoryVig)"
              />

              {/* Bloco Minimalista Inferior Esquerdo (Base em y=1910 -> 10px da margem inferior) */}
              <g transform="translate(64, 1756)">
                {/* 1. Logo SELYE pequena pairando sobre todas as informações */}
                <g transform="translate(0, 0)" opacity="0.92">
                  <g
                    fill="none"
                    stroke="#F4F3EF"
                    strokeWidth="6.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="scale(0.24)"
                  >
                    {SELYE_WORD_PATHS.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </g>
                </g>

                {/* 2. Modalidade junto a Treino Concluído, Data e Hora */}
                <g transform="translate(0, 30)">
                  <g
                    transform="translate(0, 1) scale(0.60)"
                    stroke="#C7F000"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {modalityPaths.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </g>
                  <text
                    x="25"
                    y="14"
                    fill="#9CA39E"
                    fontFamily="ui-monospace, monospace"
                    fontSize="13.5"
                    fontWeight="700"
                    letterSpacing="2"
                  >
                    <tspan fill="#F4F3EF">{modalityLabel}</tspan> · TREINO
                    CONCLUÍDO · {dateTimeStr}
                  </text>
                </g>

                {/* 3. Título do Treino */}
                <text
                  x="0"
                  y="86"
                  fill="#F4F3EF"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontSize="40"
                  fontWeight="800"
                  letterSpacing="-0.8"
                >
                  {(customTitle || workoutTitle || "Treino Concluído").slice(
                    0,
                    34
                  )}
                </text>

                {/* 4. Diagramação Editorial Harmonizada: Tempo | Dias Ativos (a 10px da base) */}
                <g transform="translate(0, 154)">
                  <text
                    x="0"
                    y="0"
                    fill="#F4F3EF"
                    fontFamily="ui-monospace, monospace"
                    fontSize="56"
                    fontWeight="900"
                    letterSpacing="-2"
                  >
                    {safeDuration}
                    <tspan
                      fontSize="22"
                      fill="#C7F000"
                      fontWeight="800"
                      dx="6"
                      letterSpacing="0.5"
                    >
                      min
                    </tspan>
                  </text>

                  <line
                    x1={svgDividerX}
                    y1="-40"
                    x2={svgDividerX}
                    y2="-2"
                    stroke="#F4F3EF"
                    strokeOpacity="0.22"
                    strokeWidth="1.5"
                  />

                  <g transform={`translate(${svgDaysX}, 0)`}>
                    <text
                      x="0"
                      y="0"
                      fill="#F4F3EF"
                      fontFamily="ui-monospace, monospace"
                      fontSize="56"
                      fontWeight="900"
                      letterSpacing="-2"
                    >
                      {safeActiveDays}
                    </text>
                    <g transform={`translate(${svgStackOffset}, 0)`}>
                      <circle cx="5" cy="-27" r="3.5" fill="#C7F000" />
                      <text
                        x="15"
                        y="-22"
                        fill="#C7F000"
                        fontFamily="ui-monospace, monospace"
                        fontSize="13.5"
                        fontWeight="800"
                        letterSpacing="2"
                      >
                        DIAS
                      </text>
                      <text
                        x="1"
                        y="-4"
                        fill="#F4F3EF"
                        fontFamily="ui-monospace, monospace"
                        fontSize="13.5"
                        fontWeight="700"
                        letterSpacing="2"
                        opacity="0.88"
                      >
                        ATIVOS
                      </text>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </div>

          {/* Controles de Foto: Câmera, Galeria e Zoom */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn btn-ghost h-9 px-3 text-xs font-mono inline-flex items-center gap-1.5"
            >
              <Camera size={14} className="text-accent-text" />
              <span>Tirar Foto</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost h-9 px-3 text-xs font-mono inline-flex items-center gap-1.5"
            >
              <ImagePlus size={14} className="text-accent-text" />
              <span>Escolher da Galeria</span>
            </button>
            {photoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                title="Resetar enquadramento"
                className="btn btn-ghost h-9 px-2.5 text-xs font-mono"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>

          {photoDataUrl && (
            <div className="flex items-center gap-2.5 w-full max-w-[300px] px-2">
              <ZoomIn size={13} className="text-muted shrink-0" />
              <input
                type="range"
                min={1}
                max={2.4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom da foto"
                className="w-full accent-lima cursor-pointer"
              />
              <span className="text-[10px] font-mono text-muted w-9 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Edição rápida do título do treino na moldura */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="story-workout-title"
            className="text-[10px] font-mono uppercase text-muted font-semibold"
          >
            Título exibido na moldura
          </label>
          <input
            id="story-workout-title"
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            maxLength={36}
            className="input h-9 text-xs"
          />
        </div>

        {feedbackMsg && (
          <div
            role="status"
            className="rounded-xl border border-lima/45 bg-lima/12 px-3 py-2 text-xs font-medium text-foreground flex items-center gap-2"
          >
            <Check size={14} className="text-accent-text shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Botões de Exportação / Instagram */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-line">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="btn btn-ghost h-10 text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Download size={14} />
            <span>{isExporting ? "Gerando..." : "Baixar PNG (HD)"}</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleShareInstagram}
            className="btn btn-primary h-10 text-xs font-mono font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Share2 size={14} />
            <span>
              {isExporting ? "Preparando..." : "Postar no Instagram"}
            </span>
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
