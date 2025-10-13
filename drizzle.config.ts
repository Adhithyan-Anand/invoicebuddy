import { defineConfig } from "drizzle-kit";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

/**
 * SSL configuration:
 * - Prefer explicit CA via DB_SSL_CA_PATH or known bundled certs (rds-global.pem / rds-ca.pem)
 * - Allow opting into self-signed for migrations by setting DRIZZLE_ALLOW_SELF_SIGNED=1
 * - As a last resort, if URL matches common managed providers and no CA is found, allow self-signed
 */
const caPath =
  process.env.DB_SSL_CA_PATH ||
  (fs.existsSync("rds-global.pem") ? "rds-global.pem" : fs.existsSync("rds-ca.pem") ? "rds-ca.pem" : undefined);

let ssl: any = undefined;
if (process.env.DRIZZLE_ALLOW_SELF_SIGNED === "1") {
  ssl = { rejectUnauthorized: false };
} else if (caPath) {
  ssl = { ca: fs.readFileSync(caPath).toString(), rejectUnauthorized: true };
} else if (/amazonaws\.com|neon\.tech|azure|render\.com/i.test(process.env.DATABASE_URL)) {
  // fallback to accept self-signed when connecting to common managed providers if no CA is available
  ssl = { rejectUnauthorized: false };
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl,
  },
});
