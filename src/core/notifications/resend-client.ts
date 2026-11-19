/**
 * Motor Transacional de E-mails e Notificações Multicanal do Selye (Resend API)
 * Domínio verificado: selye.vrtice.com.br
 *
 * Princípios Editoriais:
 * - Linguagem 100% acessível, clara, acolhedora e motivadora (tanto para leigos quanto atletas).
 * - Zero jargão técnico intimidador ou termos internos (nunca usa "ML", "ACWR bruto", etc.).
 * - Sempre focado em autonomia, prontidão corporal e equilíbrio ("Seu Corpo, Seu Ritmo").
 */

export type NotificationCategory =
  | "training"
  | "recovery"
  | "team"
  | "social"
  | "engagement";

export interface SelyeEmailTemplateInput {
  recipientName: string;
  category: NotificationCategory;
  badgeText?: string;
  headline: string;
  bodyParagraphs: string[];
  highlightBox?: {
    label: string;
    value: string;
    subtext?: string;
  };
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export interface SendResendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendResendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  skippedReason?: string;
}

const CATEGORY_META: Record<
  NotificationCategory,
  { badgePt: string; accentColor: string }
> = {
  training: {
    badgePt: "Treino & Movimento",
    accentColor: "#C7F000",
  },
  recovery: {
    badgePt: "Equilíbrio & Energia do Corpo",
    accentColor: "#2EE59D",
  },
  team: {
    badgePt: "Equipes & Orientação",
    accentColor: "#38BDF8",
  },
  social: {
    badgePt: "Comunidade & Desafios",
    accentColor: "#C7F000",
  },
  engagement: {
    badgePt: "Conquista & Constância",
    accentColor: "#F59E0B",
  },
};

