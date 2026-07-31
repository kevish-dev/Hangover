import controller from "./stay-location.controller.js";
import { createCrudRoutes } from "../crm-master/crm-master.routes.js";
import { masterDataSchema } from "../crm-master/crm-master.validation.js";

const schema = masterDataSchema({ ownerField: "destinationId" });
export default createCrudRoutes(controller, { createSchema: schema, updateSchema: schema.partial() });
