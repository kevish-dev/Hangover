import { createCrudRepository } from "../crm-master/crm-master.repository.js";
export default createCrudRepository("transferLocation", { include: { destination: true } });
