import { z } from "zod";
import controller from "./place.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { masterDataSchema, imageFieldsSchema, highlightSchema } from "../crm-master/crm-master.validation.js";

const schema = masterDataSchema({
  ownerField: "stayLocationId",
  extraFields: {
    ...imageFieldsSchema,
    highlights: z.array(highlightSchema).optional().nullable(),
  },
});

export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });


