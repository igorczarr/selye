import {
  buildSelyeEmailHtml,
  type NotificationCategory,
  type SelyeEmailTemplateInput,
} from "./resend-client";

export type SelyeNotificationEventType =
  | "workout_completed"
  | "free_activity_logged"
  | "morning_checkin_done"
  | "recovery_attitude_logged"
  | "regenerative_shield_activated"
  | "smart_reschedule_applied"
  | "challenge_created"
  | "challenge_joined"
  | "achievement_unlocked"
  | "new_follower"
  | "post_reaction"
  | "post_comment"
  | "coach_program_published"
  | "external_activities_imported"
  | "energetic_plan_created"
  | "energetic_phase_shift"
  | "energetic_daily_plan_completed"
  | "welcome_onboarding";

export interface BuiltNotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  actionUrl: string;
  shouldSendEmailByDefault: boolean;
  emailSubject: string;
  emailTemplate: SelyeEmailTemplateInput;
}

/**
 * Constrói a mensagem In-App (Sininho) e o E-mail (Resend) para cada ação do sistema,
 * com linguagem acolhedora, zero jargão técnico intimidador e foco em autonomia tanto para
 * iniciantes quanto para atletas avançados.
 */
export function buildNotificationEventPayload(
  eventType: SelyeNotificationEventType,
  params: {
    recipientName: string;
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
  }
): BuiltNotificationPayload {
  const name = params.recipientName || "Atleta";

  switch (eventType) {
    case "workout_completed": {
      const workoutTitle = params.title || "Sessão de Treino";
      const dur = params.durationMinutes || 45;
      const ea = params.loadEa || 250;
      const title = `Treino concluído: ${workoutTitle}`;
      const body = `Parabéns pela constância! Você registrou ${dur} min de prática (${ea} pts de energia do corpo utilizados). Agora seu foco é hidratar e descansar bem.`;
      return {
        category: "training",
        title,
        body,
        actionUrl: params.actionUrl || "/evolucao",
        shouldSendEmailByDefault: true,
        emailSubject: `✓ Treino registrado: ${workoutTitle} (${dur} min)`,
        emailTemplate: {
          recipientName: name,
          category: "training",
          badgeText: "Sessão Concluída",
          headline: `Mais um passo na sua evolução: ${workoutTitle}`,
          bodyParagraphs: [
            `Seu treino foi salvo com sucesso no Selye. Cada sessão concluída ajuda o sistema a entender melhor o ritmo do seu corpo e ajustar suas próximas recomendações.`,
            `Lembre-se: a evolução real acontece quando o estímulo do exercício se soma a uma boa recuperação.`,
          ],
          highlightBox: {
            label: "Resumo da Sessão",
            value: `${dur} minutos · ${ea} EA consumidos`,
            subtext:
              "Sua Reserva Adaptativa e sua sequência semanal já foram atualizadas automaticamente.",
          },
          ctaLabel: "Ver minha evolução",
          ctaUrl: "/evolucao",
        },
      };
    }

    case "free_activity_logged": {
      const actTitle = params.title || "Atividade Livre";
      const mod = params.modalityLabel || "Esporte";
      const dur = params.durationMinutes || 45;
      const ea = params.loadEa || 240;
      const title = `${actTitle} registrada no seu histórico`;
      const body = `${dur} min de ${mod} contabilizados na sua semana (${ea} pts na sua reserva corporal). Tudo conta para o seu ritmo!`;
      return {
        category: "training",
        title,
        body,
        actionUrl: params.actionUrl || "/evolucao",
        shouldSendEmailByDefault: true,
        emailSubject: `🏃 Atividade registrada: ${actTitle} (${dur} min)`,
        emailTemplate: {
          recipientName: name,
          category: "training",
          badgeText: "Movimento Registrado",
          headline: `${actTitle} somou na sua semana!`,
          bodyParagraphs: [
            `No Selye, todo movimento importa — seja na academia, na quadra, na areia ou na rua.`,
            `Registramos seus ${dur} minutos de ${mod} e ajustamos sua Reserva Adaptativa para que seus próximos dias de treino respeitem o esforço de hoje.`,
          ],
          highlightBox: {
            label: "Impacto no seu Ritmo",
            value: `${dur} min · ${mod}`,
            subtext: `Esforço equivalente a ${ea} EA contabilizado no seu equilíbrio semanal.`,
          },
          ctaLabel: "Acompanhar meu painel",
          ctaUrl: "/",
        },
      };
    }

    case "morning_checkin_done": {
      const score = params.readinessScore ?? 80;
      const headline =
        params.decisionHeadline ||
        (score >= 75
          ? "Sinal Verde: seu corpo está pronto para um ótimo dia"
          : score >= 55
            ? "Ritmo Moderado: priorize a qualidade do movimento sem exagerar"
            : "Dia de Cuidado: seu corpo pede recuperação ativa e leveza");
      const title = `Leitura do Dia (${score}/100): ${headline}`;
      const body = `Com base em como você dormiu e como está se sentindo hoje, calibramos sua recomendação diária para você treinar com segurança e autonomia.`;
      return {
        category: "recovery",
        title,
        body,
        actionUrl: "/",
        shouldSendEmailByDefault: true,
        emailSubject: `☀️ Sua Decisão do Dia no Selye (${score}/100)`,
        emailTemplate: {
          recipientName: name,
          category: "recovery",
          badgeText: "Leitura Matinal",
          headline,
          bodyParagraphs: [
            `Obrigado por compartilhar como você acordou hoje. Ouvir os sinais do próprio corpo é o segredo das pessoas que mantêm a constância o ano inteiro sem se machucar.`,
            `Confira abaixo a pontuação da sua disposição hoje e siga a orientação sugerida no seu painel.`,
          ],
          highlightBox: {
            label: "Sua Disposição Hoje",
            value: `${score} / 100`,
            subtext: body,
          },
          ctaLabel: "Abrir meu plano de hoje",
          ctaUrl: "/",
        },
      };
    }

    case "recovery_attitude_logged": {
      const habitTitle = params.title || "Hábito de Recuperação";
      const bonus = params.rechargeEa || 90;
      const title = `+${bonus} EA recarregados: ${habitTitle}`;
      const body = `Excelente escolha! Cuidar do descanso, hidratação e mobilidade devolve energia para o seu corpo render melhor amanhã.`;
      return {
        category: "recovery",
        title,
        body,
        actionUrl: "/",
        shouldSendEmailByDefault: false,
        emailSubject: `⚡ Você recarregou +${bonus} EA com ${habitTitle}`,
        emailTemplate: {
          recipientName: name,
          category: "recovery",
          badgeText: "Energia Recarregada",
          headline: `Você devolveu +${bonus} EA para o seu corpo`,
          bodyParagraphs: [
            `Você concluiu a prática de "${habitTitle}". Pequenas atitudes como essa aceleram a recuperação muscular e melhoram sua disposição.`,
          ],
          highlightBox: {
            label: "Bônus de Recuperação",
            value: `+${bonus} EA na Reserva Adaptativa`,
          },
          ctaLabel: "Ver minha Reserva Adaptativa",
          ctaUrl: "/",
        },
      };
    }

    case "regenerative_shield_activated": {
      const title = `Escudo de Recuperação Ativado nesta semana`;
      const body = `Sua sequência semanal está protegida! Tirar dias para recuperar o corpo faz parte da evolução inteligente — sem culpa e sem perder sua constância.`;
      return {
        category: "recovery",
        title,
        body,
        actionUrl: "/evolucao",
        shouldSendEmailByDefault: true,
        emailSubject: `🛡️ Seu Escudo de Recuperação foi ativado — descanse sem culpa`,
        emailTemplate: {
          recipientName: name,
          category: "recovery",
          badgeText: "Descanso Inteligente",
          headline: `Sua sequência semanal está 100% protegida`,
          bodyParagraphs: [
            `No Selye, nós não punimos você por precisar descansar. Saber a hora de reduzir o ritmo é sinal de inteligência corporal, não de fraqueza.`,
            `Seu Escudo de Recuperação garante que sua sequência de semanas ativas continue intacta enquanto seu corpo recarrega as energias.`,
          ],
          highlightBox: {
            label: "Status da Semana",
            value: "Semana Regenerativa Protegida",
            subtext: "Foque em sono reparador, hidratação e movimentos leves.",
          },
          ctaLabel: "Ver dicas de recuperação",
          ctaUrl: "/",
        },
      };
    }

    case "smart_reschedule_applied": {
      const prog = params.programTitle || "Sua Ficha";
      const title = `Agenda ajustada com inteligência: ${prog}`;
      const body =
        params.customNotes ||
        `Reorganizamos sua semana para evitar cansaço acumulado nas mesmas regiões musculares e manter seu rendimento alto.`;
      return {
        category: "training",
        title,
        body,
        actionUrl: "/treinos",
        shouldSendEmailByDefault: true,
        emailSubject: `📅 Sua agenda da semana foi ajustada: ${prog}`,
        emailTemplate: {
          recipientName: name,
          category: "training",
          badgeText: "Agenda Inteligente",
          headline: `Ajuste aplicado em "${prog}"`,
          bodyParagraphs: [
            body,
            `Adaptar os dias de treino à vida real é o que mantém você consistente a longo prazo.`,
          ],
          highlightBox: {
            label: "Ficha Atualizada",
            value: prog,
            subtext: "Você pode consultar sua nova distribuição semanal a qualquer momento.",
          },
          ctaLabel: "Ver minhas fichas da semana",
          ctaUrl: "/treinos",
        },
      };
    }

    case "achievement_unlocked": {
      const achTitle = params.achievementTitle || "Nova Conquista";
      const achDesc =
        params.achievementDescription ||
        "Você atingiu um novo marco de constância e autonomia no Selye.";
      const title = `🏆 Nova conquista desbloqueada: ${achTitle}`;
      const body = achDesc;
      return {
        category: "engagement",
        title,
        body,
        actionUrl: "/perfil",
        shouldSendEmailByDefault: true,
        emailSubject: `🏆 Parabéns! Você desbloqueou: ${achTitle}`,
        emailTemplate: {
          recipientName: name,
          category: "engagement",
          badgeText: "Novo Marco Alcançado",
          headline: `Conquista Desbloqueada: ${achTitle}`,
          bodyParagraphs: [
            `Sua dedicação está construindo resultados reais. Você acaba de desbloquear um novo marco no seu perfil Selye!`,
            achDesc,
          ],
          highlightBox: {
            label: "Patrimônio Esportivo",
            value: achTitle,
            subtext: "Já disponível na galeria de conquistas do seu perfil.",
          },
          ctaLabel: "Ver minhas conquistas",
          ctaUrl: "/perfil",
        },
      };
    }

    case "challenge_created":
    case "challenge_joined": {
      const chTitle = params.challengeTitle || "Desafio Multimodal";
      const isCreated = eventType === "challenge_created";
      const title = isCreated
        ? `Desafio criado: ${chTitle}`
        : `Você entrou no desafio: ${chTitle}`;
      const body = isCreated
        ? `Seu desafio está valendo! Convide amigos pelo WhatsApp — cada pessoa pode pontuar praticando o esporte que preferir.`
        : `Agora cada dia ativo ou treino registrado soma pontos para você no placar do desafio.`;
      return {
        category: "social",
        title,
        body,
        actionUrl: "/comunidade/desafios",
        shouldSendEmailByDefault: true,
        emailSubject: `🔥 ${title}`,
        emailTemplate: {
          recipientName: name,
          category: "social",
          badgeText: "Desafio em Grupo",
          headline: title,
          bodyParagraphs: [
            body,
            `No Selye, quem faz musculação, quem corre, quem caminha e quem joga na areia competem juntos de forma justa através do ritmo e da constância.`,
          ],
          highlightBox: {
            label: "Desafio Ativo",
            value: chTitle,
            subtext: "Compartilhe o link com seus amigos para evoluírem juntos.",
          },
          ctaLabel: "Abrir placar do desafio",
          ctaUrl: "/comunidade/desafios",
        },
      };
    }

    case "new_follower": {
      const actor = params.actorName || "Um atleta";
      const username = params.actorUsername
        ? `@${params.actorUsername}`
        : "";
      const title = `${actor} começou a acompanhar sua evolução`;
      const body = `Conecte-se na comunidade para trocar experiências, acompanhar treinos e participar de desafios juntos.`;
      return {
        category: "social",
        title,
        body,
        actionUrl: params.actorUsername
          ? `/atleta/${params.actorUsername}`
          : "/comunidade/atletas",
        shouldSendEmailByDefault: true,
        emailSubject: `🤝 ${actor} começou a seguir você no Selye`,
        emailTemplate: {
          recipientName: name,
          category: "social",
          badgeText: "Nova Conexão",
          headline: `${actor} ${username} agora acompanha você`,
          bodyParagraphs: [
            `Evoluir ao lado de outras pessoas aumenta a motivação e torna a jornada muito mais leve.`,
            `Visite o perfil de ${actor} para conhecer as modalidades que ele(a) pratica.`,
          ],
          ctaLabel: "Ver perfil na comunidade",
          ctaUrl: params.actorUsername
            ? `/atleta/${params.actorUsername}`
            : "/comunidade/atletas",
        },
      };
    }

    case "post_reaction":
    case "post_comment": {
      const actor = params.actorName || "Um membro da comunidade";
      const isComment = eventType === "post_comment";
      const title = isComment
        ? `${actor} comentou na sua publicação`
        : `${actor} incentivou seu relato de treino`;
      const body = isComment
        ? params.customNotes
          ? `"${params.customNotes}"`
          : `Confira o comentário deixado na sua publicação na comunidade.`
        : `Seu treino inspirou outras pessoas na comunidade Selye!`;
      return {
        category: "social",
        title,
        body,
        actionUrl: "/comunidade",
        shouldSendEmailByDefault: isComment,
        emailSubject: isComment
          ? `💬 ${actor} comentou na sua publicação`
          : `👏 ${actor} incentivou seu treino no Selye`,
        emailTemplate: {
          recipientName: name,
          category: "social",
          badgeText: "Comunidade Selye",
          headline: title,
          bodyParagraphs: [body],
          ctaLabel: "Ver na comunidade",
          ctaUrl: "/comunidade",
        },
      };
    }

    case "coach_program_published": {
      const prog = params.programTitle || "Nova Ficha de Treino";
      const title = `Nova atualização na sua ficha: ${prog}`;
      const body =
        params.customNotes ||
        `Sua programação de treino recebeu uma nova versão mantendo todo o seu histórico anterior preservado.`;
      return {
        category: "team",
        title,
        body,
        actionUrl: "/treinos",
        shouldSendEmailByDefault: true,
        emailSubject: `📋 Nova versão publicada: ${prog}`,
        emailTemplate: {
          recipientName: name,
          category: "team",
          badgeText: "Prescrição Atualizada",
          headline: `Sua ficha "${prog}" foi atualizada`,
          bodyParagraphs: [
            body,
            `Todos os vídeos demonstrativos passo a passo e cargas recomendadas já estão disponíveis para o seu próximo treino.`,
          ],
          ctaLabel: "Revisar minha ficha",
          ctaUrl: "/treinos",
        },
      };
    }

    case "external_activities_imported": {
      const count = params.importedCount || 1;
      const ea = params.loadEa || 250;
      const title = `${count} atividade(s) importada(s) e sincronizada(s)`;
      const body = `Suas sessões externas foram convertidas automaticamente (+${ea} EA contabilizados) sem duplicar nenhum registro.`;
      return {
        category: "training",
        title,
        body,
        actionUrl: "/evolucao",
        shouldSendEmailByDefault: true,
        emailSubject: `⌚ ${count} atividade(s) sincronizada(s) no seu Selye`,
        emailTemplate: {
          recipientName: name,
          category: "training",
          badgeText: "Sincronização Concluída",
          headline: `${count} atividade(s) externa(s) integrada(s) ao seu ritmo`,
          bodyParagraphs: [
            `Recebemos os dados do seu dispositivo/arquivo esportivo, verificamos possíveis duplicatas e atualizamos sua Reserva Adaptativa.`,
          ],
          highlightBox: {
            label: "Carga Integrada",
            value: `${count} sessão(ões) · ${ea} EA`,
          },
          ctaLabel: "Ver impacto na minha semana",
          ctaUrl: "/evolucao",
        },
      };
    }

    case "energetic_plan_created": {
      const eventTitle = params.title || "Ciclo de Evolução";
      const summary =
        params.customNotes ||
        "Seu calendário energético foi calibrado com treinos, hábitos regenerativos (+EA) e polimento final para você atingir sua meta com previsibilidade.";
      const title = `Plano Energético Ativado: ${eventTitle}`;
      return {
        category: "training",
        title,
        body: summary,
        actionUrl: params.actionUrl || "/calendario",
        shouldSendEmailByDefault: true,
        emailSubject: `🎯 Seu Calendário Energético está ativo: ${eventTitle}`,
        emailTemplate: {
          recipientName: name,
          category: "training",
          badgeText: "Calendário Energético",
          headline: `Roteiro pronto para ${eventTitle}`,
          bodyParagraphs: [
            summary,
            `A partir de hoje, o Selye vai acompanhar seu ritmo dia a dia, lembrando seus treinos, seus hábitos de recarga (+EA) e ajustando a agenda sempre que sua rotina mudar.`,
          ],
          highlightBox: {
            label: "Meta de Energia Adaptativa",
            value: params.loadEa ? `${params.loadEa} EA` : eventTitle,
            subtext:
              "Curva planejada com semanas de construção, absorção e polimento final.",
          },
          ctaLabel: "Abrir meu Calendário Energético",
          ctaUrl: "/calendario",
        },
      };
    }

    case "energetic_phase_shift": {
      const eventTitle = params.title || "Seu Ciclo Energético";
      const summary =
        params.customNotes ||
        "Seu corpo entrou em uma nova fase energética. Confira o ajuste recomendado para hoje no seu Calendário Selye.";
      return {
        category: "recovery",
        title: `Nova Fase no Plano: ${eventTitle}`,
        body: summary,
        actionUrl: params.actionUrl || "/calendario",
        shouldSendEmailByDefault: true,
        emailSubject: `⚡ Mudança de fase no seu Calendário Selye: ${eventTitle}`,
        emailTemplate: {
          recipientName: name,
          category: "recovery",
          badgeText: "Ciclo Energético",
          headline: eventTitle,
          bodyParagraphs: [
            summary,
            `Respeitar cada onda do seu ciclo é o segredo para evoluir com previsibilidade e chegar inteiro no seu melhor momento.`,
          ],
          highlightBox: params.loadEa
            ? {
                label: "Energia Adaptativa Atual",
                value: `${params.loadEa} EA`,
                subtext: "Acompanhe sua curva e compromissos no Calendário.",
              }
            : undefined,
          ctaLabel: "Abrir meu Calendário hoje",
          ctaUrl: "/calendario",
        },
      };
    }

    case "energetic_daily_plan_completed": {
      const eventTitle = params.title || "Plano do Dia";
      const summary =
        params.customNotes ||
        "Você concluiu 100% dos compromissos planejados para hoje! Cada dia cumprido consolida sua curva rumo à sua meta.";
      return {
        category: "engagement",
        title: `✓ Dia 100% concluído em "${eventTitle}"`,
        body: summary,
        actionUrl: "/calendario",
        shouldSendEmailByDefault: true,
        emailSubject: `✓ Missão cumprida hoje no Selye: ${eventTitle}`,
        emailTemplate: {
          recipientName: name,
          category: "engagement",
          badgeText: "Dia 100% Cumprido",
          headline: `Excelente consistência hoje em "${eventTitle}"!`,
          bodyParagraphs: [
            summary,
            `Agora o foco é descansar bem para consolidar os ganhos da sessão e acordar renovado(a) amanhã.`,
          ],
          highlightBox: params.loadEa
            ? {
                label: "Seu EA Atual na Curva",
                value: `${params.loadEa} EA`,
                subtext: "Trajetória atualizada automaticamente no seu calendário.",
              }
            : undefined,
          ctaLabel: "Ver minha curva de evolução",
          ctaUrl: "/calendario",
        },
      };
    }

    case "welcome_onboarding":
    default: {
      const title = `Bem-vindo(a) ao Selye! Tudo pronto para você começar no seu ritmo`;
      const body = `Aqui você não precisa entender termos difíceis: faça seu Check-in Matinal de 30s, siga a recomendação do dia e registre qualquer esporte ou treino com tranquilidade.`;
      return {
        category: "engagement",
        title,
        body,
        actionUrl: "/",
        shouldSendEmailByDefault: true,
        emailSubject: `🌱 Bem-vindo(a) ao Selye — Seu corpo, seu ritmo, sem complicação`,
        emailTemplate: {
          recipientName: name,
          category: "engagement",
          badgeText: "Boas-vindas ao Selye",
          headline: `Que bom ter você aqui, ${name}!`,
          bodyParagraphs: [
            `O Selye foi criado para ser o seu parceiro diário de movimento e saúde — seja você alguém dando os primeiros passos ou alguém que já pratica vários esportes.`,
            `Como aproveitar o Selye sem nenhuma complicação:`,
            `1. Ao acordar, toque em "Fazer Check-in Matinal" e conte em 4 toques como você dormiu e como está se sentindo.`,
            `2. Veja sua "Decisão do Dia": nós traduzimos os sinais do seu corpo em uma orientação simples (ir com tudo, moderar o ritmo ou focar em recuperar).`,
            `3. Vai treinar na academia, caminhar, correr ou jogar na areia? Tudo soma na sua evolução em um só lugar.`,
          ],
          highlightBox: {
            label: "Sua Filosofia no Selye",
            value: "Constância sem culpa, evolução com autonomia",
            subtext:
              "Nosso sistema aprende com cada registro seu para manter você sempre informado e seguro.",
          },
          ctaLabel: "Começar meu dia no Selye",
          ctaUrl: "/",
        },
      };
    }
  }
}

export function renderEventEmail(payload: BuiltNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const rendered = buildSelyeEmailHtml(payload.emailTemplate);
  return {
    subject: payload.emailSubject,
    html: rendered.html,
    text: rendered.text,
  };
}
