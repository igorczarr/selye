"use server";

import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getOrCreateDemoUser, getDashboardData } from "./workout";
import type { RescheduleProposal } from "@/core/performance/weekly-rescheduler";
import {
  sendResendEmail,
  type NotificationCategory,
} from "@/core/notifications/resend-client";
import {
  buildNotificationEventPayload,
  renderEventEmail,
  type SelyeNotificationEventType,
} from "@/core/notifications/notification-templates";
import type { ProactivePlanAlert } from "@/core/planning/daily-plan-coach";
import { buildCoachAlerts, type CoachAlert } from "@/core/notifications/coach-alerts";

export interface StoredNotificationRecord {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferenceRecord {
  category: NotificationCategory;
  labelPt: string;
  descriptionPt: string;
  channelInApp: boolean;
  channelEmail: boolean;
}

export interface SmartNotificationFeed {
  proposals: RescheduleProposal[];
  notifications: StoredNotificationRecord[];
  unreadCount: number;
  morningCheckinPending: boolean;
  planAlert: ProactivePlanAlert | null;
  coachAlerts: CoachAlert[];
}

const DEFAULT_PREFERENCE_CATALOG: {
  category: NotificationCategory;
  labelPt: string;
  descriptionPt: string;
  defaultInApp: boolean;
  defaultEmail: boolean;
}[] = [
  {
    category: "training",
    labelPt: "Treinos, Atividades & Agenda",
    descriptionPt:
      "Confirmações de treino concluído, atividades livres, ajustes de agenda e sincronizações.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    category: "recovery",
    labelPt: "Equilíbrio, Check-in & Recuperação",
    descriptionPt:
      "Sua Decisão do Dia após o check-in matinal, recargas de energia e Escudo de Recuperação.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    category: "engagement",
    labelPt: "Conquistas & Marcos de Constância",
    descriptionPt:
      "Novos troféus desbloqueados, recordes de sequência semanal e boas-vindas.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    category: "social",
    labelPt: "Comunidade, Amigos & Desafios",
    descriptionPt:
      "Novos seguidores, comentários em seus treinos e convites/atualizações de desafios.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    category: "team",
    labelPt: "Equipes & Prescrições do Treinador",
    descriptionPt:
      "Atualizações de fichas enviadas pelo seu treinador e comunicados da sua equipe.",
    defaultInApp: true,
    defaultEmail: true,
  },
];

/**
 * Garante que o usuário possua preferências inicializadas para todas as 5 categorias.
 * Por padrão, tanto o Sininho (In-App) quanto o E-mail (Resend) ficam ativos para manter
 * o atleta informado de tudo.
 */
export async function getUserNotificationPreferences(
  targetUserId?: string
): Promise<NotificationPreferenceRecord[]> {
  let userId = targetUserId;
  if (!userId) {
    const user = await getOrCreateDemoUser();
    userId = user.id;
  }

  const existing = await db
    .select()
    .from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.userId, userId));

  const mapByCat = new Map(existing.map((r) => [r.category, r]));
  const result: NotificationPreferenceRecord[] = [];

  for (const item of DEFAULT_PREFERENCE_CATALOG) {
    const row = mapByCat.get(item.category);
    if (!row) {
      try {
        await db.insert(schema.notificationPreferences).values({
          userId,
          category: item.category,
          channelInApp: item.defaultInApp,
          channelPush: true,
          channelEmail: item.defaultEmail,
        });
      } catch {
        // Ignora corrida concorrente
      }
      result.push({
        category: item.category,
        labelPt: item.labelPt,
        descriptionPt: item.descriptionPt,
        channelInApp: item.defaultInApp,
        channelEmail: item.defaultEmail,
      });
    } else {
      result.push({
        category: item.category,
        labelPt: item.labelPt,
        descriptionPt: item.descriptionPt,
        channelInApp: row.channelInApp,
        channelEmail: row.channelEmail,
      });
    }
  }

  return result;
}

/**
 * Atualiza a preferência de um canal (In-App ou E-mail via Resend) de uma categoria.
 */
