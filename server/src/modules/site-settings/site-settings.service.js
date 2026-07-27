import { prisma } from "../../prisma/client.js";

const SETTINGS_ID = "default";

export const getSiteSettings = () =>
  prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
    select: { maintenanceMode: true, updatedAt: true },
  });

export const updateMaintenanceMode = (maintenanceMode) =>
  prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { maintenanceMode },
    create: { id: SETTINGS_ID, maintenanceMode },
    select: { maintenanceMode: true, updatedAt: true },
  });
