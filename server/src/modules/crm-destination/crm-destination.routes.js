import controller from "./crm-destination.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { imageFieldsSchema, highlightSchema } from "../crm-master/crm-master.validation.js";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  ...imageFieldsSchema,
  highlights: z.array(highlightSchema).optional().nullable(),
});
export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });
