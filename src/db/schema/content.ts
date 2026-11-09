import { pgTable, uuid, text, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { users } from "./identity";

export const dailyMessages = pgTable("daily_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  publishDate: date("publish_date").notNull().unique(), // Uma mensagem por dia
  messageText: text("message_text").notNull(),
  author: text("author"),
  category: text("category").notNull(), // consistencia, disciplina, recuperacao, evolucao, paciencia, autonomia, aprendizado, superacao_pessoal, conhecimento_esportivo
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const challenges = pgTable("challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id),
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  challengeType: text("challenge_type").notNull(), // frequency, consistency_week, technical
  targetMetric: text("target_metric"),
  targetValue: text("target_value"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const challengeParticipants = pgTable("challenge_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  progressValue: text("progress_value").default("0"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});
