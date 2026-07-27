import * as analyticsService from "./analytics.service.js";
import asyncHandler from "../../utils/catchAsync.js";

export const getAnalytics = asyncHandler(async (req, res) => {
  const { timeframe = "1M" } = req.query;
  
  const data = await analyticsService.getDashboardAnalytics(timeframe);

  res.status(200).json({
    success: true,
    data
  });
});
