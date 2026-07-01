import * as repo from "./trip-form.repository.js";

export const createFormField = async (tripId, data) => {
  return repo.createFormField({ ...data, tripId });
};

export const getFormFields = async (tripId) => {
  return repo.getFormFieldsByTripId(tripId);
};

export const updateFormField = async (id, data) => {
  return repo.updateFormField(id, data);
};

export const deleteFormField = async (id) => {
  return repo.deleteFormField(id);
};
