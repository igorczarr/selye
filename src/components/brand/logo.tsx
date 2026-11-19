import type { SVGProps } from "react";

/** Geometria oficial do manual — não redesenhar, esticar ou recolorir o ponto. */
const SYMBOL_PATHS = [
  "M75 21 C63 12 42 12 29 21 C15 31 16 45 31 51 C37 54 43 55 46 56",
  "M55 56 C62 58 70 61 76 66 C86 75 82 88 71 94 C57 102 36 98 23 86",
];
const WORD_PATHS = [
  "M49 10 C42 4 31 3 21 5 C8 8 3 16 7 26 C10 33 21 36 33 40 C46 44 50 53 45 61 C40 69 25 71 12 67 C8 66 5 64 2 62",
  "M105 7 H73 V66 H106 M73 36 H99",
  "M133 7 V66 H169",
  "M194 7 L216 35 L239 7 M216 35 V66",
  "M296 7 H264 V66 H297 M264 36 H290",
];

const LIMA = "#C7D977";

/** Símbolo: trajetória em S + ponto de registro (lima fixo). Mínimo 24 px. */
export function SelyeSymbol({
  size = 28,
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="12 8 78 96"
      width={Math.round((size * 78) / 96)}
      height={size}
      role="img"
      aria-label="Selye"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={7.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SYMBOL_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx={50.5} cy={55.5} r={5.5} fill={LIMA} stroke="none" />
      </g>
    </svg>
  );
}

/** Alias semântico para o símbolo compacto da marca (28 px padrão). */
export const SelyeMark = SelyeSymbol;

/** Wordmark isolado (SELYE) sem o símbolo lateral. */
export function SelyeWordmark({
  height = 18,
  ...props
}: { height?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="-2 0 304 74"
      height={height}
      width={Math.round((height * 304) / 74)}
      role="img"
      aria-label="Selye"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={5.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {WORD_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Logotipo horizontal oficial (símbolo + SELYE) com viewBox calibrado sem corte inferior. */
export function SelyeLogo({
  height = 20,
  ...props
}: { height?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="10 8 616 128"
      height={height}
      width={Math.round((height * 616) / 128)}
      role="img"
      aria-label="Selye"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={7.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 16)"
      >
        {SYMBOL_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx={50.5} cy={55.5} r={5.5} fill={LIMA} stroke="none" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={5.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(124 12) scale(1.65)"
      >
        {WORD_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
