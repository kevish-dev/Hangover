import service from "./stay-location.service.js";
import { createCrudController } from "../crm-master/crm-master.controller.js";
export default createCrudController(service, { ownerQuery: "destinationId" });
