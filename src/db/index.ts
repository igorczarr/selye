import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const client = neon(connectionString);
export const db = drizzle(client, { schema });
export type Database = typeof db;