export async function updateNotificationPreference(input: {
  category: NotificationCategory;
  channelInApp?: boolean;
  channelEmail?: boolean;
}) {
  const user = await getOrCreateDemoUser();

  const [existing] = await db
    .select()
    .from(schema.notificationPreferences)
    .where(
      and(
        eq(schema.notificationPreferences.userId, user.id),
        eq(schema.notificationPreferences.category, input.category)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.notificationPreferences)
      .set({
        channelInApp:
          typeof input.channelInApp === "boolean"
            ? input.channelInApp
            : existing.channelInApp,
        channelEmail:
          typeof input.channelEmail === "boolean"
            ? input.channelEmail
            : existing.channelEmail,
        updatedAt: new Date(),
      })
      .where(eq(schema.notificationPreferences.id, existing.id));
  } else {
    await db.insert(schema.notificationPreferences).values({
      userId: user.id,
      category: input.category,
      channelInApp: input.channelInApp ?? true,
      channelPush: true,
      channelEmail: input.channelEmail ?? true,
    });
  }

  revalidatePath("/integracoes");
  revalidatePath("/perfil");
  return { ok: true };
}

/**
 * Dispara uma notificação inteligente para um usuário:
 * 1. Salva no banco (`notifications`) para exibição imediata no Sininho da Top Bar.
 * 2. Se o canal de e-mail estiver ativo para a categoria (ou `forceEmail = true`),
 *    envia o e-mail transacional via Resend (`selye.vrtice.com.br`).
 */
