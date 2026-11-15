import type { SignIn } from "@clerk/nextjs";

type Appearance = NonNullable<React.ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Tema ÃƒÂºnico do Clerk alinhado ÃƒÂ  identidade Selye.
 * Usa variÃƒÂ¡veis CSS do design system, entÃƒÂ£o funciona nos temas claro e escuro.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#202a27",
    borderRadius: "10px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    socialButtonsBlockButton:
      "h-11 border border-line bg-surface text-foreground hover:bg-foreground/5 transition-colors",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-line",
    dividerText: "text-muted text-xs",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldInput:
      "h-11 rounded-[10px] border border-line bg-surface text-foreground shadow-none focus:border-profundo focus:ring-4 focus:ring-lima/40",
    formButtonPrimary:
      "h-11 rounded-[10px] bg-lima text-grafite font-semibold shadow-none hover:bg-[#d4e48a] active:scale-[.98] transition",
    footerActionText: "text-muted",
    footerActionLink: "font-semibold text-foreground underline underline-offset-4 hover:text-profundo",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-foreground underline underline-offset-4",
    formFieldErrorText: "text-sm",
    alertText: "text-sm",
    footer: "bg-transparent",
  },
};
