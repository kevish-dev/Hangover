import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import env from "../core/env/env.js";
import { postgresQueryDurationSeconds, registerPostgresPoolMetrics } from "../core/metrics/metrics.js";

const { Pool } = pg;

const connectionString = `${env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] });

registerPostgresPoolMetrics(pool);
prisma.$on("query", ({ query, duration }) => {
  // Health probes run SELECT 1 frequently. Keep that traffic out of SQL latency.
  if (query.trim() !== "SELECT 1") postgresQueryDurationSeconds.observe(duration / 1000);
});

export { prisma };
