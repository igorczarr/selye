import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function registerTraining() {
  console.log("Iniciando cadastro do protocolo de treino personalizado para Igor...");

  const email = process.env.ACTIVE_USER_EMAIL || "igorsantos979.is@gmail.com";
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

  if (!user) {
    throw new Error(`Usuário ${email} não encontrado no banco!`);
  }

  // Obter mapas de músculos
  const musclesList = await db.select().from(schema.muscles);
  const muscleMap = new Map(musclesList.map((m) => [m.code, m.id]));

  // Helper para buscar ou criar exercício no catálogo
  async function getOrCreateExercise(data: {
    namePt: string;
    nameEn?: string;
    muscleCode: string;
    modalityCode?: string;
    difficulty?: string;
    instructionsPt?: string;
  }) {
    const existing = await db
      .select()
      .from(schema.exercises)
      .where(eq(schema.exercises.namePt, data.namePt))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    const [created] = await db
      .insert(schema.exercises)
      .values({
        namePt: data.namePt,
        nameEn: data.nameEn || data.namePt,
        modalityCode: data.modalityCode || "strength",
        primaryMuscleId: muscleMap.get(data.muscleCode) || null,
        difficulty: data.difficulty || "intermediate",
        instructionsPt: data.instructionsPt || "Execute com técnica apurada e controle excêntrico.",
        isCustom: false,
      })
      .returning();

    return created.id;
  }

  console.log("Mapeando e assegurando exercícios no catálogo do Selye...");

  // Exercícios Dia 1
  const exAquecimentoMobilidade = await getOrCreateExercise({
    namePt: "Aquecimento e Mobilidade de Tornozelo/Quadril",
    nameEn: "Ankle and Hip Dynamic Mobility",
    muscleCode: "calves",
    instructionsPt: "Mobilidade de tornozelo em parede, ativação de glúteos com mini-band e rotações de quadril.",
  });

  const exAgachamento = await getOrCreateExercise({
    namePt: "Agachamento Livre (Back / Front Squat)",
    nameEn: "Barbell Back / Front Squat",
    muscleCode: "quadriceps",
    instructionsPt: "Profundidade completa abaixo da paralela, tronco firme, pressão total nos pés para tripla extensão.",
  });

  const exRDL = await getOrCreateExercise({
    namePt: "Levantamento Terra Romeno (RDL)",
    nameEn: "Romanian Deadlift",
    muscleCode: "hamstrings",
    instructionsPt: "Flexão de quadril com joelhos semiflexionados, coluna neutra e alongamento ativo dos isquiotibiais.",
  });

  const exJumpSquat = await getOrCreateExercise({
    namePt: "Jump Squat com Peso Corporal",
    nameEn: "Bodyweight Jump Squat",
    muscleCode: "quadriceps",
    instructionsPt: "Descida controlada até 90 graus e explosão máxima para o alto, aterrissando na ponta dos pés com flexão suave.",
  });

  const exHipThrust = await getOrCreateExercise({
    namePt: "Hip Thrust (Elevação Pélvica com Barra)",
    nameEn: "Barbell Hip Thrust",
    muscleCode: "glutes",
    instructionsPt: "Apoio das escápulas no banco, extensão completa do quadril no topo com pausa isométrica de 1 segundo.",
  });

  const exAfundoBulgaro = await getOrCreateExercise({
    namePt: "Afundo Búlgaro (Bulgarian Split Squat)",
    nameEn: "Bulgarian Split Squat",
    muscleCode: "quadriceps",
    instructionsPt: "Pé traseiro elevado no banco, descida vertical mantendo joelho alinhado com o segundo dedo do pé.",
  });

  const exBoxJump = await getOrCreateExercise({
    namePt: "Box Jump (Salto na Caixa)",
    nameEn: "Plyometric Box Jump",
    muscleCode: "quadriceps",
    instructionsPt: "Salto explosivo a partir da meia-flexão com recepção suave amortecendo o impacto em cima da caixa.",
  });

  const exPanturrilhaPe = await getOrCreateExercise({
    namePt: "Panturrilha em Pé",
    nameEn: "Standing Calf Raise",
    muscleCode: "calves",
    instructionsPt: "Amplitude máxima no calcanhar, subida explosiva e descida controlada em 3 segundos.",
  });

  const exCoreAntiRotacao = await getOrCreateExercise({
    namePt: "Core Anti-Rotação (Pallof Press)",
    nameEn: "Pallof Press",
    muscleCode: "abdominals",
    instructionsPt: "Pés firmes na largura dos ombros, braços estendidos à frente resistindo à rotação induzida pelo cabo ou elástico.",
  });

  // Exercícios Dia 2
  const exAquecimentoDinamico = await getOrCreateExercise({
    namePt: "Aquecimento Dinâmico Completo",
    nameEn: "Full Body Dynamic Warmup",
    muscleCode: "quadriceps",
    instructionsPt: "Polichinelos, deslocamentos curtos, rotações de tronco, ativação de manguito e saltitamentos.",
  });

  const exBroadJump = await getOrCreateExercise({
    namePt: "Salto Horizontal (Broad Jump)",
    nameEn: "Broad Jump (Standing Long Jump)",
    muscleCode: "glutes",
    instructionsPt: "Balanço sincronizado dos braços com explosão para frente buscando distância e aterrissagem estável e equilibrada.",
  });

  const exSkaterJump = await getOrCreateExercise({
    namePt: "Salto Lateral (Skater Jump)",
    nameEn: "Skater Jump / Lateral Bound",
    muscleCode: "glutes",
    instructionsPt: "Salto lateral de uma perna para a outra absorvendo o impacto e sustentando 1 segundo em equilíbrio antes do próximo.",
  });

  const exDropJump = await getOrCreateExercise({
    namePt: "Drop Jump + Salto Vertical Reativo",
    nameEn: "Drop Jump to Vertical Jump",
    muscleCode: "calves",
    instructionsPt: "Queda da plataforma baixa (30cm) e conversão imediata de contato em salto vertical com tempo mínimo no solo.",
  });

  const exDeadlift = await getOrCreateExercise({
    namePt: "Levantamento Terra Convencional",
    nameEn: "Conventional Barbell Deadlift",
    muscleCode: "hamstrings",
    instructionsPt: "Puxada sólida do chão mantendo dorsais travados e extensão unificada de joelho e quadril com força bruta.",
  });

  const exStepUpExplosivo = await getOrCreateExercise({
    namePt: "Step-Up Explosivo no Caixote",
    nameEn: "Explosive Box Step-Up",
    muscleCode: "quadriceps",
    instructionsPt: "Pé todo apoiado no caixote, impulsão máxima vertical da perna de apoio tirando o pé do caixote no topo.",
  });

  const exMedBallThrow = await getOrCreateExercise({
    namePt: "Arremesso de Medicine Ball Acima da Cabeça",
    nameEn: "Overhead Medicine Ball Slam / Throw",
    muscleCode: "shoulders",
    instructionsPt: "Extensão tripla explosiva arremessando a medicine ball com força elástica de tronco e ombros.",
  });

  const exDeslocamentoLateral = await getOrCreateExercise({
    namePt: "Deslocamento Lateral com Mudança de Direção",
    nameEn: "Lateral Shuffle with Direction Change",
    muscleCode: "quadriceps",
    instructionsPt: "Passadas laterais rápidas na meia-postura com toque de solo e frenagem excêntrica na linha demarcada.",
  });

  const exPranchaLateral = await getOrCreateExercise({
    namePt: "Prancha Lateral Estática",
    nameEn: "Side Plank Hold",
    muscleCode: "abdominals",
    instructionsPt: "Corpo alinhado em linha reta da cabeça aos pés, contração máxima de oblíquos e glúteo médio.",
  });

  // Exercícios Dia 3
  const exPassadaReversa = await getOrCreateExercise({
    namePt: "Passada Reversa com Halteres",
    nameEn: "Dumbbell Reverse Lunge",
    muscleCode: "quadriceps",
    instructionsPt: "Passo para trás com toque suave do joelho posterior no chão e empurrão potente com o calcanhar anterior.",
  });

  const exPogoJump = await getOrCreateExercise({
    namePt: "Pogo Jump (Saltos Elásticos de Tornozelo)",
    nameEn: "Pogo Jumps",
    muscleCode: "calves",
    instructionsPt: "Saltos contínuos e rápidos sem flexão excessiva de joelho, focando na reatividade do tendão de Aquiles.",
  });

  const exCMJ = await getOrCreateExercise({
    namePt: "Countermovement Jump (CMJ)",
    nameEn: "Countermovement Jump",
    muscleCode: "quadriceps",
    instructionsPt: "Mãos na cintura ou balanço natural, descida rápida e reversão imediata para salto vertical máximo.",
  });

  const exApproachJump = await getOrCreateExercise({
    namePt: "Approach Jump (Salto com Passada de Ataque/Bloqueio)",
    nameEn: "Volleyball Approach Jump",
    muscleCode: "quadriceps",
    instructionsPt: "Passada de 3 passos específica de ataque do vôlei, conversão de velocidade horizontal em elevação vertical e salto no ponto mais alto.",
  });

  const exSaltosLateraisEstabilizacao = await getOrCreateExercise({
    namePt: "Saltos Laterais com Estabilização Unipodal",
    nameEn: "Single-Leg Lateral Bounds with Stick",
    muscleCode: "glutes",
    instructionsPt: "Salto lateral unipodal com 'travamento' de 2 segundos na aterrissagem, sem valgo dinâmico de joelho.",
  });

  const exPanturrilhaSentado = await getOrCreateExercise({
    namePt: "Panturrilha Sentado (Solear)",
    nameEn: "Seated Calf Raise",
    muscleCode: "calves",
    instructionsPt: "Joelhos a 90 graus isolando o músculo sóleo, amplitude completa na subida e descida.",
  });

  // Exercícios Vôlei de Praia (Areia)
  const exAquecimentoAreia = await getOrCreateExercise({
    namePt: "Aquecimento Dinâmico em Areia Fofa & Manguito",
    nameEn: "Sand Warmup & Rotator Cuff Activation",
    muscleCode: "shoulders",
    modalityCode: "beach_volleyball",
    instructionsPt: "Corrida leve em areia, saltitos, skipping e rotações de elástico para proteção da articulação glenoumeral.",
  });

  const exDeslocamentoAreia = await getOrCreateExercise({
    namePt: "Deslocamento Específico em Areia (Frente, Costas e Diagonais)",
    nameEn: "Sand Footwork & Movement Drills",
    muscleCode: "quadriceps",
    modalityCode: "beach_volleyball",
    instructionsPt: "Movimentação em areia fofa com base baixa, antecipação e arranque sem perda de tração.",
  });

  const exFundamentosPasseAtaque = await getOrCreateExercise({
    namePt: "Fundamentos Técnicos: Manchete, Passe e Levantamento",
    nameEn: "Sand Volleyball Technical Skills",
    muscleCode: "shoulders",
    modalityCode: "beach_volleyball",
    instructionsPt: "Séries de controle de bola, posicionamento atrás do vento e calibração de toque em areia.",
  });

  const exAtaqueBloqueioAreia = await getOrCreateExercise({
    namePt: "Ataque e Bloqueio com Leitura de Rede",
    nameEn: "Spike & Block Drills in Deep Sand",
    muscleCode: "quadriceps",
    modalityCode: "beach_volleyball",
    instructionsPt: "Aproximação em areia fofa com afundamento controlado e salto vertical para ataque potente e posicionamento de bloqueio.",
  });

  const exJogoOficialSets = await getOrCreateExercise({
    namePt: "Sets Oficiais em Dupla (Simulação de Jogo)",
    nameEn: "Competitive Beach Volleyball Match Sets",
    muscleCode: "quadriceps",
    modalityCode: "beach_volleyball",
    instructionsPt: "Disputa de sets em dupla (21 pontos) com aplicação sob fadiga das estratégias de saque, defesa e transição ofensiva.",
  });

  // Função auxiliar para criar rotina completa com versão, template e prescrições
  async function createFullRoutine(routineDef: {
    title: string;
    description: string;
    modalityCode: string;
    dayOfWeek: number;
    items: {
      exerciseId: string;
      sets: number;
      reps: string;
      rest: number;
      load?: number;
      notes?: string;
    }[];
  }) {
    // 1. Programa de treino
    const [program] = await db
      .insert(schema.trainingPrograms)
      .values({
        title: routineDef.title,
        description: routineDef.description,
        modalityCode: routineDef.modalityCode,
        creatorUserId: user.id,
        isArchived: false,
      })
      .returning();

    // 2. Versão 1
    const [version] = await db
      .insert(schema.programVersions)
      .values({
        programId: program.id,
        versionNumber: 1,
        changeLog: "Protocolo inicial de Força, Potência e Vôlei de Praia registrado para Conta Legado.",
        isCurrent: true,
        rawPlanData: routineDef,
      })
      .returning();

    // 3. Template
    const [template] = await db
      .insert(schema.workoutTemplates)
      .values({
        programVersionId: version.id,
        title: routineDef.title,
        dayOfWeek: routineDef.dayOfWeek,
        orderIndex: routineDef.dayOfWeek,
        notes: routineDef.description,
      })
      .returning();

    // 4. Prescrições
    for (let i = 0; i < routineDef.items.length; i++) {
      const it = routineDef.items[i];
      await db.insert(schema.templatePrescriptions).values({
        templateId: template.id,
        exerciseId: it.exerciseId,
        orderIndex: i + 1,
        targetSets: it.sets,
        targetReps: it.reps,
        targetLoadKg: it.load || null,
        restSeconds: it.rest,
        setType: "effective",
        notes: it.notes,
      });
    }

    // 5. Atribuição do programa ao atleta
    await db.insert(schema.programAssignments).values({
      programVersionId: version.id,
      athleteUserId: user.id,
      status: "active",
    });

    console.log(`✓ Ficha cadastrada: "${routineDef.title}" (${routineDef.items.length} exercícios)`);
    return program.id;
  }

  // Cadastrar as 5 Rotinas Semanais
  console.log("\nCadastrando programações semanais no banco de dados...");

  // DIA 1
  await createFullRoutine({
    title: "Dia 1 · Força + Tripla Extensão + Salto Vertical",
    description: "Foco primário em força absoluta, tripla extensão de tornozelo/joelho/quadril e impulsão vertical.",
    modalityCode: "strength",
    dayOfWeek: 1,
    items: [
      { exerciseId: exAquecimentoMobilidade, sets: 1, reps: "5-10 min", rest: 60, notes: "Mobilidade ativa de tornozelo e quadril" },
      { exerciseId: exAgachamento, sets: 4, reps: "5-6", rest: 120, notes: "Agachamento livre ou front squat com controle na descida" },
      { exerciseId: exRDL, sets: 3, reps: "6-8", rest: 90, notes: "Levantamento terra romeno focando em isquiotibiais e glúteos" },
      { exerciseId: exJumpSquat, sets: 4, reps: "4-5", rest: 90, notes: "Explosão máxima na fase concêntrica" },
      { exerciseId: exHipThrust, sets: 3, reps: "6-8", rest: 90, notes: "Extensão potente com barra e trava glútea no topo" },
      { exerciseId: exAfundoBulgaro, sets: 3, reps: "6 cada perna", rest: 75, notes: "Foco em estabilidade e força unilateral de quadríceps" },
      { exerciseId: exBoxJump, sets: 3, reps: "4", rest: 90, notes: "Salto na caixa com aterrissagem suave" },
      { exerciseId: exPanturrilhaPe, sets: 3, reps: "10-12", rest: 60, notes: "Pausa isométrica de 1s no pico de contração" },
      { exerciseId: exCoreAntiRotacao, sets: 3, reps: "10 cada lado", rest: 60, notes: "Resistência de tronco e anti-rotação com cabo/elástico" },
    ],
  });

  // DIA 2
  await createFullRoutine({
    title: "Dia 2 · Potência + Pliometria + Deslocamento",
    description: "Estímulo neuromuscular de velocidade elástica, mudança de direção e potência de tração para areia.",
    modalityCode: "strength",
    dayOfWeek: 3,
    items: [
      { exerciseId: exAquecimentoDinamico, sets: 1, reps: "5-10 min", rest: 60, notes: "Aquecimento dinâmico para membros inferiores e superiores" },
      { exerciseId: exBroadJump, sets: 4, reps: "3", rest: 90, notes: "Salto horizontal com alcance máximo e aterrissagem estável" },
      { exerciseId: exSkaterJump, sets: 3, reps: "5 cada lado", rest: 75, notes: "Salto lateral com absorção de impacto no plano frontal" },
      { exerciseId: exDropJump, sets: 3, reps: "3", rest: 90, notes: "Drop jump com transição imediata para salto vertical reativo" },
      { exerciseId: exDeadlift, sets: 3, reps: "4-5", rest: 120, notes: "Carga moderada a alta mantendo aceleração máxima da barra" },
      { exerciseId: exStepUpExplosivo, sets: 3, reps: "5 cada perna", rest: 75, notes: "Subida explosiva no caixote com impulsão vertical" },
      { exerciseId: exMedBallThrow, sets: 4, reps: "5", rest: 60, notes: "Arremesso de medicine ball acima da cabeça com extensão corporal total" },
      { exerciseId: exDeslocamentoLateral, sets: 4, reps: "10m / reps", rest: 60, notes: "Deslocamento lateral em base baixa com desaceleração rápida" },
      { exerciseId: exPranchaLateral, sets: 3, reps: "30-40s cada lado", rest: 45, notes: "Isometria de core lateral com tronco retilíneo" },
    ],
  });

  // DIA 3
  await createFullRoutine({
    title: "Dia 3 · Força Unilateral + Potência Específica",
    description: "Equilíbrio neuromuscular, potência de tornozelo e salto específico simulando o gesto de ataque e bloqueio.",
    modalityCode: "strength",
    dayOfWeek: 5,
    items: [
      { exerciseId: exStepUpExplosivo, sets: 3, reps: "6 cada perna", rest: 90, notes: "Agachamento unilateral / Step-up com carga e controle" },
      { exerciseId: exHipThrust, sets: 3, reps: "8", rest: 90, notes: "Hip thrust com velocidade concêntrica controlada" },
      { exerciseId: exPassadaReversa, sets: 3, reps: "8 cada perna", rest: 75, notes: "Passada reversa garantindo estabilidade articular" },
      { exerciseId: exPogoJump, sets: 3, reps: "10-15", rest: 60, notes: "Saltos elásticos rápidos na ponta dos pés com joelho rígido" },
      { exerciseId: exCMJ, sets: 4, reps: "3", rest: 90, notes: "Salto contramovimento vertical com esforço máximo" },
      { exerciseId: exApproachJump, sets: 4, reps: "3", rest: 90, notes: "Salto com aproximação específica simulando ataque/bloqueio no voleibol" },
      { exerciseId: exSaltosLateraisEstabilizacao, sets: 3, reps: "5 cada lado", rest: 60, notes: "Salto lateral com sustentação firme e alinhada" },
      { exerciseId: exPanturrilhaSentado, sets: 3, reps: "12-15", rest: 60, notes: "Fortalecimento do sóleo para resistência de impacto" },
      { exerciseId: exCoreAntiRotacao, sets: 3, reps: "10 cada lado", rest: 60, notes: "Pallof press garantindo transferência de torque do tronco" },
    ],
  });

  // DIA 4 - VÔLEI DE PRAIA TÉCNICO
  await createFullRoutine({
    title: "Dia 4 · Vôlei de Praia: Fundamentos & Deslocamento em Areia",
    description: "Sessão na praia com foco em tração na areia fofa, leitura de vento, manchete, levantamento e impulsão.",
    modalityCode: "beach_volleyball",
    dayOfWeek: 2,
    items: [
      { exerciseId: exAquecimentoAreia, sets: 1, reps: "10 min", rest: 60, notes: "Ativação dinâmica na areia com ênfase em ombros e manguito rotador" },
      { exerciseId: exDeslocamentoAreia, sets: 4, reps: "15m", rest: 60, notes: "Passadas e corridas diagonais de recuperação em areia fofa" },
      { exerciseId: exFundamentosPasseAtaque, sets: 4, reps: "15 reps", rest: 60, notes: "Repetições técnicas de passe, manchete de precisão e levantamento" },
      { exerciseId: exAtaqueBloqueioAreia, sets: 4, reps: "10 saltos", rest: 90, notes: "Saltos de ataque e bloqueio na rede com leitura de bola" },
    ],
  });

  // DIA 5 - VÔLEI DE PRAIA JOGO
  await createFullRoutine({
    title: "Dia 5 · Vôlei de Praia: Jogo Competitivo em Dupla",
    description: "Aplicação prática em situação de jogo real: tomada de decisão, disputa de pontos e consistência sob fadiga.",
    modalityCode: "beach_volleyball",
    dayOfWeek: 6,
    items: [
      { exerciseId: exAquecimentoAreia, sets: 1, reps: "10 min", rest: 60, notes: "Aquecimento com bola e ativação de saque" },
      { exerciseId: exJogoOficialSets, sets: 3, reps: "1 set (21 pts)", rest: 180, notes: "Disputa de 2 a 3 sets oficiais em dupla na praia" },
      { exerciseId: exAquecimentoMobilidade, sets: 1, reps: "10 min", rest: 60, notes: "Descompressão articular pós-jogo e soltura muscular na praia" },
    ],
  });

  console.log("\n=======================================================");
  console.log("🎉 PROTOCOLO DE 5 DIAS CADASTRADO COM SUCESSO!");
  console.log("• 3 Dias de Musculação, Força & Pliometria Específica");
  console.log("• 2 Dias de Vôlei de Praia (Técnica em Areia + Jogo em Dupla)");
  console.log("• Totalmente integrados e prontos em /treinos!");
  console.log("=======================================================\n");
}

registerTraining().catch((err) => {
  console.error("Erro ao registrar treinos:", err);
  process.exit(1);
});
