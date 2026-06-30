import * as tripRepo from "./trip.repository.js";

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getTrips = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { trips, total } = await tripRepo.findAll(skip, take);
  
  return {
    data: trips,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

export const getTripById = async (id) => {
  const trip = await tripRepo.findById(id);
  if (!trip) throw new Error("Trip not found");
  return trip;
};

export const createTrip = async (data) => {
  if (!data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  return tripRepo.create(data);
};

export const updateTrip = async (id, data) => {
  if (data.title && !data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  return tripRepo.update(id, data);
};

export const deleteTrip = async (id) => {
  return tripRepo.remove(id);
};
