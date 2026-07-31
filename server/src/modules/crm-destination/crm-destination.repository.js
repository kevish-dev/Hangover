import { createCrudRepository } from "../crm-master/crm-master.repository.js";

export default createCrudRepository("crmDestination", {
  include: { _count: { select: { places: true, stayLocations: true, transferLocations: true, trips: true } } },
});
