/**
 * SELYE — Pipeline de Tradução PT-BR e Enriquecimento de Mídia (Fase 4)
 * 1. Traduz para PT-BR todos os nomes, instruções passo a passo e notas de segurança
 *    de exercícios importados em inglês.
 * 2. Associa imagens de passo a passo do `free-exercise-db` (Domínio Público / Unlicense)
 *    no campo `exercises.media_urls`.
 *
 * Uso:
 *   npx tsx scripts/enrich-exercise-media.ts          # simulação (não grava nada)
 *   npx tsx scripts/enrich-exercise-media.ts --apply  # grava no banco Neon
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import {
  buildFreeExerciseDbImages,
  looksEnglish,
} from "../src/core/catalog/exercise-media";

dotenv.config({ path: ".env.local" });

const DATASET_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

interface DatasetExercise {
  id: string;
  name: string;
  images: string[];
}

interface PtTranslation {
  namePt: string;
  instructionsPt: string;
  safetyInfoPt?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Mapeamento normalizado -> nome exato no free-exercise-db */
const IMAGE_ALIASES: Record<string, string> = {
  "barbell back / front squat": "Barbell Full Squat",
  "barbell back squat to box": "Box Squat",
  "bodyweight jump squat": "Freehand Jump Squat",
  "bulgarian split squat": "Split Squat with Dumbbells",
  "plyometric box jump": "Front Box Jump",
  "pallof press": "Pallof Press",
  "conventional barbell deadlift": "Barbell Deadlift",
  "standing calf raise": "Standing Calf Raises",
  "seated calf raise": "Seated Calf Raise",
  "dumbbell reverse lunge": "Dumbbell Lunges",
  "side plank hold": "Side Bridge",
  "overhead medicine ball slam / throw": "Overhead Slam",
  "explosive box step up": "Dumbbell Step Ups",
  "broad jump standing long jump": "Standing Long Jump",
  "drop jump to vertical jump": "Linear Depth Jump",
  "skater jump / lateral bound": "Lateral Bound",
  "single leg lateral bounds with stick": "Lateral Bound",
  "lateral shuffle with direction change": "Side to Side Box Shuffle",
  "pogo jumps": "Rope Jumping",
  "countermovement jump": "Vertical Jump",
  "volleyball approach jump": "Front Box Jump",
  "jumping rope": "Rope Jumping",
  "romanian deadlift with dumbbells": "Stiff-Legged Dumbbell Deadlift",
  "nordic hamstring curl": "Natural Glute Ham Raise",
  "glute bridge": "Barbell Glute Bridge",
  "single leg cable hip extension": "One-Legged Cable Kickback",
  "elbow plank": "Plank",
  "close grip bench press": "Close-Grip Barbell Bench Press",
  "incline dumbbell bench press": "Incline Dumbbell Press",
  "low cable cross over": "Low Cable Crossover",
  "chest dip": "Dips - Chest Version",
  "wide grip barbell curl": "Wide-Grip Standing Barbell Curl",
  "ez bar spider curl": "Spider Curl",
  "biceps curl to shoulder press": "Bicep Curl To Shoulder Press",
  "concentration curl": "Concentration Curls",
  "flexor incline dumbbell hammer curl": "Flexor Incline Dumbbell Curls",
  "single arm cable triceps extension": "Cable One Arm Tricep Extension",
  "triceps dip": "Dips - Triceps Version",
  "decline ez bar skullcrusher": "Decline EZ Bar Triceps Extension",
  "cable v bar push down": "Triceps Pushdown - V-Bar Attachment",
  "weighted pull up": "Weighted Pull Ups",
  "pull up": "Pullups",
  "close grip pull down": "Close-Grip Front Lat Pulldown",
  "v bar pull up": "V-Bar Pulldown",
  "single leg press": "Single Leg Push-off",
  "landmine twist": "Landmine 180's",
  "suspended ab fall out": "Ab Roller",
  "standing cable low to high twist": "Cable Woodchoppers",
};

