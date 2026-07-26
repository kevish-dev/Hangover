import * as destinationRepo from "./destination.repository.js";

export const getDestinations = async (page = 1, limit = 10, isAdmin = false) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const where = isAdmin ? {} : { isPublished: true };
  const { destinations, total } = await destinationRepo.findAll(skip, take, where, isAdmin);
  
  return {
    data: destinations,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

export const getDestinationById = async (id, isAdmin = false) => {
  const where = isAdmin ? { id } : { id, isPublished: true };
  const destination = await destinationRepo.findById(where, isAdmin);
  if (!destination) throw new Error("Destination not found");
  return destination;
};

export const createDestination = async (data) => {
  return destinationRepo.create(data);
};

export const updateDestination = async (id, data) => {
  return destinationRepo.update(id, data);
};

export const deleteDestination = async (id) => {
  return destinationRepo.remove(id);
};

export const linkExistingEntities = async (id, circuitIds) => {
  return destinationRepo.linkExistingEntities(id, circuitIds);
};
