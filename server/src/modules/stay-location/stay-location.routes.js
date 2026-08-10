import controller from "./stay-location.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { masterDataSchema, imageFieldsSchema, highlightSchema } from "../crm-master/crm-master.validation.js";
import { z } from "zod";

const schema = masterDataSchema({
  ownerField: "destinationId",
  extraFields: {
    ...imageFieldsSchema,
    highlights: z.array(highlightSchema).optional().nullable(),
  },
});
export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });

