import repository from "./property.repository.js";
import { createCrudService } from "../crm-master/crm-master.service.js";
export default createCrudService(repository, "Property", "stayLocationId");
