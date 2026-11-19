import type { SignIn } from "@clerk/nextjs";

type Appearance = NonNullable<React.ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Tema único do Clerk alinhado à identidade Selye (Quiet Precision).
 * Utiliza tokens semânticos CSS para alto contraste nos temas claro (Osso) e escuro (Noite).
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#c7d977",
    borderRadius: "10px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    socialButtonsBlockButton:
      "h-11 rounded-[10px] border border-line bg-surface text-foreground hover:bg-foreground/5 transition-colors shadow-none",
    socialButtonsBlockButtonText: "font-medium text-sm text-foreground",
    dividerLine: "bg-line",
    dividerText: "text-muted text-xs font-mono uppercase tracking-wider",
    formFieldLabel: "text-xs font-mono uppercase tracking-wider text-muted",
    formFieldInput:
      "h-11 rounded-[10px] border border-line bg-surface text-foreground placeholder:text-muted shadow-none focus:border-profundo focus:ring-4 focus:ring-lima/35",
    formFieldInputShowPasswordButton: "text-muted hover:text-foreground",
    formFieldAction: "text-xs font-medium text-accent-text hover:underline",
    formButtonPrimary:
      "h-11 rounded-[10px] bg-lima text-grafite font-semibold text-sm shadow-none hover:bg-[#d4e48a] active:scale-[.98] transition",
    footerActionText: "text-muted text-xs",
    footerActionLink:
      "font-semibold text-foreground text-xs underline underline-offset-4 hover:text-accent-text",
    identityPreview: "border border-line bg-surface rounded-[10px]",
    identityPreviewText: "text-foreground text-sm",
    identityPreviewEditButton:
      "text-accent-text text-xs font-mono underline underline-offset-4",
    otpCodeFieldInput:
      "h-12 rounded-[10px] border border-line bg-surface text-foreground font-mono text-lg",
    formFieldErrorText: "text-xs text-red-500",
    alert: "rounded-[10px] border border-line bg-surface text-foreground",
    alertText: "text-xs",
    footer: "bg-transparent",
  },
};
