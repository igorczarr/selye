import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ExerciseSheetProvider } from "@/components/catalog/exercise-sheet";
import { selyeClerkPtBR } from "@/components/auth/clerk-localization-ptbr";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Selye — Gestão física pessoal",
  description: "Organizar. Registrar. Acompanhar.",
};

export const viewport: Viewport = {
  themeColor: "#202A27",
  width: "device-width",
  initialScale: 1,
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('selye-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider localization={selyeClerkPtBR}>
          <ExerciseSheetProvider>{children}</ExerciseSheetProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
