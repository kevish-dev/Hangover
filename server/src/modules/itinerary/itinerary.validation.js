import { z } from "zod";

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  todos: z.array(z.string().trim()).default([]),
});

export const createItinerarySchema = z.object({
  days: z.array(itineraryDaySchema).min(1),
  tripId: z.string().uuid().optional(),
  festivalId: z.string().uuid().optional(),
}).refine(data => data.tripId || data.festivalId, {
  message: "Either tripId or festivalId must be provided",
});

export const updateItineraryDaySchema = itineraryDaySchema.partial();
