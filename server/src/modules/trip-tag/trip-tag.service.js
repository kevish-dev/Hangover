import * as repo from "./trip-tag.repository.js";

export const createTripTag = async (data) => {
  const name = data.tag?.trim();
  if (!name) {
    const error = new Error("Tag name is required");
    error.statusCode = 400;
    throw error;
  }
  const existing = await repo.findTagByName(name);
  if (existing) {
    return existing;
  }
  return repo.createTripTag({ tag: name });
};

export const getAllTripTags = async () => {
  return repo.getAllTripTags();
};

export const getTripTagById = async (id) => {
  const tag = await repo.getTripTagById(id);
  if (!tag) {
    const error = new Error("Trip tag not found");
    error.statusCode = 404;
    throw error;
  }
  return tag;
};

export const updateTripTag = async (id, data) => {
  await getTripTagById(id);
  return repo.updateTripTag(id, data);
};

export const deleteTripTag = async (id) => {
  await getTripTagById(id);
  return repo.deleteTripTag(id);
};