export async function dispatchSmartNotification(input: {
  recipientUserId?: string;
  eventType: SelyeNotificationEventType;
  params?: {
    title?: string;
    modalityLabel?: string;
    durationMinutes?: number;
    loadEa?: number;
    rechargeEa?: number;
    readinessScore?: number;
    decisionStatus?: "green_push" | "yellow_modulate" | "red_recover";
    decisionHeadline?: string;
    achievementTitle?: string;
    achievementDescription?: string;
    actorName?: string;
    actorUsername?: string;
    challengeTitle?: string;
    programTitle?: string;
    importedCount?: number;
    actionUrl?: string;
    customNotes?: string;
  };
  forceEmail?: boolean;
}) {
  try {
    let targetUser: { id: string; name: string; email: string } | null = null;

    if (input.recipientUserId) {
      const [found] = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(eq(schema.users.id, input.recipientUserId))
        .limit(1);
      if (found) targetUser = found;
    }

    if (!targetUser) {
      const demo = await getOrCreateDemoUser();
      targetUser = {
        id: demo.id,
        name: demo.name,
        email: demo.email,
      };
    }

    const prefs = await getUserNotificationPreferences(targetUser.id);
    const built = buildNotificationEventPayload(input.eventType, {
      recipientName: targetUser.name || "Atleta",
      ...(input.params || {}),
    });

    const catPref = prefs.find((p) => p.category === built.category);
    const allowInApp = catPref ? catPref.channelInApp : true;
    const allowEmail =
      input.forceEmail ||
      (catPref
        ? catPref.channelEmail && built.shouldSendEmailByDefault
        : built.shouldSendEmailByDefault);

    let notificationId: string | undefined;

    if (allowInApp) {
      const [inserted] = await db
        .insert(schema.notifications)
        .values({
          userId: targetUser.id,
          category: built.category,
          title: built.title,
          body: built.body,
          actionUrl: built.actionUrl,
          isRead: false,
        })
        .returning({ id: schema.notifications.id });
      notificationId = inserted?.id;
    }

    let emailResult: { ok: boolean; id?: string; error?: string } | null = null;
    let resolvedEmail = targetUser.email;
    if (!input.recipientUserId) {
      try {
        const clerk = await currentUser();
        const clerkEmail = clerk?.primaryEmailAddress?.emailAddress;
        if (clerkEmail && clerkEmail.includes("@")) {
          resolvedEmail = clerkEmail;
        }
      } catch {
        // fora de sessão Clerk
      }
    }

    if (allowEmail && resolvedEmail) {
      const rendered = renderEventEmail(built);
      emailResult = await sendResendEmail({
        to: resolvedEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }

    return {
      ok: true,
      notificationId,
      emailResult,
    };
  } catch (err) {
    console.error("[dispatchSmartNotification] Erro ao processar aviso:", err);
    return {
      ok: false,
    };
  }
}

/**
 * Carrega o feed completo do Sininho de Notificações:
 * - Propostas ativas de reagendamento da semana (ação em 1 toque).
 * - Avisos e mensagens persistidos no banco (`notifications`).
 * - Dispara automaticamente o e-mail de Boas-Vindas (no 1º acesso) e o Panorama Diário (1× por dia) via Resend.
 */
export async function getSmartNotificationFeed(): Promise<SmartNotificationFeed> {
  try {
    await connection();
  } catch {
    // Fora de requisição HTTP
  }

  try {
    const data = await getDashboardData();
    const user = data.user;
    const proposals = data.performanceSummary?.rescheduleProposals || [];
    const morningCheckinPending = !data.performanceSummary?.todayCheckin;

    let rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(25);

    const todayStr = new Date().toISOString().split("T")[0];
    const todayBr = new Date(`${todayStr}T12:00:00Z`).toLocaleDateString(
      "pt-BR",
      { day: "2-digit", month: "2-digit" }
    );

    if (rows.length === 0) {
      const welcome = buildNotificationEventPayload("welcome_onboarding", {
        recipientName: user.name || "Atleta",
      });
      const [created] = await db
        .insert(schema.notifications)
        .values({
          userId: user.id,
          category: welcome.category,
          title: welcome.title,
          body: welcome.body,
          actionUrl: welcome.actionUrl,
          isRead: false,
        })
        .returning();
      if (created) {
        rows = [created];
      }
      if (user.email) {
        const rendered = renderEventEmail(welcome);
        await sendResendEmail({
          to: user.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }).catch(() => {});
      }
    }

    // Disparo automático do Panorama Diário (1× por dia) via Resend se ainda não enviado hoje
    const dailyMarker = `Panorama do Dia (${todayBr})`;
    const alreadySentToday = rows.some((r) => r.title.includes(dailyMarker));
    if (!alreadySentToday && user.email) {
      const prefs = await getUserNotificationPreferences(user.id);
      const recPref = prefs.find((p) => p.category === "recovery");
      if (!recPref || recPref.channelEmail) {
        const decision = data.performanceSummary.dailyDecision;
        const adaptive = data.performanceSummary.adaptiveProfile;
        const dailyPayload = buildNotificationEventPayload("morning_checkin_done", {
          recipientName: user.name || "Atleta",
          readinessScore: decision.readinessScore,
          decisionHeadline: `${decision.headline} · Reserva: ${adaptive.availableReserveEa} EA`,
        });
        const rendered = renderEventEmail(dailyPayload);
        const sendRes = await sendResendEmail({
          to: user.email,
          subject: `☀️ ${dailyMarker} · Sua disposição no Selye (${decision.readinessScore}/100)`,
          html: rendered.html,
          text: rendered.text,
        }).catch(() => ({ ok: false }));

        if (sendRes.ok) {
          const [dailyNotif] = await db
            .insert(schema.notifications)
            .values({
              userId: user.id,
              category: "recovery",
              title: `${dailyMarker} enviado para ${user.email}`,
              body: `Reserva livre: ${adaptive.availableReserveEa} EA (${adaptive.reservePercent}%). ${decision.headline}.`,
              actionUrl: "/calendario",
              isRead: false,
            })
            .returning();
          if (dailyNotif) {
            rows = [dailyNotif, ...rows];
          }
        }
      }
    }

    const notifications: StoredNotificationRecord[] = rows.map((r) => ({
      id: r.id,
      category: (r.category as NotificationCategory) || "training",
      title: r.title,
      body: r.body,
      actionUrl: r.actionUrl,
      isRead: r.isRead,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    let planAlert: ProactivePlanAlert | null = null;
    try {
      const { getActivePlanningSnapshot } = await import("./planning");
      const planSnap = await getActivePlanningSnapshot();
      planAlert = planSnap.dailyCoach.proactiveAlert;
    } catch {
      planAlert = null;
    }

    let coachAlerts: CoachAlert[] = [];
    try {
      const { getEvolutionData } = await import("./evolution");
      const evo = await getEvolutionData();
      const dash = evo.modalityKpiDashboard;
      if (dash) {
        coachAlerts = buildCoachAlerts({
          modalityShortNamePt: dash.modalityShortNamePt,
          onTrack: dash.onTrack,
          guardrailWarnings: dash.guardrailWarnings,
          casualSessionsLast7d: dash.casualSessionsLast7d,
        });
      }
    } catch {
      coachAlerts = [];
    }

    const unreadDbCount = notifications.filter((n) => !n.isRead).length;
    const unreadCount =
      unreadDbCount +
      proposals.length +
      (morningCheckinPending ? 1 : 0) +
      (planAlert ? 1 : 0) +
      coachAlerts.filter((a) => a.priority !== "info").length;

    return {
      proposals,
      notifications,
      unreadCount,
      morningCheckinPending,
      planAlert,
      coachAlerts,
    };
  } catch (err) {
    console.error("[getSmartNotificationFeed] Erro:", err);
    return {
      proposals: [],
      notifications: [],
      unreadCount: 0,
      morningCheckinPending: false,
      planAlert: null,
      coachAlerts: [],
    };
  }
}

/**
 * Compatibilidade retroativa para chamadas que esperam apenas RescheduleProposal[]
 */
export async function getSmartNotifications(): Promise<RescheduleProposal[]> {
  const feed = await getSmartNotificationFeed();
  return feed.proposals;
}

/**
 * Marca uma notificação específica como lida.
 */
export async function markNotificationAsRead(notificationId: string) {
  const user = await getOrCreateDemoUser();
  await db
    .update(schema.notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, user.id)
      )
    );
  return { ok: true };
}

/**
 * Marca todos os avisos do usuário como lidos.
 */
export async function markAllNotificationsAsRead() {
  const user = await getOrCreateDemoUser();
  await db
    .update(schema.notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.isRead, false)
      )
    );
  return { ok: true };
}

/**
 * Envia um resumo personalizado e teste real via Resend (`selye.vrtice.com.br`) para o e-mail do usuário
 * (ou endereço informado) e registra no Sininho.
 */
export async function sendTestOrDigestEmail(customEmail?: string) {
  const data = await getDashboardData();
  const user = data.user;
  const targetEmail = (customEmail || user.email || "").trim();

  if (!targetEmail || !targetEmail.includes("@")) {
    return {
      ok: false,
      error: "Informe um endereço de e-mail válido para o envio.",
    };
  }

  const decision = data.performanceSummary.dailyDecision;
  const budget = data.performanceSummary.recoveryBudget;

  const built = buildNotificationEventPayload("morning_checkin_done", {
    recipientName: user.name || "Atleta",
    readinessScore: decision.readinessScore,
    decisionHeadline: `${decision.headline} · Reserva disponível: ${budget.weeklyRemainingUa} EA`,
  });

  const rendered = renderEventEmail(built);
  const res = await sendResendEmail({
    to: targetEmail,
    subject: `⚡ Seu Panorama do Dia no Selye (${decision.readinessScore}/100)`,
    html: rendered.html,
    text: rendered.text,
  });

  await db.insert(schema.notifications).values({
    userId: user.id,
    category: "recovery",
    title: res.ok
      ? `Resumo enviado por e-mail para ${targetEmail}`
      : `Aviso salvo no painel (${decision.headline})`,
    body: res.ok
      ? `Enviamos seu panorama de prontidão (${decision.readinessScore}/100) e equilíbrio semanal pelo domínio selye.vrtice.com.br.`
      : `Seu panorama de prontidão de hoje está em ${decision.readinessScore}/100 (${decision.headline}).`,
    actionUrl: "/",
    isRead: false,
  });

  revalidatePath("/");
  revalidatePath("/integracoes");

  return {
    ok: res.ok,
    emailId: res.id,
    targetEmail,
    error: res.error,
  };
}
