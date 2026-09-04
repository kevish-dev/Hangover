import * as repository from "./interest.repository.js";
import { AppError } from "../../core/errors/errors.js";

export const submitInterest = async (data) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existing = await repository.findRecentSubmission({
    userId: data.userId,
    visitorToken: data.visitorToken,
    crmTripId: data.crmTripId,
    crmFestivalId: data.crmFestivalId,
    tripId: data.tripId,
    festivalId: data.festivalId,
    sinceDate: twentyFourHoursAgo,
  });

  if (existing) {
    throw new AppError(
      "You have already expressed interest for this trip in the last 24 hours.",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  return repository.createSubmission(data);
};

export const getInterestOverview = async () => {
  const items = await repository.findEnabledTripsAndFestivalsWithSubmissions();
  const totalSubmissions = items.reduce(
    (sum, item) => sum + item.submissions.length,
    0,
  );
  return {
    totalEnabledCount: items.length,
    totalSubmissionsCount: totalSubmissions,
    items,
  };
};

export const removeInterestSubmission = async (id) => {
  return repository.deleteSubmission(id);
};
