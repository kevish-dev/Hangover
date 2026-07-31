import controller from "./crm-destination.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(200) });
export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });
