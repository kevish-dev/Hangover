import repository from "./place.repository.js";
import { createCrudService } from "../crm-master/crm-master.service.js";
export default createCrudService(repository, "Place", "destinationId");
