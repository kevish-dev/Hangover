import { z } from "zod";

export const imageSchema = z.object({
  url: z.string().trim().min(1),
  caption: z.string().trim().optional().nullable(),
});

export const highlightSchema = z.object({
  imageUrl: z.string().trim().optional().nullable(),
  text: z.string().trim().min(1).max(1000),
  caption: z.string().trim().optional().nullable(),
});

export const imageFieldsSchema = {
  imageUrl: z.string().trim().optional().nullable(),
  images: z.array(imageSchema).optional().nullable(),
};

export const masterDataSchema = ({ ownerField, extraFields = {} }) => z.object({
  [ownerField]: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  ...extraFields,
});

export const validateBody = (schema, handler) => async (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    return handler(req, res, next);
  } catch (error) { return next(error); }
};

