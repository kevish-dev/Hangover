import { z } from "zod";

export const createInterestSubmissionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .or(z.literal(""))
      .nullable()
      .optional(),
    whatsapp: z.string().trim().max(50).nullable().optional(),
    instagram: z.string().trim().max(100).nullable().optional(),
    crmTripId: z.string().uuid().nullable().optional(),
    crmFestivalId: z.string().uuid().nullable().optional(),
    tripId: z.string().uuid().nullable().optional(),
    festivalId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      const email = data.email?.trim();
      const whatsapp = data.whatsapp?.trim();
      const instagram = data.instagram?.trim();
      return Boolean(email || whatsapp || instagram);
    },
    {
      message: "At least one contact method (Email, WhatsApp, or Instagram) is required",
      path: ["email"],
    },
  )
  .refine(
    (data) =>
      Boolean(
        data.crmTripId ||
          data.crmFestivalId ||
          data.tripId ||
          data.festivalId,
      ),
    {
      message: "Associated trip or festival ID is required",
      path: ["crmTripId"],
    },
  );

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