/** Traduções biomecânicas curadas em PT-BR para os exercícios em inglês do banco */
const PT_TRANSLATIONS: Record<string, PtTranslation> = {
  "dumbbell bench press": {
    namePt: "Supino Reto com Halteres",
    instructionsPt:
      "1. Deite no banco reto com os pés firmes no chão e as escápulas retraídas.\n2. Segure os halteres na linha do peitoral com os cotovelos a cerca de 45° do tronco.\n3. Empurre os halteres para cima até estender os braços sem perder a estabilidade dos ombros.\n4. Desça de forma controlada até sentir alongamento confortável do peitoral.",
    safetyInfoPt:
      "Evite abrir os cotovelos a 90° e mantenha os punhos neutros alinhados sobre os antebraços.",
  },
  pushups: {
    namePt: "Flexão de Braços",
    instructionsPt:
      "1. Apoie as mãos um pouco mais largas que os ombros e estenda as pernas mantendo o corpo em prancha firme.\n2. Desça o peito em direção ao solo com os cotovelos apontando levemente para trás.\n3. Empurre o chão com força até estender os cotovelos preservando o alinhamento do quadril.",
    safetyInfoPt: "Não deixe a lombar ceder durante a subida; mantenha abdômen e glúteos contraídos.",
  },
  "close grip bench press": {
    namePt: "Supino Fechado (Ênfase em Tríceps)",
    instructionsPt:
      "1. Deite no banco reto e segure a barra com pegada na largura dos ombros.\n2. Desça a barra de maneira controlada em direção à parte inferior do peitoral mantendo os cotovelos próximos ao tronco.\n3. Empurre a barra para cima focando na extensão dos tríceps.",
  },
  "dumbbell flyes": {
    namePt: "Crucifixo Reto com Halteres",
    instructionsPt:
      "1. Deite no banco reto com halteres acima do peito, palmas voltadas uma para a outra e leve flexão fixa nos cotovelos.\n2. Abra os braços em arco amplo até a linha dos ombros.\n3. Feche os braços contraindo o peitoral até aproximar os halteres no topo.",
  },
  "incline dumbbell bench press": {
    namePt: "Supino Inclinado com Halteres",
    instructionsPt:
      "1. Ajuste o banco entre 30° e 45° e apoie bem as costas e escápulas.\n2. Empurre os halteres para cima convergindo levemente sem batê-los.\n3. Retorne de forma controlada até a linha superior do peitoral.",
  },
  "low cable cross over": {
    namePt: "Crucifixo na Polia Baixa (Cross-over)",
    instructionsPt:
      "1. Posicione-se no centro do crossover com as polias ajustadas na posição baixa.\n2. Com os cotovelos semiflexionados, eleve os cabos em arco diagonal até a altura do peito superior.\n3. Retorne lentamente mantendo tensão contínua.",
  },
  "barbell bench press medium grip": {
    namePt: "Supino Reto com Barra",
    instructionsPt:
      "1. Deite no banco com os olhos sob a barra, pés firmes no chão e escápulas fechadas.\n2. Retire a barra e desça em trajetória controlada até tocar suavemente o meio do peitoral.\n3. Empurre de volta à posição inicial mantendo o tronco estável.",
    safetyInfoPt: "Use travas de segurança ou acompanhante ao trabalhar com cargas próximas da máxima.",
  },
  "chest dip": {
    namePt: "Mergulho nas Paralelas (Peitoral)",
    instructionsPt:
      "1. Apoie-se nas barras paralelas inclinando levemente o tronco à frente.\n2. Desça de forma controlada até os ombros ficarem próximos à linha dos cotovelos.\n3. Empurre para cima contraindo peitoral inferior e tríceps.",
  },
  "decline dumbbell flyes": {
    namePt: "Crucifixo Declinado com Halteres",
    instructionsPt:
      "1. Fixe as pernas no banco declinado e posicione os halteres acima do peitoral.\n2. Abra os braços mantendo leve flexão constante nos cotovelos.\n3. Retorne em arco fechando os halteres acima da linha inferior do peito.",
  },
  "bodyweight flyes": {
    namePt: "Crucifixo com Peso Corporal (Fita ou Anéis)",
    instructionsPt:
      "1. Segure as alças em posição inclinada com o core travado.\n2. Abra os braços lateralmente controlando o peso do corpo.\n3. Empurre as alças de volta ao centro contraindo o peitoral.",
  },
  "incline hammer curls": {
    namePt: "Rosca Martelo no Banco Inclinado",
    instructionsPt:
      "1. Sente no banco inclinado a 45° com os braços estendidos ao lado do corpo e pegada neutra.\n2. Flexione os cotovelos levando os halteres em direção aos ombros sem avançar os cotovelos.\n3. Desça lentamente até alongar completamente o bíceps.",
  },
  "wide grip barbell curl": {
    namePt: "Rosca Direta com Barra (Pegada Aberta)",
    instructionsPt:
      "1. Em pé, segure a barra com pegada um pouco mais aberta que os ombros.\n2. Flexione os cotovelos elevando a barra sem balançar o tronco.\n3. Controle a descida até a extensão quase completa.",
  },
  "ez bar spider curl": {
    namePt: "Rosca Spider com Barra W",
    instructionsPt:
      "1. Apoie o peito no encosto inclinado de um banco com os braços pendendo verticalmente à frente.\n2. Flexione os cotovelos puxando a barra W para cima com pico de contração.\n3. Desça de forma lenta sem perder tensão.",
  },
  "hammer curls": {
    namePt: "Rosca Martelo com Halteres",
    instructionsPt:
      "1. Em pé, segure os halteres ao lado do corpo com as palmas voltadas para dentro.\n2. Flexione os cotovelos mantendo os punhos neutros até o topo.\n3. Desça de maneira controlada enfatizando braquial e antebraços.",
  },
  "ez bar curl": {
    namePt: "Rosca Direta com Barra W",
    instructionsPt:
      "1. Segure a barra W na angulação anatômica com os cotovelos junto ao tronco.\n2. Eleve a barra contraindo os bíceps sem jogar a lombar para trás.\n3. Desça lentamente controlando a fase excêntrica.",
  },
  "zottman curl": {
    namePt: "Rosca Zottman",
    instructionsPt:
      "1. Faça a subida da rosca com palmas voltadas para cima (supinada).\n2. No topo, gire os punhos deixando as palmas voltadas para baixo (pronada).\n3. Desça lentamente em 3 segundos e gire novamente na base.",
  },
  "kneeling cable triceps extension": {
    namePt: "Extensão de Tríceps Ajoelhado na Polia",
    instructionsPt:
      "1. Ajoelhe-se de frente para a polia alta segurando a corda acima da cabeça.\n2. Mantenha os cotovelos fixos e estenda os antebraços à frente.\n3. Retorne de forma controlada alongando a cabeça longa do tríceps.",
  },
  "biceps curl to shoulder press": {
    namePt: "Rosca Bíceps com Desenvolvimento",
    instructionsPt:
      "1. Realize uma rosca bíceps completa levando os halteres à altura dos ombros.\n2. Gire as palmas à frente e empurre os halteres acima da cabeça.\n3. Reverta o movimento com controle até a posição inicial.",
  },
  "barbell curl": {
    namePt: "Rosca Direta com Barra Reta",
    instructionsPt:
      "1. Segure a barra na largura dos ombros com palmas voltadas para frente.\n2. Eleve a barra flexionando apenas os cotovelos.\n3. Desça de forma controlada sem impulsionar com o quadril.",
  },
  "concentration curl": {
    namePt: "Rosca Concentrada Unilateral",
    instructionsPt:
      "1. Sentado, apoie a parte posterior do braço na face interna da coxa.\n2. Flexione o cotovelo elevando o halter com máxima concentração no bíceps.\n3. Desça lentamente até estender o braço.",
  },
  "flexor incline dumbbell hammer curl": {
    namePt: "Rosca Inclinada Alternada com Halteres",
    instructionsPt:
      "1. Apoie as costas no banco inclinado deixando os braços pendentes.\n2. Flexione os cotovelos mantendo os ombros estáveis no encosto.\n3. Controle a descida completa a cada repetição.",
  },
  "single arm cable triceps extension": {
    namePt: "Tríceps Unilateral na Polia",
    instructionsPt:
      "1. Segure o pegador na polia alta com uma das mãos e fixe o cotovelo ao lado do tronco.\n2. Estenda completamente o cotovelo empurrando o cabo para baixo.\n3. Retorne controladamente sem deslocar o ombro.",
  },
  "triceps dip": {
    namePt: "Mergulho nas Paralelas (Tríceps)",
    instructionsPt:
      "1. Mantenha o tronco mais vertical nas barras paralelas com cotovelos alinhados atrás.\n2. Desça até cerca de 90° de flexão dos cotovelos.\n3. Empurre para cima estendendo os tríceps.",
  },
  "decline ez bar skullcrusher": {
    namePt: "Tríceps Testa Declinado com Barra W",
    instructionsPt:
      "1. Deite no banco declinado segurando a barra W acima do peito.\n2. Flexione os cotovelos levando a barra em direção à testa/topo da cabeça.\n3. Estenda os cotovelos retornando à posição vertical.",
  },
  "dumbbell floor press": {
    namePt: "Supino no Solo com Halteres (Floor Press)",
    instructionsPt:
      "1. Deite no solo com joelhos flexionados e segure os halteres acima do peito.\n2. Desça até os tríceps tocarem levemente o chão com breve pausa.\n3. Empurre de forma potente de volta ao topo.",
  },
  "cable v bar push down": {
    namePt: "Tríceps Pulley com Barra V",
    instructionsPt:
      "1. Segure a barra V na polia alta com tronco levemente inclinado e cotovelos colados ao corpo.\n2. Empurre a barra para baixo até extensão completa dos tríceps.\n3. Retorne lentamente até aproximadamente 90°.",
  },
  "weighted bench dip": {
    namePt: "Mergulho no Banco com Carga",
    instructionsPt:
      "1. Apoie as mãos na borda do banco e os calcanhares à frente com anilha sobre o quadril.\n2. Desça mantendo as costas próximas ao banco.\n3. Empurre para cima estendendo os cotovelos.",
  },
  "ez bar skullcrusher": {
    namePt: "Tríceps Testa com Barra W",
    instructionsPt:
      "1. Deite no banco reto com a barra W acima dos ombros.\n2. Flexione os cotovelos mantendo os braços estáveis até a barra se aproximar da testa.\n3. Estenda os cotovelos contraindo fortemente os tríceps.",
  },
  "reverse grip triceps pushdown": {
    namePt: "Tríceps Pulley com Pegada Invertida",
    instructionsPt:
      "1. Segure a barra reta na polia alta com as palmas voltadas para cima.\n2. Estenda os cotovelos empurrando a barra para baixo com controle.\n3. Retorne lentamente sem abrir os cotovelos.",
  },
  "push ups close triceps position": {
    namePt: "Flexão Fechada (Diamante / Tríceps)",
    instructionsPt:
      "1. Posicione as mãos próximas sob o peitoral formando um triângulo.\n2. Desça o peito em direção às mãos mantendo os cotovelos rentes ao tronco.\n3. Empurre o chão focando na extensão de tríceps.",
  },
  "weighted pull up": {
    namePt: "Barra Fixa com Carga",
    instructionsPt:
      "1. Com cinto de carga ou halter entre os pés, segure a barra em pegada pronada.\n2. Puxe o peito em direção à barra retraindo as escápulas.\n3. Desça controladamente até a extensão completa dos braços.",
  },
  pullups: {
    namePt: "Barra Fixa (Pegada Pronada)",
    instructionsPt:
      "1. Segure a barra com palmas para frente um pouco além da largura dos ombros.\n2. Inicie deprimindo as escápulas e puxe o queixo acima da barra.\n3. Desça de forma controlada sem balançar as pernas.",
  },
  "alternating front/behind neck pull up": {
    namePt: "Barra Fixa Alternada",
    instructionsPt:
      "1. Segure a barra em pegada aberta com escápulas ativas.\n2. Execute a puxada conduzindo o peito em direção à barra com controle articular.\n3. Desça de forma lenta preservando o conforto dos ombros.",
    safetyInfoPt:
      "Se houver desconforto nos ombros, execute todas as repetições pela frente da cabeça.",
  },
  "close grip pull down": {
    namePt: "Puxada Alta com Pegada Fechada",
    instructionsPt:
      "1. Sente-se com as coxas travadas e segure o triângulo ou barra fechada.\n2. Puxe em direção à parte superior do peito levando os cotovelos para baixo.\n3. Retorne lentamente permitindo bom alongamento dorsal.",
  },
  "pull up": {
    namePt: "Barra Fixa Tradicional",
    instructionsPt:
      "1. Pendure-se na barra com pegada firme e abdômen ativado.\n2. Puxe o corpo para cima até o queixo ultrapassar a linha da barra.\n3. Retorne lentamente até estender os braços.",
  },
  "muscle up": {
    namePt: "Muscle-Up na Barra",
    instructionsPt:
      "1. Inicie com puxada explosiva conduzindo o peito alto em direção à barra.\n2. Transicione rapidamente os ombros acima da barra inclinando o tronco à frente.\n3. Estenda os cotovelos finalizando como um mergulho acima da barra.",
  },
  "shotgun row": {
    namePt: "Remada Unilateral na Polia (Shotgun Row)",
    instructionsPt:
      "1. Posicione-se em base firme de frente para a polia baixa segurando o pegador com uma mão.\n2. Puxe o cabo em direção ao quadril retraindo a escápula.\n3. Estenda o braço novamente controlando a carga.",
  },
  "close grip front lat pulldown": {
    namePt: "Puxada Frontal Fechada (Dorsais)",
    instructionsPt:
      "1. Sente-se no aparelho de puxada com pegada fechada e tronco levemente inclinado.\n2. Puxe a barra até a altura do esterno comprimindo os dorsais.\n3. Retorne de maneira controlada até estender os braços.",
  },
  "v bar pull up": {
    namePt: "Barra Fixa Neutra com Triângulo (V-Bar)",
    instructionsPt:
      "1. Posicione o triângulo sobre a barra fixa e segure com pegada neutra.\n2. Puxe o peito em direção às mãos alternando ligeiramente o lado da cabeça.\n3. Desça controladamente até a extensão completa.",
  },
  "rope climb": {
    namePt: "Subida na Corda",
    instructionsPt:
      "1. Segure a corda alto, trave os pés em gancho firme e eleve os joelhos.\n2. Empurre com as pernas enquanto puxa alternadamente com os braços.\n3. Desça mão por mão de forma controlada sem escorregar.",
  },
  "single leg press": {
    namePt: "Leg Press Unilateral",
    instructionsPt:
      "1. Apoie apenas um pé no centro da plataforma mantendo o quadril bem encostado no banco.\n2. Flexione o joelho em amplitude segura sem tirar a lombar do apoio.\n3. Empurre a plataforma sem travar completamente o joelho.",
  },
  "clean from blocks": {
    namePt: "Arremesso dos Blocos (Clean from Blocks)",
    instructionsPt:
      "1. Posicione a barra sobre blocos na altura dos joelhos com coluna neutra.\n2. Acelere com tripla extensão explosiva de tornozelo, joelho e quadril.\n3. Receba a barra nos ombros (front rack) com amortecimento firme.",
  },
  "barbell full squat": {
    namePt: "Agachamento Completo com Barra",
    instructionsPt:
      "1. Apoie a barra sobre o trapézio com os pés na largura dos ombros.\n2. Agache controladamente abaixo da paralela mantendo peito aberto e joelhos alinhados.\n3. Suba empurrando o solo com todo o pé.",
    safetyInfoPt: "Mantenha bracing abdominal durante todo o percurso para proteger a coluna lombar.",
  },
  "tire flip": {
    namePt: "Virada de Pneu (Tire Flip)",
    instructionsPt:
      "1. Agache com o peito próximo ao pneu, mãos firmes sob a borda e coluna neutra.\n2. Empurre o chão com as pernas elevando o pneu até a altura do quadril.\n3. Inverta as mãos rapidamente e empurre o pneu para frente até virar.",
  },
  "barbell back squat to box": {
    namePt: "Agachamento na Caixa com Barra (Box Squat)",
    instructionsPt:
      "1. Com a barra nas costas, projete o quadril para trás até sentar suavemente na caixa sem relaxar o core.\n2. Pause por 1 segundo mantendo a tensão muscular.\n3. Suba de forma explosiva empurrando o solo.",
  },
  "push press": {
    namePt: "Push Press com Barra",
    instructionsPt:
      "1. Apoie a barra nos ombros à frente com cotovelos ligeiramente elevados.\n2. Faça uma pequena flexão rápida dos joelhos e estenda quadril e joelhos explosivamente.\n3. Aproveite o impulso para empurrar a barra acima da cabeça até o travamento.",
  },
  "power snatch": {
    namePt: "Arranco de Potência (Power Snatch)",
    instructionsPt:
      "1. Segure a barra em pegada bem aberta com dorsais travados.\n2. Acelere a barra rente ao corpo com extensão explosiva do quadril.\n3. Receba a barra acima da cabeça em quarto de agachamento estável.",
  },
  "hang clean": {
    namePt: "Hang Clean (Arremesso em Suspensão)",
    instructionsPt:
      "1. Inicie segurando a barra acima dos joelhos com o quadril levemente projetado atrás.\n2. Realize tripla extensão potente puxando a barra rente às coxas.\n3. Gire os cotovelos rapidamente para receber a barra nos ombros.",
  },
  "reverse band box squat": {
    namePt: "Agachamento na Caixa com Elásticos",
    instructionsPt:
      "1. Posicione a barra suspensa por elásticos no rack e sente-se controladamente na caixa.\n2. Mantenha o tronco firme e pause brevemente no apoio.\n3. Acelere na subida vencendo a resistência progressiva.",
  },
  "jumping rope": {
    namePt: "Pular Corda",
    instructionsPt:
      "1. Segure as manoplas com cotovelos próximos ao corpo e gire a corda apenas com os punhos.\n2. Salte baixo e elástico na ponta dos pés mantendo ritmo constante.\n3. Aterrisse suavemente absorvendo o impacto nos tornozelos.",
  },
  "barbell deadlift": {
    namePt: "Levantamento Terra com Barra",
    instructionsPt:
      "1. Posicione o meio dos pés sob a barra, segure firme e trave os dorsais mantendo a coluna neutra.\n2. Empurre o chão com as pernas conduzindo a barra rente às canelas e coxas.\n3. Finalize estendendo o quadril sem hiperestender a lombar.",
    safetyInfoPt: "Evite arredondar a lombar durante a saída do solo.",
  },
  "romanian deadlift with dumbbells": {
    namePt: "Levantamento Terra Romeno com Halteres",
    instructionsPt:
      "1. Segure os halteres à frente das coxas com joelhos semiflexionados.\n2. Empurre o quadril para trás mantendo a coluna reta e os halteres próximos às pernas.\n3. Retorne contraindo glúteos e posteriores de coxa.",
  },
  "clean deadlift": {
    namePt: "Terra Técnico de Arremesso (Clean Deadlift)",
    instructionsPt:
      "1. Saia em postura mais vertical com ombros ligeiramente à frente da barra.\n2. Mantenha o ângulo do tronco constante até a barra passar os joelhos.\n3. Estenda completamente o quadril no topo.",
  },
  "sumo deadlift": {
    namePt: "Levantamento Terra Sumô",
    instructionsPt:
      "1. Afaste bem os pés com as pontas voltadas para fora e segure a barra por dentro dos joelhos.\n2. Abra os joelhos na direção dos pés e mantenha o peito alto.\n3. Empurre o chão estendendo pernas e quadril simultaneamente.",
  },
  "romanian deadlift from deficit": {
    namePt: "Terra Romeno em Déficit",
    instructionsPt:
      "1. Suba sobre uma anilha ou plataforma baixa para aumentar a amplitude.\n2. Flexione o quadril mantendo coluna neutra e tensão nos posteriores.\n3. Suba estendendo o quadril com controle.",
  },
  "power clean from blocks": {
    namePt: "Power Clean dos Blocos",
    instructionsPt:
      "1. Retire a barra dos blocos mantendo costas firmes e peso no meio dos pés.\n2. Execute extensão explosiva de quadril e tornozelos.\n3. Receba nos ombros em semi-agachamento firme.",
  },
  "natural glute ham raise": {
    namePt: "Flexão Nórdica (Glute Ham Raise)",
    instructionsPt:
      "1. Ajoelhe-se com os tornozelos firmemente presos sob um apoio.\n2. Desça o corpo em linha reta o mais devagar possível freando com os posteriores de coxa.\n3. Amortecer com as mãos no chão e empurre suavemente para retornar.",
  },
  "nordic hamstring curl": {
    namePt: "Flexão Nórdica de Posteriores",
    instructionsPt:
      "1. Fixe bem os calcanhares e mantenha quadril alinhado sem dobrar a cintura.\n2. Controle a descida excêntrica usando a força dos isquiotibiais.\n3. Use leve impulso das mãos no solo para voltar à posição inicial.",
  },
  "snatch deadlift": {
    namePt: "Levantamento Terra Pegada de Arranco",
    instructionsPt:
      "1. Segure a barra com pegada aberta de arranco e quadril mais baixo.\n2. Levante a barra rente ao corpo preservando a coluna neutra.\n3. Finalize com extensão completa do quadril e ombros estáveis.",
  },
  "lying leg curls": {
    namePt: "Mesa Flexora Deitado",
    instructionsPt:
      "1. Deite de bruços alinhando o eixo do aparelho com os joelhos.\n2. Flexione os joelhos trazendo o rolo em direção aos glúteos sem levantar o quadril.\n3. Desça lentamente controlando a volta.",
  },
  "barbell glute bridge": {
    namePt: "Ponte de Glúteos com Barra",
    instructionsPt:
      "1. Deite no solo com os pés firmes e a barra acolchoada sobre o quadril.\n2. Eleve o quadril empurrando pelos calcanhares até alinhar joelhos, quadril e ombros.\n3. Segure 1 segundo no topo e desça com controle.",
  },
  "barbell hip thrust": {
    namePt: "Elevação Pélvica com Barra (Hip Thrust)",
    instructionsPt:
      "1. Apoie a base das escápulas no banco com a barra posicionada na dobra do quadril.\n2. Empurre pelos calcanhares estendendo totalmente o quadril mantendo o queixo levemente recolhido.\n3. Desça controladamente sem perder a estabilidade lombar.",
  },
  "single leg cable hip extension": {
    namePt: "Extensão de Quadril Unilateral na Polia",
    instructionsPt:
      "1. Prenda a tornozeleira na polia baixa e apoie as mãos na estrutura para estabilizar o tronco.\n2. Estenda a perna para trás contraindo o glúteo sem arquear a lombar.\n3. Retorne lentamente à posição inicial.",
  },
  "glute bridge": {
    namePt: "Ponte de Glúteos no Solo",
    instructionsPt:
      "1. Deite de costas com os joelhos flexionados e pés na largura do quadril.\n2. Eleve o quadril contraindo firmemente os glúteos no topo.\n3. Desça de forma controlada até quase tocar o solo.",
  },
  "single leg glute bridge": {
    namePt: "Ponte de Glúteos Unilateral",
    instructionsPt:
      "1. Deite de costas mantendo uma perna apoiada no chão e a outra estendida.\n2. Eleve o quadril usando a força do glúteo da perna de apoio.\n3. Desça com controle mantendo a pelve nivelada.",
  },
  "step up with knee raise": {
    namePt: "Subida no Banco com Elevação de Joelho",
    instructionsPt:
      "1. Apoie um pé inteiro sobre o banco ou caixa.\n2. Impulsione o corpo para cima elevando o joelho oposto em direção ao peito.\n3. Desça de forma controlada sem despencar.",
  },
  "kettlebell thruster": {
    namePt: "Thruster com Kettlebell",
    instructionsPt:
      "1. Segure o(s) kettlebell(s) na altura dos ombros e agache com profundidade.\n2. Suba de forma explosiva transferindo o impulso para empurrar acima da cabeça.\n3. Retorne aos ombros e inicie a próxima repetição.",
  },
  "kneeling squat": {
    namePt: "Agachamento Ajoelhado",
    instructionsPt:
      "1. Ajoelhe-se sobre colchonete firme com tronco ereto.\n2. Sente o quadril sobre os calcanhares mantendo a coluna neutra.\n3. Estenda o quadril para frente contraindo fortemente os glúteos.",
  },
  "flutter kicks": {
    namePt: "Chutes Alternados no Solo (Flutter Kicks)",
    instructionsPt:
      "1. Deite de costas pressionando a lombar contra o colchonete.\n2. Eleve ligeiramente as pernas estendidas e alterne movimentos curtos para cima e para baixo.\n3. Mantenha respiração ritmada e abdômen firme.",
  },
  "glute kickback": {
    namePt: "Coice de Glúteo em Quatro Apoios",
    instructionsPt:
      "1. Posicione-se em quatro apoios com coluna neutra e core ativado.\n2. Empurre um calcanhar para o alto mantendo o joelho flexionado a 90°.\n3. Retorne sem rotacionar o quadril.",
  },
  "landmine twist": {
    namePt: "Rotação de Tronco na Barra Landmine",
    instructionsPt:
      "1. Segure a ponta da barra landmine à frente do peito com braços quase estendidos.\n2. Gire a barra em arco de um quadril ao outro controlando a rotação pelo core.\n3. Mantenha os pés pivotando suavemente conforme o movimento.",
  },
  "elbow plank": {
    namePt: "Prancha Isométrica nos Antebraços",
    instructionsPt:
      "1. Apoie os antebraços sob os ombros e estenda as pernas formando uma linha reta.\n2. Contraia abdômen, glúteos e quadríceps evitando que o quadril caia ou suba demais.\n3. Respire de forma controlada pelo tempo prescrito.",
  },
  "bottoms up": {
    namePt: "Elevação de Quadril Invertida (Bottoms Up)",
    instructionsPt:
      "1. Deite de costas com as pernas elevadas em direção ao teto.\n2. Contraia o abdômen inferior para tirar o quadril do solo verticalmente.\n3. Desça devagar vértebra por vértebra.",
  },
  "spider crawl": {
    namePt: "Escalador Lateral (Spider Crawl)",
    instructionsPt:
      "1. Em posição de prancha alta, traga um joelho por fora em direção ao cotovelo do mesmo lado.\n2. Retorne à base firme e alterne o lado.\n3. Mantenha o quadril baixo e estável.",
  },
  "suspended ab fall out": {
    namePt: "Extensão Abdominal na Fita de Suspensão",
    instructionsPt:
      "1. Segure as alças inclinado à frente em postura de prancha firme.\n2. Estenda os braços à frente da cabeça mantendo o abdômen travado.\n3. Puxe de volta sem arquear a lombar.",
  },
  "dumbbell v sit cross jab": {
    namePt: "Abdominal V-Sit com Soco Cruzado",
    instructionsPt:
      "1. Sente-se equilibrado sobre os ísquios com tronco inclinado para trás e abdômen firme.\n2. Execute socos cruzados alternados com halteres leves mantendo a postura estável.\n3. Controle a rotação do tronco sem perder o equilíbrio.",
  },
  "standing cable low to high twist": {
    namePt: "Rotação Diagonal na Polia (Baixo para Alto)",
    instructionsPt:
      "1. Posicione-se de lado para a polia baixa segurando o pegador com as duas mãos.\n2. Puxe em diagonal cruzando o corpo até acima do ombro oposto.\n3. Retorne lentamente resistindo à força do cabo.",
  },
  "dumbbell spell caster": {
    namePt: "Rotação Diagonal com Halteres (Spell Caster)",
    instructionsPt:
      "1. Em pé com base firme, segure dois halteres juntos ao lado de um quadril.\n2. Balance em arco diagonal controlado até acima do ombro oposto travando o core.\n3. Desça controladamente para o lado contrário.",
  },
  "decline reverse crunch": {
    namePt: "Abdominal Infra no Banco Declinado",
    instructionsPt:
      "1. Deite no banco declinado segurando o apoio acima da cabeça.\n2. Traga os joelhos em direção ao peito enrolando levemente a pelve.\n3. Desça devagar mantendo tensão abdominal constante.",
  },
  cocoons: {
    namePt: "Abdominal Canivete Agrupado (Cocoons)",
    instructionsPt:
      "1. Deite de costas com braços estendidos atrás da cabeça e pernas estendidas.\n2. Flexione simultaneamente tronco e joelhos abraçando as pernas no centro.\n3. Estenda novamente com controle sem soltar a lombar.",
  },
};

