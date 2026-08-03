import { z } from "zod";

const nullableId = z.string().uuid().nullable();
const packageSchema = z.object({ title: z.string().trim().min(1).max(200), price: z.number().min(0), tokenAmount: z.number().min(0) }).refine((item) => item.tokenAmount <= item.price, { message: "Package token cannot exceed its price", path: ["tokenAmount"] });
const addOnSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().positive(),
  maxQuantityPerBooking: z.number().int().positive().nullable().optional(),
  maxQuantityPerSlot: z.number().int().positive().nullable().optional(),
  purchaseCutoffOffsetDays: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().default(true),
});
const setupDaySchema = z.object({
  stayLocationId: nullableId.optional(),
  propertyId: nullableId.optional(),
  placeIds: z.array(z.string().uuid()).max(100).default([]),
  breakfast: z.boolean().default(false),
  lunch: z.boolean().default(false),
  dinner: z.boolean().default(false),
  notes: z.string().trim().max(5000).nullable().optional(),
  isDropOff: z.boolean().default(false),
  dropOffLocationId: nullableId.optional(),
  activities: z.array(z.object({ name: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).nullable().optional() })).max(100).default([]),
  commonInclusions: z.array(z.enum(["ILP_AND_PERMITS", "BBQ", "BONFIRE", "TRIP_GUIDE"])).max(4).default([]),
});

const crmTripFields = z.object({
  name: z.string().trim().min(1).max(300),
  numberOfNights: z.number().int().min(0).max(365),
  totalAmount: z.number().positive(),
  tokenAmount: z.number().min(0),
  destinationId: z.string().uuid(),
  airportPickupEnabled: z.boolean().default(false),
  airportDropEnabled: z.boolean().default(false),
  packages: z.array(packageSchema).max(30).default([]),
  addOns: z.array(addOnSchema).max(50).default([]),
  days: z.array(setupDaySchema).max(366).optional(),
  manualInclusions: z.array(z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().max(2000).nullable().optional() })).max(100).default([]),
  exclusions: z.array(z.string().trim().min(1).max(300)).max(100).default([]),
  websiteOverview: z.string().trim().max(20000).nullable().optional(),
  websiteFaqs: z.array(z.object({ question: z.string().trim().min(1).max(500), answer: z.string().trim().min(1).max(5000) })).max(100).default([]),
  websiteTags: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  websiteBannerImages: z.array(z.string().url()).max(20).default([]),
  websiteStayTransportImages: z.array(z.string().url()).max(20).default([]),
  websiteHighlights: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
});

export const createCrmTripSchema = crmTripFields.refine((data) => data.tokenAmount <= data.totalAmount, { message: "Token amount cannot exceed the total amount", path: ["tokenAmount"] });

export const updateCrmTripSchema = crmTripFields.partial().refine(
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
