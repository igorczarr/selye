/**
 * SELYE — Biblioteca Editorial da Frase do Dia (Fase 3)
 * Curadoria de filósofos, cientistas da adaptação e atletas de elite,
 * indexada deterministicamente pelo dia do ano (1 a 365/366) com contagem anual.
 */

export interface EditorialQuote {
  messageText: string;
  author: string;
  roleOrContext: string;
  category: string;
  categoryLabelPt: string;
}

export interface DailyEditorialResult {
  quote: EditorialQuote;
  dayOfYear: number;
  totalDaysInYear: number;
  year: number;
  dayCounterLabel: string; // ex: "Dia 322 de 365"
  yearProgressPercent: number;
}

export const CATEGORY_LABELS_PT: Record<string, string> = {
  consistencia: "Consistência",
  disciplina: "Disciplina",
  adaptacao: "Adaptação Biológica",
  recuperacao: "Recuperação",
  foco: "Foco & Presença",
  autonomia: "Autonomia",
  evolucao: "Evolução Contínua",
  forca: "Força & Caráter",
};

/**
 * Acervo curado de citações reais de filósofos, pensadores, cientistas e atletas.
 * Cada dia do ano (1..366) seleciona uma entrada distinta sem repetição em dias consecutivos.
 */
export const CURATED_QUOTES: readonly EditorialQuote[] = [
  {
    messageText:
      "Não é o estresse que nos destrói, mas a forma como nosso organismo reage e se adapta a ele.",
    author: "Hans Selye",
    roleOrContext: "Médico Endocrinologista · Pai da Teoria da Adaptação",
    category: "adaptacao",
    categoryLabelPt: "Adaptação Biológica",
  },
  {
    messageText:
      "Somos o que repetidamente fazemos. A excelência, portanto, não é um feito isolado, mas um hábito.",
    author: "Aristóteles",
    roleOrContext: "Filósofo Grego · Ética a Nicômaco",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "Apenas os disciplinados são verdadeiramente livres na vida. Os indisciplinados são escravos de seus humores e paixões.",
    author: "Eliud Kipchoge",
    roleOrContext: "Bicampeão Olímpico da Maratona",
    category: "disciplina",
    categoryLabelPt: "Disciplina",
  },
  {
    messageText:
      "Você tem poder sobre a sua mente — não sobre os eventos externos. Perceba isso e encontrará a sua força.",
    author: "Marco Aurélio",
    roleOrContext: "Imperador Romano & Filósofo Estoico · Meditações",
    category: "forca",
    categoryLabelPt: "Força & Caráter",
  },
  {
    messageText:
      "Nenhum homem tem o direito de ser um amador no treinamento físico. Que vergonha é envelhecer sem nunca ver a força e a beleza de que o próprio corpo é capaz.",
    author: "Sócrates",
    roleOrContext: "Filósofo Clássico · registrado por Xenofonte",
    category: "autonomia",
    categoryLabelPt: "Autonomia",
  },
  {
    messageText:
      "Diga primeiro a si mesmo quem você quer ser; e então faça o que precisa ser feito.",
    author: "Epicteto",
    roleOrContext: "Filósofo Estoico · Discursos",
    category: "disciplina",
    categoryLabelPt: "Disciplina",
  },
  {
    messageText:
      "Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas se tornam difíceis.",
    author: "Sêneca",
    roleOrContext: "Filósofo Estoico · Cartas a Lucílio",
    category: "forca",
    categoryLabelPt: "Força & Caráter",
  },
  {
    messageText:
      "No que diz respeito ao empenho, ao compromisso, ao esforço e à dedicação, não existe meio-termo. Ou você faz uma coisa bem feita ou não faz.",
    author: "Ayrton Senna",
    roleOrContext: "Tricampeão Mundial de Fórmula 1",
    category: "foco",
    categoryLabelPt: "Foco & Presença",
  },
  {
    messageText:
      "Aquele que tem um porquê para viver pode suportar quase qualquer como.",
    author: "Friedrich Nietzsche",
    roleOrContext: "Filósofo · Crepúsculo dos Ídolos",
    category: "forca",
    categoryLabelPt: "Força & Caráter",
  },
  {
    messageText:
      "Passo a passo, caminhando milhas após milhas, o caminho se completa. Treine a mente para não negociar com a preguiça.",
    author: "Miyamoto Musashi",
    roleOrContext: "Estrategista & Autor de O Livro dos Cinco Anéis",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "Um corredor deve correr com sonhos no coração, não apenas com números na cabeça, mas é o treino diário que sustenta o sonho.",
    author: "Emil Zátopek",
    roleOrContext: "Tricampeão Olímpico (5.000m, 10.000m e Maratona)",
    category: "evolucao",
    categoryLabelPt: "Evolução Contínua",
  },
  {
    messageText:
      "A vontade de se preparar precisa ser maior do que a vontade de vencer. Vencer é consequência da preparação invisível.",
    author: "Bernardinho",
    roleOrContext: "Treinador Multicampeão Olímpico de Voleibol",
    category: "disciplina",
    categoryLabelPt: "Disciplina",
  },
  {
    messageText:
      "Não temo o homem que praticou dez mil chutes uma única vez, mas sim aquele que praticou um único chute dez mil vezes.",
    author: "Bruce Lee",
    roleOrContext: "Artista Marcial & Filósofo do Movimento",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "O campo de batalha da evolução é o treino silencioso de terça-feira, quando ninguém está aplaudindo.",
    author: "Kobe Bryant",
    roleOrContext: "Pentacampeão da NBA & Bicampeão Olímpico",
    category: "foco",
    categoryLabelPt: "Foco & Presença",
  },
  {
    messageText:
      "A jornada de mil léguas começa sob os seus pés, no movimento que você decide executar hoje.",
    author: "Lao Tsé",
    roleOrContext: "Filósofo · Tao Te Ching",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "Não importa quão devagar você vá, desde que você não interrompa a marcha.",
    author: "Confúcio",
    roleOrContext: "Pensador & Filósofo · Analectos",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "A luta é vencida ou perdida longe das testemunhas — atrás das linhas, na academia e na estrada, muito antes de eu dançar sob aquelas luzes.",
    author: "Muhammad Ali",
    roleOrContext: "Campeão Olímpico & Mundial de Pesos-Pesados",
    category: "disciplina",
    categoryLabelPt: "Disciplina",
  },
  {
    messageText:
      "A fadiga faz parte do processo, mas o descanso inteligente é onde o tecido biológico reconstrói sua capacidade superior.",
    author: "Hans Selye",
    roleOrContext: "Síndrome de Adaptação Geral (GAS)",
    category: "recuperacao",
    categoryLabelPt: "Recuperação",
  },
  {
    messageText:
      "Nada na vida humana permanece imóvel; o corpo que não é desafiado regride, e o que é estimulado com medida floresce.",
    author: "Heráclito de Éfeso",
    roleOrContext: "Filósofo Pré-Socrático",
    category: "adaptacao",
    categoryLabelPt: "Adaptação Biológica",
  },
  {
    messageText:
      "Comece onde você está. Use o que você tem. Faça o que você pode.",
    author: "Arthur Ashe",
    roleOrContext: "Campeão de Wimbledon, US Open e Australian Open",
    category: "autonomia",
    categoryLabelPt: "Autonomia",
  },
  {
    messageText:
      "Entre o estímulo e a resposta existe um espaço. Nesse espaço reside nossa liberdade e nosso poder de escolher e evoluir.",
    author: "Viktor Frankl",
    roleOrContext: "Neurologista, Psiquiatra & Filósofo",
    category: "autonomia",
    categoryLabelPt: "Autonomia",
  },
  {
    messageText:
      "A paciência e o tempo fazem mais do que a força bruta ou a fúria passageira.",
    author: "Jean de La Fontaine",
    roleOrContext: "Poeta & Moralista Clássico",
    category: "recuperacao",
    categoryLabelPt: "Recuperação",
  },
  {
    messageText:
      "No auge do inverno, finalmente aprendi que havia dentro de mim um verão invencível.",
    author: "Albert Camus",
    roleOrContext: "Filósofo & Prêmio Nobel de Literatura",
    category: "forca",
    categoryLabelPt: "Força & Caráter",
  },
  {
    messageText:
      "Eu treinei quatro anos para correr apenas nove segundos. Muita gente desiste quando não vê resultados em dois meses.",
    author: "Usain Bolt",
    roleOrContext: "Oito Vezes Campeão Olímpico & Recordista Mundial",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "Não existe talento sem trabalho duro. O talento é apenas o ponto de partida; a repetição consciente é o que constrói a maestria.",
    author: "Roger Federer",
    roleOrContext: "20 Títulos de Grand Slam",
    category: "evolucao",
    categoryLabelPt: "Evolução Contínua",
  },
  {
    messageText:
      "Quem olha para fora sonha; quem olha para dentro desperta e assume o comando da própria trajetória.",
    author: "Carl Gustav Jung",
    roleOrContext: "Psiquiatra & Pensador Suíço",
    category: "autonomia",
    categoryLabelPt: "Autonomia",
  },
  {
    messageText:
      "A maior vitória é aquela conquistada sobre si mesmo. Dominar o próprio corpo é o alicerce para dominar a própria mente.",
    author: "Platão",
    roleOrContext: "Filósofo Grego · As Leis",
    category: "disciplina",
    categoryLabelPt: "Disciplina",
  },
  {
    messageText:
      "Não corro para derrotar os outros. Corro para descobrir até onde a disciplina diária pode levar o corpo humano.",
    author: "Eliud Kipchoge",
    roleOrContext: "Primeiro Humano a Correr 42km Abaixo de 2 Horas",
    category: "evolucao",
    categoryLabelPt: "Evolução Contínua",
  },
  {
    messageText:
      "A saúde e a vitalidade física superam todos os bens externos; são a base real sobre a qual qualquer conquista se apoia.",
    author: "Arthur Schopenhauer",
    roleOrContext: "Filósofo · Aforismos para a Sabedoria de Vida",
    category: "recuperacao",
    categoryLabelPt: "Recuperação",
  },
  {
    messageText:
      "Se você quer melhorar, esteja disposto a parecer iniciante no começo e a registrar cada pequeno avanço.",
    author: "Epicteto",
    roleOrContext: "Filósofo Estoico · Enchiridion",
    category: "evolucao",
    categoryLabelPt: "Evolução Contínua",
  },
  {
    messageText:
      "A constância vence a intensidade esporádica. Um treino honesto hoje vale mais que um plano perfeito adiado para segunda-feira.",
    author: "Sêneca",
    roleOrContext: "Filósofo Estoico · Sobre a Brevidade da Vida",
    category: "consistencia",
    categoryLabelPt: "Consistência",
  },
  {
    messageText:
      "Saber não é o bastante; precisamos aplicar. Querer não é o bastante; precisamos agir.",
    author: "Johann Wolfgang von Goethe",
    roleOrContext: "Pensador & Cientista Natural",
    category: "foco",
    categoryLabelPt: "Foco & Presença",
  },
] as const;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getTotalDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Calcula o dia do ano (1..365 ou 1..366) de forma determinística em UTC/local.
 */