async function main() {
  const apply = process.argv.includes("--apply");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");

  const db = drizzle(neon(process.env.DATABASE_URL), { schema });
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Falha ao baixar dataset: ${res.status}`);
  const dataset = (await res.json()) as DatasetExercise[];
  const byName = new Map(dataset.map((d) => [norm(d.name), d]));

  const local = await db.select().from(schema.exercises);
  let translatedCount = 0;
  let mediaCount = 0;
  const withoutMedia: string[] = [];

  for (const ex of local) {
    const keyEn = norm(ex.nameEn ?? ex.namePt);
    const keyPt = norm(ex.namePt);

    const updates: Partial<typeof schema.exercises.$inferInsert> = {};

    // 1. Tradução para PT-BR quando houver tradução mapeada e o registro ainda estiver em inglês
    const tr = PT_TRANSLATIONS[keyEn] ?? PT_TRANSLATIONS[keyPt];
    if (tr && (ex.namePt === ex.nameEn || looksEnglish(ex.instructionsPt))) {
      updates.namePt = tr.namePt;
      updates.instructionsPt = tr.instructionsPt;
      if (tr.safetyInfoPt) {
        updates.safetyInfoPt = tr.safetyInfoPt;
      }
      translatedCount++;
    }

    // 2. Enriquecimento de imagens passo a passo (free-exercise-db, domínio público)
    if (!ex.mediaUrls || ex.mediaUrls.length === 0) {
      const aliasTarget = IMAGE_ALIASES[keyEn] ?? IMAGE_ALIASES[keyPt];
      const target =
        byName.get(keyEn) ??
        (aliasTarget ? byName.get(norm(aliasTarget)) : undefined);

      if (target && target.images.length > 0) {
        updates.mediaUrls = buildFreeExerciseDbImages(target.images);
        mediaCount++;
      } else {
        withoutMedia.push(`${updates.namePt ?? ex.namePt} [${ex.nameEn ?? "—"}]`);
      }
    }

    if (Object.keys(updates).length > 0) {
      if (apply) {
        await db
          .update(schema.exercises)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(schema.exercises.id, ex.id));
      }
    }
  }

  console.log(
    `${apply ? "APLICADO" : "SIMULAÇÃO"}: ${translatedCount} traduções PT-BR, ${mediaCount} conjuntos de imagens passo a passo (total de ${local.length} exercícios).`
  );
  if (withoutMedia.length > 0) {
    console.log(
      `Sem correspondência direta de imagem (${withoutMedia.length}):\n - ` +
        withoutMedia.join("\n - ")
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
