/**
 * Selye — Fase 0: Catálogo de Referências Científicas Peer-Reviewed
 *
 * Todas as fórmulas, zonas, protocolos de fortalecimento complementar e guard-rails
 * do Modality Profile Registry referenciam IDs deste catálogo para rastreabilidade
 * e auditoria por profissionais de Educação Física e Fisiologia do Exercício.
 */

import type { ScientificReference } from "./types";

export const SCIENTIFIC_REFERENCES: Record<string, ScientificReference> = {
  selye_1956: {
    id: "selye_1956",
    authors: "Selye, H.",
    year: 1956,
    title: "The Stress of Life (General Adaptation Syndrome & Adaptation Energy)",
    journalOrBook: "McGraw-Hill, New York",
    keyFindingPt:
      "Define a Síndrome Geral de Adaptação (Alarme → Resistência/Supercompensação → Exaustão) e o conceito de Energia Adaptativa (EA) como reserva finita modulada por estresse e recuperação.",
    evidenceLevel: "foundational_model",
  },
  banister_1975: {
    id: "banister_1975",
    authors: "Banister, E. W., Calvert, T. W., Savage, M. V., & Bach, T.",
    year: 1975,
    title: "A systems model of training for athletic performance",
    journalOrBook: "Australian Journal of Sports Medicine, 7(3), 57–61",
    keyFindingPt:
      "Modelo impulso-resposta (Fitness-Fatigue): o desempenho resulta do saldo entre aptidão crônica (decaimento lento) e fadiga aguda (decaimento rápido).",
    evidenceLevel: "foundational_model",
  },
  foster_1998: {
    id: "foster_1998",
    authors: "Foster, C.",
    year: 1998,
    title: "Monitoring training in athletes with reference to overtraining syndrome",
    journalOrBook: "Medicine & Science in Sports & Exercise, 30(7), 1164–1168",
    doiOrIsbn: "10.1097/00005768-199807000-00023",
    keyFindingPt:
      "Estabelece a carga interna por sRPE (duração × RPE), Monotonia (média/DP) e Strain (carga × monotonia); monotonia > 2,0 associa-se a maior incidência de sobrecarga e adoecimento.",
    evidenceLevel: "original_research",
  },
  foster_2001: {
    id: "foster_2001",
    authors: "Foster, C., Florhaug, J. A., Franklin, J., et al.",
    year: 2001,
    title: "A new approach to monitoring exercise training",
    journalOrBook: "Journal of Strength and Conditioning Research, 15(1), 109–115",
    keyFindingPt:
      "Valida o método Session-RPE (sRPE) como moeda unificada de carga interna aplicável tanto a exercícios contínuos (endurance) quanto intermitentes e treinamento resistido.",
    evidenceLevel: "original_research",
  },
  gabbett_2016: {
    id: "gabbett_2016",
    authors: "Gabbett, T. J.",
    year: 2016,
    title: "The training—injury prevention paradox: should athletes be training smarter and harder?",
    journalOrBook: "British Journal of Sports Medicine, 50(5), 273–280",
    doiOrIsbn: "10.1136/bjsports-2015-095788",
    keyFindingPt:
      "Propõe o monitoramento da razão aguda:crônica (ACWR) com faixa de progressão gradual (~0,8–1,3) para evitar saltos bruscos de carga semanal.",
    evidenceLevel: "systematic_review",
  },
  impellizzeri_2020: {
    id: "impellizzeri_2020",
    authors: "Impellizzeri, F. M., Woodcock, S., Coutts, A. J., Fanchini, M., McCall, A., & Vigotsky, A. D.",
    year: 2020,
    title: "What role do chronic workloads play in the acute to chronic workload ratio? Time to dismiss ACWR and its underlying theory",
    journalOrBook: "Sports Medicine, 51, 581–592 (Epub 2020)",
    doiOrIsbn: "10.1007/s40279-020-01378-6",
    keyFindingPt:
      "Aponta limitações estatísticas do ACWR como preditor isolado de lesão; recomenda usá-lo apenas como indicador auxiliar de mudança de carga junto a prontidão, monotonia e volume absoluto.",
    evidenceLevel: "systematic_review",
  },
  schoenfeld_2017: {
    id: "schoenfeld_2017",
    authors: "Schoenfeld, B. J., Ogborn, D., & Krieger, J. W.",
    year: 2017,
    title: "Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis",
    journalOrBook: "Journal of Sports Sciences, 35(11), 1073–1082",
    doiOrIsbn: "10.1080/02640414.2016.1210197",
    keyFindingPt:
      "Demonstra relação dose-resposta entre séries semanais por grupo muscular e hipertrofia, com ganhos superiores a partir de 10+ séries efetivas/semana (teto prático de 10–20 séries conforme nível).",
    evidenceLevel: "meta_analysis",
  },
  helms_2016: {
    id: "helms_2016",
    authors: "Helms, E. R., Cronin, J., Storey, A., & Zourdos, M. C.",
    year: 2016,
    title: "Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training",
    journalOrBook: "Strength and Conditioning Journal, 38(4), 42–49",
    doiOrIsbn: "10.1519/SSC.0000000000000218",
    keyFindingPt:
      "Consolida a autorregulação por Repetições em Reserva (RIR) / RPE no treinamento de força e hipertrofia, permitindo ajustar carga diária conforme prontidão sem depender de 1RM fixo.",
    evidenceLevel: "systematic_review",
  },
  epley_1985: {
    id: "epley_1985",
    authors: "Epley, B.",
    year: 1985,
    title: "Poundage Chart (Boyd Epley Workout)",
    journalOrBook: "University of Nebraska Press",
    keyFindingPt:
      "Fórmula prática de estimativa de 1RM submáximo: e1RM = carga × (1 + reps / 30), amplamente validada para faixas de 2 a 10 repetições.",
    evidenceLevel: "foundational_model",
  },
  seiler_2010: {
    id: "seiler_2010",
    authors: "Seiler, S.",
    year: 2010,
    title: "What is best practice for training intensity and duration distribution in endurance athletes?",
    journalOrBook: "International Journal of Sports Physiology and Performance, 5(3), 276–291",
    doiOrIsbn: "10.1123/ijspp.5.3.276",
    keyFindingPt:
      "Evidencia o modelo polarizado (~80% das sessões/volume em baixa intensidade abaixo de VT1 e ~20% em alta intensidade), evitando o acúmulo excessivo em zona cinzenta moderada.",
    evidenceLevel: "systematic_review",
  },
  daniels_2014: {
    id: "daniels_2014",
    authors: "Daniels, J.",
    year: 2014,
    title: "Daniels' Running Formula (3rd ed.)",
    journalOrBook: "Human Kinetics",
    keyFindingPt:
      "Sistematiza zonas de ritmo (Easy, Marathon, Threshold, Interval, Repetition) e o índice VDOT para ancorar prescrições e metas de tempo em provas de corrida.",
    evidenceLevel: "foundational_model",
  },
  blagrove_2018: {
    id: "blagrove_2018",
    authors: "Blagrove, R. C., Howatson, G., & Hayes, P. R.",
    year: 2018,
    title: "Effects of Strength Training on the Physiological Determinants of Middle- and Long-Distance Running Performance: A Systematic Review",
    journalOrBook: "Sports Medicine, 48(5), 1117–1149",
    doiOrIsbn: "10.1007/s40279-017-0835-7",
    keyFindingPt:
      "Treino de força pesada e/ou pliometria 2x/semana melhora a economia de corrida em 2–8% e desempenho em provas (1,5–10 km) via eficiência neuromuscular e rigidez tendínea, sem prejudicar VO2máx.",
    evidenceLevel: "systematic_review",
  },
  ronnestad_mujika_2014: {
    id: "ronnestad_mujika_2014",
    authors: "Rønnestad, B. R., & Mujika, I.",
    year: 2014,
    title: "Optimizing strength training for running and cycling endurance performance: A review",
    journalOrBook: "Scandinavian Journal of Medicine & Science in Sports, 24(4), 603–612",
    doiOrIsbn: "10.1111/sms.12104",
    keyFindingPt:
      "Força pesada (4–10 RM, alta intenção concêntrica, sem falha crônica) melhora economia e potência sustentada no ciclismo e corrida por atrasar o recrutamento de fibras tipo IIx e converter IIx→IIa.",
    evidenceLevel: "systematic_review",
  },
  schumann_2022: {
    id: "schumann_2022",
    authors: "Schumann, M., Feuerbacher, J. F., Sünkeler, M., Freitag, N., Rønnestad, B. R., Doma, K., & Lundberg, T. R.",
    year: 2022,
    title: "Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis",
    journalOrBook: "Sports Medicine, 52, 601–612",
    doiOrIsbn: "10.1007/s40279-021-01587-7",
    keyFindingPt:
      "Treino aeróbico concorrente NÃO prejudica hipertrofia nem força máxima em condições normais, mas atenua força explosiva/potência quando feito na mesma sessão (separação >= 3h ou dias distintos mitiga o efeito).",
    evidenceLevel: "meta_analysis",
  },
  allen_coggan_2019: {
    id: "allen_coggan_2019",
    authors: "Allen, H., Coggan, A., & McGregor, S.",
    year: 2019,
    title: "Training and Racing with a Power Meter (3rd ed.)",
    journalOrBook: "VeloPress",
    keyFindingPt:
      "Define FTP (Functional Threshold Power), Potência Normalizada (NP), Fator de Intensidade (IF), TSS e o Performance Management Chart (CTL/ATL/TSB) no ciclismo.",
    evidenceLevel: "foundational_model",
  },
  markovic_2007: {
    id: "markovic_2007",
    authors: "Markovic, G.",
    year: 2007,
    title: "Does plyometric training improve vertical jump height? A meta-analytical review",
    journalOrBook: "British Journal of Sports Medicine, 41(6), 349–355",
    doiOrIsbn: "10.1136/bjsm.2007.035113",
    keyFindingPt:
      "Meta-análise demonstrando ganhos consistentes (4,7–8,7%) no salto vertical (CMJ/DJ) com treinamento pliométrico estruturado de baixa a moderada dose.",
    evidenceLevel: "meta_analysis",
  },
  claudino_2017: {
    id: "claudino_2017",
    authors: "Claudino, J. G., Cronin, J., Mezêncio, B., et al.",
    year: 2017,
    title: "The countermovement jump to monitor neuromuscular status: A meta-analysis",
    journalOrBook: "Journal of Science and Medicine in Sport, 20(4), 397–402",
    doiOrIsbn: "10.1016/j.jsams.2016.08.011",
    keyFindingPt:
      "Valida o Countermovement Jump (CMJ) como indicador não invasivo sensível à fadiga neuromuscular e supercompensação em esportes de salto e potência.",
    evidenceLevel: "meta_analysis",
  },
  cools_2015: {
    id: "cools_2015",
    authors: "Cools, A. M., Johansson, F. R., Borms, D., & Maenhout, A.",
    year: 2015,
    title: "Prevention of shoulder injuries in overhead athletes: a science-based approach",
    journalOrBook: "Brazilian Journal of Physical Therapy, 19(5), 331–339",
    doiOrIsbn: "10.1590/bjpt-rbf.2014.0109",
    keyFindingPt:
      "Programas preventivos com fortalecimento de rotadores externos/manguito, estabilidade escapular e cadeia cinética reduzem significativamente lesões por sobrecarga no ombro de atletas overhead (vôlei, natação).",
    evidenceLevel: "systematic_review",
  },
  wakayoshi_1993: {
    id: "wakayoshi_1993",
    authors: "Wakayoshi, K., Yoshida, T., Udo, M., et al.",
    year: 1993,
    title: "Does critical swimming velocity represent exercise intensity at maximal lactate steady state?",
    journalOrBook: "European Journal of Applied Physiology and Occupational Physiology, 66(1), 90–95",
    doiOrIsbn: "10.1007/BF00863406",
    keyFindingPt:
      "Valida a Velocidade Crítica de Nado (CSS) obtida por testes de campo (ex.: 400m e 200m) como marcador prático do limiar aeróbico/MLSS na natação.",
    evidenceLevel: "original_research",
  },
  issurin_2010: {
    id: "issurin_2010",
    authors: "Issurin, V. B.",
    year: 2010,
    title: "New horizons for the methodology and physiology of training periodization",
    journalOrBook: "Sports Medicine, 40(3), 189–206",
    doiOrIsbn: "10.2165/11319770-000000000-00000",
    keyFindingPt:
      "Sistematiza a Periodização em Blocos (Acumulação/Base → Transmutação/Construção → Realização/Pico-Polimento) adaptável a esportes de força, endurance e coletivos.",
    evidenceLevel: "systematic_review",
  },
  bosquet_2007: {
    id: "bosquet_2007",
    authors: "Bosquet, L., Montpetit, J., Arvisais, D., & Mujika, I.",
    year: 2007,
    title: "Effects of tapering on performance: a meta-analysis",
    journalOrBook: "Medicine & Science in Sports & Exercise, 39(8), 1358–1365",
    doiOrIsbn: "10.1249/mss.0b013e31806010e0",
    keyFindingPt:
      "Polimento (tapering) ideal reduz volume em 41–60% por ~8–14 dias mantendo intensidade e frequência (>=80%), produzindo ganhos de ~2–3% no desempenho competitivo.",
    evidenceLevel: "meta_analysis",
  },
  kellmann_2018: {
    id: "kellmann_2018",
    authors: "Kellmann, M., Bertollo, M., Bosquet, L., et al.",
    year: 2018,
    title: "Recovery and performance in sport: consensus statement",
    journalOrBook: "International Journal of Sports Physiology and Performance, 13(2), 240–245",
    doiOrIsbn: "10.1123/ijspp.2017-0759",
    keyFindingPt:
      "Consenso internacional reforçando o monitoramento combinado de carga externa, carga interna subjetiva e marcadores de recuperação (sono, prontidão) para prevenir overreaching não funcional.",
    evidenceLevel: "consensus_statement",
  },
  acsm_2009: {
    id: "acsm_2009",
    authors: "American College of Sports Medicine (Ratamess, N. A., Alvar, B. A., Evetoch, T. K., et al.)",
    year: 2009,
    title: "Progression models in resistance training for healthy adults",
    journalOrBook: "Medicine & Science in Sports & Exercise, 41(3), 687–708",
    doiOrIsbn: "10.1249/MSS.0b013e3181915670",
    keyFindingPt:
      "Estabelece modelos conservadores de progressão de carga (2–10% quando o teto de repetições é superado), seleção de exercícios e recuperação por nível (iniciante a avançado).",
    evidenceLevel: "consensus_statement",
  },
  naser_2017: {
    id: "naser_2017",
    authors: "Naser, N., Ali, A., & Macadam, P.",
    year: 2017,
    title: "Physical and physiological demands of futsal",
    journalOrBook: "Journal of Exercise Science & Fitness, 15(2), 76–80",
    doiOrIsbn: "10.1016/j.jesf.2017.09.001",
    keyFindingPt:
      "Jogos de futsal operam em média >=85% FCmáx (~80% VO2máx) com ações curtas, sprints repetidos e mudanças bruscas de direção; exige velocidade, potência de pernas, agilidade (COD) e lastro aeróbico.",
    evidenceLevel: "systematic_review",
  },
  stolen_2005: {
    id: "stolen_2005",
    authors: "Stølen, T., Chamari, K., Castagna, C., & Wisløff, U.",
    year: 2005,
    title: "Physiology of soccer: an update",
    journalOrBook: "Sports Medicine, 35(6), 501–536",
    doiOrIsbn: "10.2165/00007256-200535060-00004",
    keyFindingPt:
      "Futebol de campo demanda ~8–12 km por partida de esforço intermitente combinando resistência aeróbica (Yo-Yo) com sprints repetidos, potência de chute e aceleração.",
    evidenceLevel: "systematic_review",
  },
  petersen_2011: {
    id: "petersen_2011",
    authors: "Petersen, J., Thorborg, K., Nielsen, M. B., Budtz-Jørgensen, E., & Hölmich, P.",
    year: 2011,
    title: "Preventive effect of eccentric training on acute hamstring injuries in men's soccer: A cluster-randomized controlled trial",
    journalOrBook: "American Journal of Sports Medicine, 39(11), 2296–2303",
    doiOrIsbn: "10.1177/0363546511419277",
    keyFindingPt:
      "Ensaio clínico com 942 jogadores provando que protocolo progressivo excêntrico de posteriores (Nordic Hamstring) reduz lesões agudas de isquiotibiais em ~71% (e recorrentes em ~85%).",
    evidenceLevel: "original_research",
  },
  franchini_2011: {
    id: "franchini_2011",
    authors: "Franchini, E., Del Vecchio, F. B., Matsushigue, K. A., & Artioli, G. G.",
    year: 2011,
    title: "Physiological profiles of elite judo athletes",
    journalOrBook: "Sports Medicine, 41(2), 147–166",
    keyFindingPt:
      "Demonstra que esportes de agarrada (grappling) dependem criticamente de potência anaeróbica de tronco/membros superiores, força dinâmica de pernas e resistência isométrica intermitente de pegada/puxada.",
    evidenceLevel: "systematic_review",
  },
  james_2016: {
    id: "james_2016",
    authors: "James, L. P., Haff, G. G., Kelly, V. G., & Keogh, J. W. D.",
    year: 2016,
    title: "Towards a Determination of the Physiological Characteristics Distinguishing Successful Mixed Martial Arts Athletes: A Systematic Review of Combat Sport Literature",
    journalOrBook: "Sports Medicine, 46(10), 1525–1551",
    doiOrIsbn: "10.1007/s40279-016-0493-1",
    keyFindingPt:
      "Diferencia demandas em esportes de combate: grappling exige força máxima e alta produção de força; striking prioriza ações balísticas de alta velocidade e potência rotacional; ambos dependem de capacidade anaeróbica.",
    evidenceLevel: "systematic_review",
  },
  kotarsky_2018: {
    id: "kotarsky_2018",
    authors: "Kotarsky, C. J., Christensen, B. K., Miller, J. S., & Hackney, K. J.",
    year: 2018,
    title: "Effect of progressive calisthenic push-up training on muscle strength and thickness",
    journalOrBook: "Journal of Strength and Conditioning Research, 32(3), 651–659",
    keyFindingPt:
      "Calistenia estruturada com progressão sistemática de alavancas produz ganhos de força equivalentes ao treinamento com pesos livres mantendo intensidade relativa alta.",
    evidenceLevel: "original_research",
  },
  walsh_2021: {
    id: "walsh_2021",
    authors: "Walsh, N. P., Halson, S. L., Sargent, C., et al.",
    year: 2021,
    title: "Sleep and the athlete: narrative review and 2021 expert consensus recommendations",
    journalOrBook: "British Journal of Sports Medicine, 55(7), 356–368",
    doiOrIsbn: "10.1136/bjsports-2020-102025",
    keyFindingPt:
      "Consenso internacional demonstrando que sono insuficiente (<7h) ou fragmentado reduz recuperação imunológica, metabólica e neuromuscular, exigindo calibração individualizada de sono e carga.",
    evidenceLevel: "consensus_statement",
  },
  mcewen_1998: {
    id: "mcewen_1998",
    authors: "McEwen, B. S.",
    year: 1998,
    title: "Protective and damaging effects of stress mediators",
    journalOrBook: "New England Journal of Medicine, 338(3), 171–179",
    doiOrIsbn: "10.1056/NEJM199801153380307",
    keyFindingPt:
      "Formaliza o conceito de Carga Alostática: estressores psicossociais e ocupacionais ativam os mesmos eixos HPA e autonômico que o estresse físico, drenando a mesma reserva adaptativa.",
    evidenceLevel: "foundational_model",
  },
  mann_2016: {
    id: "mann_2016",
    authors: "Mann, J. B., Bryant, K. R., Johnstone, B., Ivey, P. A., & Sayers, S. P.",
    year: 2016,
    title: "Effect of physical and academic stress on illness and injury in Division 1 college football players",
    journalOrBook: "Journal of Strength and Conditioning Research, 30(1), 20–25",
    doiOrIsbn: "10.1519/JSC.0000000000001055",
    keyFindingPt:
      "Demonstra que períodos de alto estresse mental/vida quase dobram a chance de restrição por lesão ou adoecimento (OR = 1,78), confirmando que o atleta compartilha uma única reserva fisiológica.",
    evidenceLevel: "original_research",
  },
  buchheit_2014: {
    id: "buchheit_2014",
    authors: "Buchheit, M.",
    year: 2014,
    title: "Monitoring training status with HR measures: do all roads lead to Rome?",
    journalOrBook: "Frontiers in Physiology, 5, 73",
    doiOrIsbn: "10.3389/fphys.2014.00073",
    keyFindingPt:
      "Revisão de referência sobre uso de FC de repouso (RHR) e variabilidade cardíaca (HRV) como marcadores autonômicos práticos de aptidão cardiovascular e prontidão.",
    evidenceLevel: "systematic_review",
  },
  fell_williams_2008: {
    id: "fell_williams_2008",
    authors: "Fell, J., & Williams, A. D.",
    year: 2008,
    title: "The effect of aging on skeletal-muscle recovery from exercise: possible implications for aging athletes",
    journalOrBook: "Journal of Aging and Physical Activity, 16(1), 97–115",
    doiOrIsbn: "10.1123/japa.16.1.97",
    keyFindingPt:
      "Evidencia aumento gradual do tempo de recuperação muscular e remodelamento tecidual com o avanço da idade, requerendo margens mais conservadoras de recuperação em atletas masters.",
    evidenceLevel: "systematic_review",
  },
};

export function getScientificReference(id: string): ScientificReference | undefined {
  return SCIENTIFIC_REFERENCES[id];
}
