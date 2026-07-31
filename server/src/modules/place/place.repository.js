import { createCrudRepository } from "../crm-master/crm-master.repository.js";
export default createCrudRepository("place", { include: { destination: true } });
