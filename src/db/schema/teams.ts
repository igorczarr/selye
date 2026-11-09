import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { sports } from "./sports";

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  description: text("description"),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  privacy: text("privacy").default("invite_only").notNull(), // public, private, invite_only
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teamMemberships = pgTable("team_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("athlete").notNull(), // owner, admin, head_coach, coach, assistant, athlete
  status: text("status").default("active").notNull(), // active, pending_approval, suspended, left
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  inviterId: uuid("inviter_id").notNull().references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  inviteType: text("invite_type").default("link").notNull(), // direct, link, request
  targetEmail: text("target_email"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  status: text("status").default("active").notNull(), // active, revoked, exhausted, expired
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teamGroups = pgTable("team_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sportId: uuid("sport_id").references(() => sports.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
