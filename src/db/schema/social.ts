import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { teams } from "./teams";
import { workoutSessions } from "./workout";

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  sessionId: uuid("session_id").references(() => workoutSessions.id), // PÓS ritual vinculado ao treino
  postType: text("post_type").default("workout_report").notNull(), // workout_report (PÓS), team_announcement, general_post
  contentText: text("content_text"),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  visibility: text("visibility").default("team_only").notNull(), // public, followers, team_only, private
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: uuid("parent_comment_id"),
  contentText: text("content_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reactions = pgTable("reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reactionType: text("reaction_type").default("like").notNull(), // like, fire, muscle, applause
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: uuid("id").defaultRandom().primaryKey(),
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("accepted").notNull(), // accepted, pending
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
