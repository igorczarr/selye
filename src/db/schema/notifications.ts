import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./identity";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // training, team, social, engagement
  title: text("title").notNull(),
  body: text("body").notNull(),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // training, team, social, engagement
  channelInApp: boolean("channel_in_app").default(true).notNull(),
  channelPush: boolean("channel_push").default(true).notNull(),
  channelEmail: boolean("channel_email").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
