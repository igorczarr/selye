import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

export type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | null = null;

function getDbInstance(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not defined in environment variables. Configure DATABASE_URL in your Vercel Project Settings -> Environment Variables."
    );
  }

  const client = neon(connectionString);
  cachedDb = drizzle(client, { schema });
  return cachedDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const instance = getDbInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

