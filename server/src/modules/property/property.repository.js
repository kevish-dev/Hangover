import { createCrudRepository } from "../crm-master/crm-master.repository.js";
export default createCrudRepository("property", { include: { stayLocation: { include: { destination: true } } } });
