import * as analyticsService from "./analytics.service.js";
import { prisma } from "../../prisma/client.js";
import asyncHandler from "../../utils/catchAsync.js";

export const getAnalytics = asyncHandler(async (req, res) => {
  const { timeframe = "1M" } = req.query;
  
  const data = await analyticsService.getDashboardAnalytics(timeframe);

  res.status(200).json({
    success: true,
    data
  });
});


export const getOverview = asyncHandler(async (_req, res) => {
  const [tripCount, activeBookingCount, openTaskCount] = await Promise.all([
    prisma.crmTrip.count(),
    prisma.booking.count({ where: { status: { in: ["PENDING", "RESERVED", "CONFIRMED"] } } }),
    prisma.operationalTask.count({ where: { status: { notIn: ["DONE", "CANCELLED"] } } }),
  ]);
  res.json({ tripCount, activeBookingCount, openTaskCount });
});
