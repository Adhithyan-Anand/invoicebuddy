import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

import fs from "fs";

const ssl =
  process.env.DATABASE_URL?.includes("rds.amazonaws.com")
    ? {
        ca: fs.readFileSync("rds-ca.pem").toString(),
        rejectUnauthorized: true,
      }
    : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});
export const db = drizzle(pool, { schema });
