import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:password123@localhost:5433/hangover",
});

async function main() {
  await client.connect();
  console.log("Connected to PostgreSQL database");

  await client.query(`
    ALTER TABLE "CrmTrip" ALTER COLUMN "websiteStayTransportImages" DROP DEFAULT;
    ALTER TABLE "CrmTrip" ALTER COLUMN "websiteStayTransportImages" TYPE jsonb USING array_to_json("websiteStayTransportImages")::jsonb;
    ALTER TABLE "CrmTrip" ALTER COLUMN "websiteStayTransportImages" SET DEFAULT '[]'::jsonb;
  `);
  console.log("Successfully converted CrmTrip.websiteStayTransportImages to jsonb");

  await client.query(`
    ALTER TABLE "CrmFestival" ALTER COLUMN "websiteStayTransportImages" DROP DEFAULT;
    ALTER TABLE "CrmFestival" ALTER COLUMN "websiteStayTransportImages" TYPE jsonb USING array_to_json("websiteStayTransportImages")::jsonb;
    ALTER TABLE "CrmFestival" ALTER COLUMN "websiteStayTransportImages" SET DEFAULT '[]'::jsonb;
  `);
  console.log("Successfully converted CrmFestival.websiteStayTransportImages to jsonb");

  await client.end();
  console.log("Migration finished successfully!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
