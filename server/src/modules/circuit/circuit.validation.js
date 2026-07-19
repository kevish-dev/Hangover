import { z } from "zod";

// ── Enums matching Prisma exactly ──────────────────────────────────────────
export const TRIP_TYPES = [
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
  "CUSTOM_TRIP",
];

export const OPERATIONAL_TASK_CATEGORIES = [
  "HOTEL",
  "TRANSPORT",
  "PERMIT",
  "VENDOR",
  "ACTIVITY",
  "DOCUMENTATION",
  "PAYMENT_COLLECTION",
  "GENERAL",
];

// ── CircuitDayTask sub-schema ──────────────────────────────────────────────
const circuitDayTaskSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(OPERATIONAL_TASK_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  config: z.record(z.unknown()).default({}),
  estimatedAmount: z.number().positive().optional(),
  dueOffsetDays: z.number().int().optional(),
});

// ── CircuitDay sub-schema ─────────────────────────────────────────────────
const circuitDaySchema = z.object({
  id: z.string().uuid().optional(),
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  todos: z.array(z.string().trim()).default([]),
  tasks: z.array(circuitDayTaskSchema).default([]),
});

// ── Package sub-schema ────────────────────────────────────────────────────
const packageSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  price: z.number().positive(),
  tokenAmount: z.number().nonnegative(),
});

// ── AddOn sub-schema ──────────────────────────────────────────────────────
const addOnSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().positive(),
  maxQuantityPerBooking: z.number().int().positive().optional(),
  purchaseCutoffOffsetDays: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

// ── CREATE Circuit ─────────────────────────────────────────────────────────
export const createCircuitSchema = z.object({
  title: z.string().trim().min(2).max(300),
  tripType: z.enum(TRIP_TYPES),
  location: z.string().trim().min(1).max(300),
  destinationId: z.string().uuid().optional(),
  overview: z.string().trim().min(1),
  bestTimeToVisit: z.string().trim().min(1).max(500),
  duration: z.number().int().positive(),
  bannerImages: z.array(z.string().url()).default([]),
  // [{imageUrl, caption, type}] – stay/transport gallery
  stayTransportImages: z.array(z.record(z.unknown())).default([]),
  // [{icon, text}] – highlights bullet list
  highlights: z.array(z.object({ text: z.string(), imageUrl: z.string().url() })).default([]),
  inclusions: z.array(z.string().trim()).default([]),
  exclusions: z.array(z.string().trim()).default([]),
  isActive: z.boolean().default(true),
  operationsReminderDays: z.number().int().nonnegative().default(3),
  internalNotes: z.string().trim().max(5000).optional(),
  // Nested creations ─────────────────────────────────────────────
  days: z.array(circuitDaySchema).default([]),
  packages: z.array(packageSchema).default([]),
  addOns: z.array(addOnSchema).default([]),
  // tagIds – existing TripTag IDs to connect
  tagIds: z.array(z.string().uuid()).default([]),
  faqs: z.array(z.object({
    id: z.string().uuid().optional(),
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    order: z.number().int().optional(),
  })).default([]),
});

// ── UPDATE Circuit (root fields only – days/tasks via sub-routes) ─────────
export const updateCircuitSchema = createCircuitSchema
  .partial();

// ── CREATE / UPDATE CircuitDay ────────────────────────────────────────────
export const createCircuitDaySchema = circuitDaySchema;
export const updateCircuitDaySchema = circuitDaySchema
  .partial()
  .omit({ tasks: true });

// ── CREATE / UPDATE CircuitDayTask ────────────────────────────────────────
export const createCircuitDayTaskSchema = circuitDayTaskSchema;
export const updateCircuitDayTaskSchema = circuitDayTaskSchema.partial();