export function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renderiza o template HTML editorial do Selye (Obsidiana #0D0F0E + Lima #C7F000 + Osso #F5F5F0)
 * projetado para máxima legibilidade em qualquer cliente de e-mail (Gmail, Apple Mail, Outlook).
 */
export function buildSelyeEmailHtml(input: SelyeEmailTemplateInput): {
  html: string;
  text: string;
} {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://selye.vrtice.com.br";
  const meta = CATEGORY_META[input.category] || CATEGORY_META.training;
  const badge = escapeHtml(input.badgeText || meta.badgePt);
  const firstName = escapeHtml(
    (input.recipientName || "Atleta").trim().split(/\s+/)[0] || "Atleta"
  );
  const headline = escapeHtml(input.headline);

  const resolvedCtaUrl = input.ctaUrl
    ? input.ctaUrl.startsWith("http")
      ? input.ctaUrl
      : `${appUrl}${input.ctaUrl.startsWith("/") ? "" : "/"}${input.ctaUrl}`
    : appUrl;

  const paragraphsHtml = input.bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#D8DCD8;">${escapeHtml(
          p
        )}</p>`
    )
    .join("");

  const highlightHtml = input.highlightBox
    ? `
      <div style="margin:20px 0;padding:18px 20px;background-color:#151917;border:1px solid #262C29;border-left:4px solid ${meta.accentColor};border-radius:12px;">
        <div style="font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9CA39F;margin-bottom:6px;">
          ${escapeHtml(input.highlightBox.label)}
        </div>
        <div style="font-size:20px;font-weight:700;color:#F5F5F0;line-height:1.3;">
          ${escapeHtml(input.highlightBox.value)}
        </div>
        ${
          input.highlightBox.subtext
            ? `<div style="font-size:13px;color:#A7B0AC;margin-top:6px;line-height:1.5;">${escapeHtml(
                input.highlightBox.subtext
              )}</div>`
            : ""
        }
      </div>
    `
    : "";

  const ctaHtml = input.ctaLabel
    ? `
      <div style="margin:26px 0 10px 0;">
        <a href="${escapeHtml(
          resolvedCtaUrl
        )}" style="display:inline-block;background-color:#C7F000;color:#0D0F0E;font-family:sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:10px;">
          ${escapeHtml(input.ctaLabel)} &rarr;
        </a>
      </div>
    `
    : "";

  const footerNote = escapeHtml(
    input.footerNote ||
      "O Selye acompanha o ritmo do seu corpo para que você evolua com saúde, clareza e constância — no seu tempo."
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#080A09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F5F5F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080A09;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#0D0F0E;border:1px solid #222825;border-radius:16px;overflow:hidden;">
          <!-- Top Header -->
          <tr>
            <td style="padding:24px 28px 16px 28px;border-bottom:1px solid #1C211E;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:800;letter-spacing:0.12em;color:#F5F5F0;">SELYE</span>
                    <span style="display:inline-block;width:7px;height:7px;border-radius:99px;background-color:#C7F000;margin-left:6px;vertical-align:middle;"></span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 10px;border-radius:99px;background-color:#171C19;border:1px solid #2A322D;font-family:monospace;font-size:11px;color:${meta.accentColor};">
                      ${badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#9CA39F;">
                Olá, <strong style="color:#F5F5F0;">${firstName}</strong>
              </p>
              <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.3;font-weight:700;color:#F5F5F0;">
                ${headline}
              </h1>

              ${paragraphsHtml}
              ${highlightHtml}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background-color:#0A0C0B;border-top:1px solid #1C211E;">
              <p style="margin:0 0 10px 0;font-size:12px;line-height:1.5;color:#858E8A;">
                ${footerNote}
              </p>
              <p style="margin:0;font-size:11px;color:#5E6662;">
                Enviado via <a href="${escapeHtml(
                  appUrl
                )}" style="color:#C7F000;text-decoration:none;">selye.vrtice.com.br</a> &middot; Gerencie seus alertas em <a href="${escapeHtml(
    `${appUrl}/integracoes`
  )}" style="color:#9CA39F;text-decoration:underline;">Preferências de Avisos</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `SELYE — ${input.badgeText || meta.badgePt}`,
    "",
    `Olá, ${firstName}!`,
    input.headline,
    "",
    ...input.bodyParagraphs,
    ...(input.highlightBox
      ? [
          "",
          `${input.highlightBox.label}: ${input.highlightBox.value}`,
          ...(input.highlightBox.subtext ? [input.highlightBox.subtext] : []),
        ]
      : []),
    ...(input.ctaLabel ? ["", `${input.ctaLabel}: ${resolvedCtaUrl}`] : []),
    "",
    "—",
    input.footerNote ||
      "O Selye acompanha o ritmo do seu corpo para que você evolua com saúde, clareza e constância.",
  ];

  return {
    html,
    text: textLines.join("\n"),
  };
}

/**
 * Envia um e-mail real através da API HTTP v1 da Resend usando o domínio selye.vrtice.com.br.
 */
export async function sendResendEmail(
  input: SendResendEmailInput
): Promise<SendResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || "";
  const domain = process.env.RESEND_FROM_DOMAIN || "selye.vrtice.com.br";
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || `Selye <avisos@${domain}>`;

  if (!apiKey) {
    return {
      ok: false,
      skippedReason: "RESEND_API_KEY não configurada.",
    };
  }

  const recipients = Array.isArray(input.to)
    ? input.to.filter((e) => e && e.includes("@"))
    : input.to && input.to.includes("@")
      ? [input.to]
      : [];

  if (recipients.length === 0) {
    return {
      ok: false,
      skippedReason: "Destinatário sem endereço de e-mail válido.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[Resend API] Falha no envio:", response.status, data);
      return {
        ok: false,
        error:
          data?.message ||
          data?.error ||
          `Erro HTTP ${response.status} ao enviar via Resend.`,
      };
    }

    return {
      ok: true,
      id: data?.id,
    };
  } catch (err: any) {
    console.error("[Resend API] Exceção de rede:", err);
    return {
      ok: false,
      error: err?.message || "Falha de conexão com a API da Resend.",
    };
  }
}
