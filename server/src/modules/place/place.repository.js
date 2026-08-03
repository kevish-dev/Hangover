import { createCrudRepository } from "../crm-master/crm-master.repository.js";
export default createCrudRepository("place", { include: { stayLocation: { include: { destination: true } } } });
