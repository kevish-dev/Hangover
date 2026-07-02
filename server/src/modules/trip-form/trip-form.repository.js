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

export const deleteFormField = async (id) => {
  const field = await prisma.tripFormField.findUnique({ where: { id } });
  if (field) {
    return prisma.tripFormField.update({
      where: { id },
      data: { 
        isActive: false,
        fieldKey: `${field.fieldKey}_deleted_${Date.now()}`
      }
    });
  }
};

export const updateFieldOrder = async (fieldIds) => {
  return prisma.$transaction(
    fieldIds.map((id, index) => 
      prisma.tripFormField.update({
        where: { id },
        data: { order: index }
      })
    )
  );
};

export const getSubmissionsByTripId = (tripId) => prisma.bookingFormResponse.findMany({
  where: { booking: { tripId } },
  include: {
    field: true,
    booking: {
      include: {
        user: { select: { profile: { select: { fullName: true } } } }
      }
    }
  },
  orderBy: [
    { bookingId: 'asc' },
    { travelerIndex: 'asc' }
  ]
});
