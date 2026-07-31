import repository from "./crm-destination.repository.js";
import { createCrudService } from "../crm-master/crm-master.service.js";

// CRM destinations are independent from the public website destination catalogue.
export default createCrudService(repository, "CRM destination", "id");
