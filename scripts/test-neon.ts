import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set in .env.local");
    process.exit(1);
  }
  console.log("Connecting to Neon...");
  const sql = neon(url);
  const result = await sql`SELECT 1 as connected, NOW() as server_time, version() as pg_version;`;
  console.log("Neon connected successfully:", result);
}

testConnection().catch((err) => {
  console.error("Connection failed:", err);
  process.exit(1);
});
