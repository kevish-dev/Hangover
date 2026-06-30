import * as itineraryRepo from "./itinerary.repository.js";

export const getItineraries = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { itineraries, total } = await itineraryRepo.findAll(skip, take);
  
  return {
    data: itineraries,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

export const getItineraryById = async (id) => {
  const itinerary = await itineraryRepo.findById(id);
  if (!itinerary) throw new Error("Itinerary not found");
  return itinerary;
};

export const createItinerary = async (data) => {
  return itineraryRepo.create(data);
};

export const updateItinerary = async (id, data) => {
  return itineraryRepo.update(id, data);
};

export const deleteItinerary = async (id) => {
  return itineraryRepo.remove(id);
};
