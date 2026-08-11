import repository from "./stay-location.repository.js";
import { createCrudService } from "../crm-master/crm-master.service.js";
export default createCrudService(repository, "Stay location", "destinationId");
