import repository from "./transfer-location.repository.js";
import { createCrudService } from "../crm-master/crm-master.service.js";
export default createCrudService(repository, "Transfer location", "destinationId");
