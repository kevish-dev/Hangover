import service from "./crm-destination.service.js";
import { createCrudController } from "../crm-master/crm-master.controller.js";

export default createCrudController(service, { ownerQuery: "id" });
