import { z } from "zod";

const tripTypes = [
  "MOUNTAIN_TREK",
  "BEACH_ESCAPE",
  "DESERT_EXPEDITION",
  "JUNGLE_WILDLIFE",
  "HERITAGE_WALK",
  "ROAD_TRIP",
  "BACKPACKING_TOUR",
  "PHOTOGRAPHY_TOUR",
  "BONFIRE_RETREAT",
  "INSTITUTE_COLLEGE_TRIP",
  "CUSTOM_TRIP"
];

export const createInquirySchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).default(""),
  tripType: z.enum(tripTypes).optional(),
  tripId: z.string().uuid().optional(),
  festivalId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(2).max(5000),
}).refine((data) => !(data.tripId && data.festivalId), {
  message: "An inquiry can reference a trip or a festival, not both.",
});
