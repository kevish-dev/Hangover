import { prisma } from "../../prisma/client.js";

export const createFormField = (data) => prisma.tripFormField.create({ data });

export const getFormFieldsByTripId = (tripId) => prisma.tripFormField.findMany({
  where: { tripId, isActive: true },
  orderBy: { order: "asc" }
});

export const getFormFieldById = (id) => prisma.tripFormField.findUnique({
  where: { id }
});

export const updateFormField = (id, data) => prisma.tripFormField.update({
  where: { id },
  data
});

export const deleteFormField = (id) => prisma.tripFormField.update({
  where: { id },
  data: { isActive: false }
});
