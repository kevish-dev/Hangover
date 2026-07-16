import { backfillCrm } from "../../modules/crm/crm.service.js";
import { prisma } from "../../prisma/client.js";

const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const requestedBatchSize = batchSizeArg ? Number(batchSizeArg.split("=")[1]) : 100;
const batchSize = Number.isInteger(requestedBatchSize) && requestedBatchSize > 0 && requestedBatchSize <= 1000
  ? requestedBatchSize
  : 100;

try {
  const result = await backfillCrm({ batchSize });
  console.log("CRM backfill complete", result);
} catch (error) {
  console.error("CRM backfill failed", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

