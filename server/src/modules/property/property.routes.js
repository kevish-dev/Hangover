import controller from "./property.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { z } from "zod";
import { masterDataSchema } from "../crm-master/crm-master.validation.js";

const schema = masterDataSchema({ ownerField: "stayLocationId", extraFields: { address: z.string().trim().max(500).optional().nullable() } });
export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });
