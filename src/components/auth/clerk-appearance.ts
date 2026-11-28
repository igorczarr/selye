import type { SignIn } from "@clerk/nextjs";

type Appearance = NonNullable<React.ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Aparência unificada do Clerk para a caixa central Selye.
 * Remove sombras/bordas duplicadas do widget nativo e delega a superfície
 * arquitetônica ao `.selye-auth-card` em `globals.css`.
 */
export const clerkAppearance: Appearance = {
  options: {
    elevation: "flush",
    logoPlacement: "none",
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    shimmer: false,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#18221f",
    borderRadius: "12px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "14px",
  },
  elements: {
    rootBox: "!w-full !max-w-none",
    cardBox:
      "!w-full !max-w-none !shadow-none !border-0 !bg-transparent !rounded-none !m-0",
    card: "!w-full !max-w-none !border-0 !bg-transparent !p-0 !m-0 !shadow-none !rounded-none !gap-5",
    logoBox: "!hidden",
    header: "!items-center !text-center !gap-1.5 !p-0",
    headerTitle:
      "!font-display !text-[21px] !font-bold !tracking-[-0.026em] !text-foreground !leading-tight",
    headerSubtitle:
      "!text-[13.5px] !font-normal !text-muted !leading-relaxed",
    main: "!gap-4",
    socialButtons: "!gap-2.5",
    socialButtonsBlockButton:
      "!h-11 !rounded-[12px] !border !border-line !bg-surface !text-foreground !shadow-none hover:!bg-foreground/[0.04] active:!scale-[0.99] !transition-all",
    socialButtonsBlockButtonText: "!font-medium !text-[13.5px] !text-foreground",
    dividerRow: "!my-0.5",
    dividerLine: "!bg-line",
    dividerText:
      "!text-muted !text-[11px] !font-mono !uppercase !tracking-[0.12em] !px-3",
    form: "!gap-4",
    formFieldRow: "!gap-3",
    formFieldLabelRow: "!mb-1.5",
    formFieldLabel:
      "!text-[13px] !font-medium !tracking-[-0.005em] !normal-case !text-foreground",
    formFieldInput:
      "!h-11 !rounded-[12px] !border !border-line !bg-surface !px-3.5 !text-[14px] !text-foreground placeholder:!text-muted/75 !shadow-none",
    formFieldInputShowPasswordButton:
      "!text-muted hover:!text-foreground !mr-1",
    formFieldAction:
      "!text-[12.5px] !font-medium !text-muted hover:!text-foreground hover:!underline !underline-offset-4",
    formButtonPrimary:
      "selye-clerk-primary-btn !h-11 !rounded-[12px] !font-semibold !text-[14px] !tracking-[-0.01em] !transition-all active:!scale-[0.985]",
    identityPreview:
      "!border !border-line !bg-surface-1/60 !rounded-[12px] !px-3.5 !py-2.5",
    identityPreviewText: "!text-foreground !text-[13.5px] !font-medium",
    identityPreviewEditButton:
      "!text-accent-text !text-xs !font-medium !underline !underline-offset-4",
    otpCodeFieldInputs: "!gap-2",
    otpCodeFieldInput:
      "!h-12 !rounded-[12px] !border !border-line !bg-surface !text-foreground !font-mono !text-lg !font-semibold",
    formResendCodeLink:
      "!text-accent-text !text-xs !font-semibold !underline !underline-offset-4",
    backLink:
      "!text-muted hover:!text-foreground !text-[13px] !font-medium",
    footerAction: "!hidden",
    footer: "!hidden",
    formFieldErrorText: "!text-xs !text-red-500 !mt-1.5",
    alert:
      "!rounded-[12px] !border !border-red-500/25 !bg-red-500/[0.06] !text-foreground !p-3",
    alertText: "!text-xs !leading-relaxed",
  },
};
