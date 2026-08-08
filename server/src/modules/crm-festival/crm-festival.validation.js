import { z } from "zod";

const nullableId = z.string().uuid().nullable();
const tripTypeSchema = z.enum(["MOUNTAIN_TREK", "BEACH_ESCAPE", "DESERT_EXPEDITION", "JUNGLE_WILDLIFE", "HERITAGE_WALK", "ROAD_TRIP", "BACKPACKING_TOUR", "PHOTOGRAPHY_TOUR", "BONFIRE_RETREAT", "INSTITUTE_COLLEGE_TRIP", "CUSTOM_TRIP"]);
const packageSchema = z.object({ title: z.string().trim().min(1).max(200), price: z.number().min(0), tokenAmount: z.number().min(0) }).refine((item) => item.tokenAmount <= item.price, { message: "Package token cannot exceed its price", path: ["tokenAmount"] });
const addOnSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  price: z.number().positive(),
  maxQuantityPerBooking: z.number().int().positive().nullable().optional(),
  maxQuantityPerSlot: z.number().int().positive().nullable().optional(),
  purchaseCutoffOffsetDays: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().default(true),
});
const slotSchema = z.object({
  id: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  title: z.string().trim().max(200).nullable().optional(),
  priority: z.number().int().default(0),
  capacity: z.number().int().positive(),
});
const setupDaySchema = z.object({
  stayLocationId: nullableId.optional(),
  propertyId: nullableId.optional(),
  placeIds: z.array(z.string().uuid()).max(100).default([]),
  breakfast: z.boolean().default(false),
  lunch: z.boolean().default(false),
  dinner: z.boolean().default(false),
  transportEnabled: z.boolean().default(false),
  transportText: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  isDropOff: z.boolean().default(false),
  dropOffLocationId: nullableId.optional(),
  activities: z.array(z.object({ name: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).nullable().optional() })).max(100).default([]),
  commonInclusions: z.array(z.enum(["ILP_AND_PERMITS", "BBQ", "BONFIRE", "TRIP_GUIDE"])).max(4).default([]),
});

const highlightSchema = z.union([
  z.object({
    text: z.string().trim().min(1).max(500),
    imageUrl: z.string().trim().max(2000).optional().default(""),
  }),
  z.string().trim().min(1).max(500),
]);

const crmFestivalFields = z.object({
  name: z.string().trim().min(1).max(300),
  numberOfNights: z.number().int().min(0).max(365),
  totalAmount: z.number().positive(),
  tokenAmount: z.number().min(0),
  destinationId: z.string().uuid(),
  tripType: tripTypeSchema.nullable().optional(),
  bestTimeToVisit: z.string().trim().max(300).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  isListed: z.boolean().default(true),
  operationsReminderDays: z.number().int().min(0).max(365).default(3),
  packages: z.array(packageSchema).max(30).default([]),
  addOns: z.array(addOnSchema).max(50).default([]),
  days: z.array(setupDaySchema).max(366).optional(),
  manualInclusions: z.array(z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).nullable().optional() })).max(100).default([]),
  exclusions: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
  slots: z.array(slotSchema).min(1, "At least one dated departure slot is required").max(100),
  websiteOverview: z.string().trim().max(20000).nullable().optional(),
  websiteFaqs: z.array(z.object({ question: z.string().trim().min(1).max(500), answer: z.string().trim().min(1).max(5000) })).max(100).default([]),
  websiteTagIds: z.array(z.string().uuid()).max(50).default([]),
  websiteBannerImages: z.array(z.string().trim().min(1).max(2000)).max(20).default([]),
  websiteStayTransportImages: z.array(z.string().trim().min(1).max(2000)).max(20).default([]),
  websiteHighlights: z.array(highlightSchema).max(50).default([]),
  websiteVideoUrl: z.string().trim().max(2000).nullable().optional(),
});

