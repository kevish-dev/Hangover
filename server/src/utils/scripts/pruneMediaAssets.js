import { prisma } from "../../prisma/client.js";
import { deleteMediaAsset } from "../../core/services/upload.service.js";

// Removes abandoned authenticated uploads. Schedule this hourly in production.
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

try {
  await prisma.$connect();
  const assets = await prisma.mediaAsset.findMany({
    where: {
      createdAt: { lt: cutoff },
      profileGovtId: null,
      travelerGovtId: null,
    },
  });

  for (const asset of assets) {
    try {
      await deleteMediaAsset(asset);
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
    } catch {
      console.error(`Failed to prune media asset ${asset.id}`);
    }
  }
  console.log(`Pruned ${assets.length} abandoned media asset(s).`);
} finally {
  await prisma.$disconnect();
}
