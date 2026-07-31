import service from "./transfer-location.service.js";
import { createCrudController } from "../crm-master/crm-master.controller.js";
export default createCrudController(service, { ownerQuery: "destinationId" });