export const createCrmFestivalSchema = crmFestivalFields.refine((data) => data.tokenAmount <= data.totalAmount, { message: "Token amount cannot exceed the total amount", path: ["tokenAmount"] });

export const updateCrmFestivalSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  numberOfNights: z.number().int().min(0).max(365).optional(),
  totalAmount: z.number().positive().optional(),
  tokenAmount: z.number().min(0).optional(),
  destinationId: z.string().uuid().optional(),
  tripType: tripTypeSchema.nullable().optional(),
  bestTimeToVisit: z.string().trim().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  isListed: z.boolean().optional(),
  operationsReminderDays: z.number().int().min(0).max(365).optional(),
  packages: z.array(packageSchema).max(30).optional(),
  addOns: z.array(addOnSchema).max(50).optional(),
  days: z.array(setupDaySchema).max(366).optional(),
  manualInclusions: z.array(z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).nullable().optional() })).max(100).optional(),
  exclusions: z.array(z.string().trim().min(1).max(300)).max(100).optional(),
  slots: z.array(slotSchema).min(1, "At least one dated departure slot is required").max(100).optional(),
  websiteOverview: z.string().trim().max(20000).nullable().optional(),
  websiteFaqs: z.array(z.object({ question: z.string().trim().min(1).max(500), answer: z.string().trim().min(1).max(5000) })).max(100).optional(),
  websiteTagIds: z.array(z.string().uuid()).max(50).optional(),
  websiteBannerImages: z.array(z.string().trim().min(1).max(2000)).max(20).optional(),
  websiteStayTransportImages: z.array(z.string().trim().min(1).max(2000)).max(20).optional(),
  websiteHighlights: z.array(highlightSchema).max(50).optional(),
  websiteVideoUrl: z.string().trim().max(2000).nullable().optional(),
}).refine(
  (data) => data.tokenAmount === undefined || data.totalAmount === undefined || data.tokenAmount <= data.totalAmount,
  { message: "Token amount cannot exceed the total amount", path: ["tokenAmount"] },
);

export const updateDaySchema = z.object({
  stayLocationId: nullableId.optional(),
  propertyId: nullableId.optional(),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const replacePlacesSchema = z.object({
  placeIds: z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length, "Place IDs must be unique"),
});

export const createActivitySchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

export const updateMealsSchema = z.object({
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one meal field is required");

export const updateDropOffSchema = z.object({
  isDropOff: z.boolean(),
  dropOffLocationId: nullableId.optional(),
});

const COMMON_INCLUSION_KEYS = ["BREAKFAST", "DINNER", "TRAVEL", "VEHICLE_TYPE", "FIRST_AID_KIT"];
const VEHICLE_TYPES = ["SEDAN", "SUV", "INNOVA", "TRAVELLER"];

export const updateCommonInclusionSchema = z.object({
  key: z.enum(COMMON_INCLUSION_KEYS),
  numberOfDays: z.number().int().min(0).max(365).optional(),
  isIncluded: z.boolean().optional(),
  vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
}).superRefine((value, context) => {
  const dayCountKeys = ["BREAKFAST", "DINNER", "TRAVEL"];
  const booleanKeys = ["FIRST_AID_KIT"];
  if (dayCountKeys.includes(value.key) && value.numberOfDays === undefined) context.addIssue({ code: "custom", message: "numberOfDays is required for this inclusion" });
  if (booleanKeys.includes(value.key) && value.isIncluded === undefined) context.addIssue({ code: "custom", message: "isIncluded is required for this inclusion" });
  if (value.key === "VEHICLE_TYPE" && value.vehicleType === undefined) context.addIssue({ code: "custom", message: "vehicleType is required for this inclusion" });
});

export const updateDayCommonInclusionSchema = z.object({
  key: z.enum(["ILP_AND_PERMITS", "BBQ", "BONFIRE", "TRIP_GUIDE"]),
  isIncluded: z.boolean(),
});

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) { next(error); }
};
