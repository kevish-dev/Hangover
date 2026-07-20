import { z } from "zod";

import { OPERATIONAL_TASK_CATEGORIES } from "../circuit/circuit.validation.js";

const itineraryDayTaskSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(OPERATIONAL_TASK_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  config: z.record(z.unknown()).default({}),
  unitPrice: z.number().positive().optional(),
  quantityNeeded: z.number().int().positive().optional(),
  dueOffsetDays: z.number().int().optional(),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  todos: z.array(z.string().trim()).default([]),
  tasks: z.array(itineraryDayTaskSchema).default([]),
});

export const createItinerarySchema = z.object({
  days: z.array(itineraryDaySchema).min(1),
  tripId: z.string().uuid().optional(),
  festivalId: z.string().uuid().optional(),
}).refine(data => data.tripId || data.festivalId, {
  message: "Either tripId or festivalId must be provided",
});

export const updateItineraryDaySchema = itineraryDaySchema.partial();