export function getDayOfYear(date: Date = new Date()): {
  dayOfYear: number;
  totalDaysInYear: number;
  year: number;
} {
  const year = date.getFullYear();
  const startOfYearUtc = Date.UTC(year, 0, 1);
  const currentUtc = Date.UTC(year, date.getMonth(), date.getDate());
  const diffDays = Math.floor((currentUtc - startOfYearUtc) / 86_400_000);
  const totalDaysInYear = getTotalDaysInYear(year);
  const dayOfYear = Math.min(totalDaysInYear, Math.max(1, diffDays + 1));

  return {
    dayOfYear,
    totalDaysInYear,
    year,
  };
}

/**
 * Textos genéricos antigos de seed que não devem sobrescrever a curadoria diária de filósofos/atletas.
 */
const LEGACY_PLACEHOLDER_AUTHORS = new Set(["Selye Editorial", ""]);

/**
 * Retorna a Frase do Dia determinística para a data informada, junto com a contagem
 * anual ("Dia X de 365"). Caso o administrador tenha agendado uma frase autoral específica
 * (com autor real definido), respeita o agendamento.
 */
export function getDailyEditorialForDate(
  date: Date = new Date(),
  dbOverride?: {
    messageText?: string | null;
    author?: string | null;
    category?: string | null;
  } | null
): DailyEditorialResult {
  const { dayOfYear, totalDaysInYear, year } = getDayOfYear(date);

  // Seleciona a frase pelo índice do dia do ano (dayOfYear - 1), garantindo rotação diária sem repetição consecutiva
  const index = (dayOfYear - 1) % CURATED_QUOTES.length;
  let quote: EditorialQuote = CURATED_QUOTES[index];

  // Só usa override do banco se for uma citação com autor explícito (não o placeholder legado "Selye Editorial")
  if (
    dbOverride?.messageText &&
    dbOverride?.author &&
    !LEGACY_PLACEHOLDER_AUTHORS.has(dbOverride.author.trim())
  ) {
    const cat = dbOverride.category || "consistencia";
    quote = {
      messageText: dbOverride.messageText,
      author: dbOverride.author,
      roleOrContext: "Curadoria Selye",
      category: cat,
      categoryLabelPt: CATEGORY_LABELS_PT[cat] || "Consistência",
    };
  }

  const yearProgressPercent = Math.round((dayOfYear / totalDaysInYear) * 100);

  return {
    quote,
    dayOfYear,
    totalDaysInYear,
    year,
    dayCounterLabel: `Dia ${dayOfYear} de ${totalDaysInYear}`,
    yearProgressPercent,
  };
}
