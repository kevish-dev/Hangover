import { createCrudRepository } from "../crm-master/crm-master.repository.js";
export default createCrudRepository("stayLocation", { include: { destination: true, properties: true } });
