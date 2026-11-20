"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  ArrowLeftRight,
  SlidersHorizontal,
  CalendarClock,
  BellRing,
  X,
  ChevronRight,
  Award,
  HeartPulse,
  Users,
  Dumbbell,
  Sun,
  Mail,
  CalendarDays,
} from "lucide-react";
import { applySmartRescheduleAction } from "@/actions/routines";
import {
  getSmartNotificationFeed,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendTestOrDigestEmail,
  type StoredNotificationRecord,
} from "@/actions/notifications";
import type { RescheduleProposal } from "@/core/performance/weekly-rescheduler";
import type { ProactivePlanAlert } from "@/core/planning/daily-plan-coach";
import type { CoachAlert } from "@/core/notifications/coach-alerts";
import Link from "next/link";

function formatRelativeTimePt(isoStr: string): string {
  try {
    const diffSec = Math.max(
      0,
      Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
    );
    if (diffSec < 60) return "Agora mesmo";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Ontem";
    return `há ${diffDays} dias`;
  } catch {
    return "Recente";
  }
}

export function NotificationBell({
  proposals: initialProposals = [],
}: {
  proposals?: RescheduleProposal[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [proposals, setProposals] =
    useState<RescheduleProposal[]>(initialProposals);
  const [storedList, setStoredList] = useState<StoredNotificationRecord[]>([]);
  const [morningCheckinPending, setMorningCheckinPending] = useState(false);
  const [planAlert, setPlanAlert] = useState<ProactivePlanAlert | null>(null);
  const [coachAlerts, setCoachAlerts] = useState<CoachAlert[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFeed = () => {
    getSmartNotificationFeed()
      .then((feed) => {
        setProposals(feed.proposals);
        setStoredList(feed.notifications);
        setMorningCheckinPending(feed.morningCheckinPending);
        setPlanAlert(feed.planAlert || null);
        setCoachAlerts(feed.coachAlerts || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    if (open) {
      loadFeed();
    }
  }, [open]);

  // Fechar dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeProposals = proposals.filter((p) => !dismissedIds[p.id]);
  const unreadStored = storedList.filter((n) => !n.isRead);
  const visibleStored =
    activeTab === "unread" ? unreadStored : storedList;

  const activePlanAlert =
    planAlert && !dismissedIds[planAlert.id] ? planAlert : null;
  const activeCoachAlerts = coachAlerts.filter((a) => !dismissedIds[a.id]);
  const urgentCoachAlerts = activeCoachAlerts.filter((a) => a.priority === "now");
  const planCoachAlerts = activeCoachAlerts.filter((a) => a.priority === "plan");
  const infoCoachAlerts = activeCoachAlerts.filter((a) => a.priority === "info");

  const badgeCount =
    activeProposals.length +
    unreadStored.length +
    (morningCheckinPending && !dismissedIds["morning_checkin_prompt"] ? 1 : 0) +
    (activePlanAlert ? 1 : 0) +
    urgentCoachAlerts.length +
    planCoachAlerts.length;

  const renderCoachAlert = (a: CoachAlert) => (
    <div
      key={a.id}
      className={`rounded-xl border p-3 flex flex-col gap-1.5 ${
        a.priority === "now"
          ? "border-[#e0b354]/60 bg-[#e0b354]/10"
          : a.priority === "plan"
            ? "border-lima/40 bg-foreground/[0.03]"
            : "border-line bg-foreground/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-text">
          {a.badgePt}
        </span>
        <button
          type="button"
          onClick={() => handleDismiss(a.id)}
          title="Ocultar aviso"
          className="text-muted hover:text-foreground p-0.5 cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
      <h4 className="text-xs font-semibold text-foreground leading-snug">
        {a.titlePt}
      </h4>
      <p className="text-[11px] text-muted leading-relaxed">{a.bodyPt}</p>
      <div className="pt-1 flex justify-end">
        <Link
          href={a.ctaHref}
          onClick={() => setOpen(false)}
          className="btn btn-primary h-7 px-3 text-[11px] font-mono font-semibold"
        >
          {a.ctaLabelPt}
        </Link>
      </div>
    </div>
  );

  const sectionTitle = (text: string) => (
    <span className="text-[10px] font-mono uppercase tracking-wider text-muted px-0.5 pt-1">
      {text}
    </span>
  );

  const handleApplyProposal = (prop: RescheduleProposal) => {
    startTransition(async () => {
      await applySmartRescheduleAction({
        actionType: prop.actionType,
        targetProgramId: prop.targetProgramId,
        toJsDay: prop.toJsDay,
        swapWithProgramId: prop.swapWithProgramId,
      });
      setDismissedIds((prev) => ({ ...prev, [prop.id]: true }));
      setAppliedStatus(
        `Ajuste aplicado em "${prop.targetProgramTitle}". Sua semana foi reorganizada.`
      );
      loadFeed();
      router.refresh();
      setTimeout(() => setAppliedStatus(null), 4000);
    });
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleMarkRead = (id: string, actionUrl?: string | null) => {
    setStoredList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    startTransition(async () => {
      await markNotificationAsRead(id);
      if (actionUrl) {
        setOpen(false);
        router.push(actionUrl);
      }
    });
  };

  const handleMarkAllRead = () => {
    setStoredList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  const handleSendDigestEmail = () => {
    startTransition(async () => {
      const res = await sendTestOrDigestEmail();
      if (res.ok) {
        setAppliedStatus(
          `Panorama enviado por e-mail para ${res.targetEmail} (via selye.vrtice.com.br).`
        );
      } else {
        setAppliedStatus(
          res.error || "Resumo salvo no seu histórico de avisos."
        );
      }
      loadFeed();
      setTimeout(() => setAppliedStatus(null), 4500);
    });
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "recovery":
        return <HeartPulse size={13} />;
      case "engagement":
        return <Award size={13} />;
      case "social":
      case "team":
        return <Users size={13} />;
      case "training":
      default:
        return <Dumbbell size={13} />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "recovery":
        return "Equilíbrio & Corpo";
      case "engagement":
        return "Conquista";
      case "social":
        return "Comunidade";
      case "team":
        return "Equipe & Treinador";
      case "training":
      default:
        return "Treino & Rotina";
    }
  };

  return (
    <div ref={containerRef} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações e avisos inteligentes ${
          badgeCount > 0 ? `(${badgeCount} novas)` : ""
        }`}
        aria-expanded={open}
        className="relative h-9 w-9 rounded-lg border border-line bg-surface hover:bg-foreground/5 flex items-center justify-center text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
      >
        <Bell size={16} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-lima text-grafite font-mono font-bold text-[9px] leading-none ring-2 ring-surface">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 max-h-[calc(100dvh-5rem)] overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[410px] bg-surface border border-line rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col gap-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-lima/15 text-accent-text">
                <BellRing size={14} />
              </span>
              <div>
                <h3 className="t-h3 leading-tight">Avisos e Recomendações</h3>
                <p className="t-aux !text-[11px] !text-muted">
                  O Selye acompanha seu ritmo e mantém você informado
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {unreadStored.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Marcar todos como lidos"
                  className="h-7 px-2 rounded-lg text-[10px] font-mono text-muted hover:text-foreground hover:bg-foreground/5 flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={12} />
                  <span className="hidden sm:inline">Ler tudo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar avisos"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filtros Rápidos + Envio de Resumo por E-mail */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Todos ({activeProposals.length + storedList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Não lidos ({badgeCount})
              </button>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleSendDigestEmail}
              title="Receber panorama de hoje no seu e-mail via selye.vrtice.com.br"
              className="h-7 px-2.5 rounded-lg border border-line bg-foreground/[0.02] hover:bg-foreground/5 text-[10px] font-mono text-accent-text flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Mail size={11} />
              <span>Enviar p/ E-mail</span>
            </button>
          </div>

          {appliedStatus && (
            <div className="rounded-xl border border-profundo bg-lima/20 px-3 py-2 text-xs text-foreground flex items-center gap-2">
              <Check size={14} className="text-accent-text shrink-0" />
              <span>{appliedStatus}</span>
            </div>
          )}

          {/* Lista de Avisos */}
          <div className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            {/* 0. Avisos do Treinador: urgentes primeiro, citando sua modalidade e meta */}
            {urgentCoachAlerts.length > 0 && sectionTitle("Para agora")}
            {urgentCoachAlerts.map(renderCoachAlert)}

            {/* 1. Lembrete Suave do Check-in Matinal (se ainda não fez hoje) */}
            {morningCheckinPending &&
              !dismissedIds["morning_checkin_prompt"] && (
                <div className="rounded-xl border border-lima/50 bg-lima/10 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-lima text-grafite">
                        <Sun size={12} />
                      </span>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-text">
                        Sintonia do Dia
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismiss("morning_checkin_prompt")}
                      title="Ocultar lembrete"
                      className="text-muted hover:text-foreground text-xs p-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground leading-snug">
                    Como você acordou hoje?
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Responda 4 perguntas rápidas sobre seu sono e disposição para o Selye calibrar sua recomendação de hoje.
                  </p>
                  <div className="pt-1 flex justify-end">
                    <Link
                      href="/"
                      onClick={() => setOpen(false)}
                      className="btn btn-primary h-7 px-3 text-[11px] font-mono font-semibold"
                    >
                      Fazer Check-in Agora
                    </Link>
                  </div>
                </div>
              )}

            {/* 1.5 Aviso Proativo do Calendário Energético (Fase do Ciclo / Polimento / Passos do Dia) */}
            {activePlanAlert && (
              <div
                className={`rounded-xl border p-3 flex flex-col gap-2 ${
                  activePlanAlert.priority === "high"
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : "border-line bg-foreground/[0.03]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-lima/20 text-accent-text">
                      <CalendarDays size={12} />
                    </span>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-text">
                      {activePlanAlert.badgePt}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(activePlanAlert.id)}
                    title="Ocultar aviso"
                    className="text-muted hover:text-foreground text-xs p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
                <h4 className="text-xs font-semibold text-foreground leading-snug">
                  {activePlanAlert.titlePt}
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  {activePlanAlert.bodyPt}
                </p>
                <div className="pt-1 flex justify-end">
                  <Link
                    href={activePlanAlert.ctaHref}
                    onClick={() => setOpen(false)}
                    className="btn btn-primary h-7 px-3 text-[11px] font-mono font-semibold"
                  >
                    {activePlanAlert.ctaLabelPt}
                  </Link>
                </div>
              </div>
            )}

            {/* 2. Propostas de Reagendamento Inteligente (Ação em 1 Toque) */}
            {activeProposals.map((prop) => {
              const ActionIcon =
                prop.actionType === "swap_days"
                  ? ArrowLeftRight
                  : prop.actionType === "deload_volume"
                    ? SlidersHorizontal
                    : CalendarClock;

              return (
                <div
                  key={prop.id}
                  className="rounded-xl border border-lima/40 bg-foreground/[0.03] p-3 flex flex-col gap-2 hover:border-lima/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-lima/15 text-accent-text">
                        <ActionIcon size={12} />
                      </span>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-text">
                        Sugestão de Agenda
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismiss(prop.id)}
                      title="Dispensar sugestão"
                      className="text-muted hover:text-foreground text-xs p-1 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-foreground leading-snug">
                    {prop.title}
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {prop.whyExplanation}
                  </p>

                  <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-line/60">
                    <span className="text-[10px] font-mono text-muted">
                      Ajuste em 1 toque
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleApplyProposal(prop)}
                      className="btn btn-primary h-7 px-3 text-[11px] font-mono font-semibold"
                    >
                      {isPending ? "Aplicando..." : prop.actionButtonLabel}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 3. Histórico de Notificações do Usuário */}
            {(planCoachAlerts.length > 0 || infoCoachAlerts.length > 0) &&
              sectionTitle("Sua meta e seu plano")}
            {planCoachAlerts.map(renderCoachAlert)}
            {infoCoachAlerts.map(renderCoachAlert)}

            {visibleStored.length > 0 && sectionTitle("Histórico")}
            {visibleStored.slice(0, visibleCount).map((item) => (
              <div
                key={item.id}
                onClick={() => handleMarkRead(item.id, item.actionUrl)}
                className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-colors cursor-pointer ${
                  item.isRead
                    ? "border-line bg-foreground/[0.01] opacity-80 hover:opacity-100"
                    : "border-profundo/50 bg-lima/[0.06] hover:border-lima/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`p-1 rounded ${
                        item.isRead
                          ? "bg-foreground/10 text-muted"
                          : "bg-lima/20 text-accent-text"
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                      {getCategoryLabel(item.category)}
                    </span>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-lima inline-block" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted">
                    {formatRelativeTimePt(item.createdAt)}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-foreground leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}

            {visibleStored.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 5)}
                className="h-8 rounded-lg border border-line text-[11px] font-mono text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
              >
                Ver mais ({visibleStored.length - visibleCount})
              </button>
            )}

            {activeProposals.length === 0 &&
              visibleStored.length === 0 &&
              activeCoachAlerts.length === 0 &&
              !morningCheckinPending && (
                <div className="py-6 px-3 text-center flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center text-muted">
                    <Bell size={16} />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    Tudo em dia por aqui!
                  </p>
                  <p className="text-[11px] text-muted max-w-[250px]">
                    Seus treinos, descanso e reserva do corpo estão em equilíbrio. Avisaremos sempre que houver uma novidade.
                  </p>
                </div>
              )}
          </div>

          {/* Rodapé */}
          <div className="pt-2 border-t border-line flex items-center justify-between text-[11px]">
            <Link
              href="/integracoes"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-foreground flex items-center gap-1"
            >
              <span>Configurar alertas por e-mail</span>
              <ChevronRight size={12} />
            </Link>
            <Link
              href="/treinos"
              onClick={() => setOpen(false)}
              className="text-accent-text font-medium hover:underline"
            >
              Ver agenda semanal
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
