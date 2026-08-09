import { ValidationError } from "../../core/errors/errors.js";

// A PENDING booking has not successfully paid yet, so it must not consume
// capacity. TOKEN and FULL payments move it to RESERVED/CONFIRMED; both states
// own capacity until the booking is cancelled or fully refunded.
export const bookingHoldsSlotCapacity = (status) =>
  status === "RESERVED" || status === "CONFIRMED";

const travelerCount = (booking) => {
  const count = Number(booking?.numberOfTravelers);
  if (!Number.isInteger(count) || count < 1) {
    throw new ValidationError("Booking traveler count is invalid.");
  }
  return count;
};

const slotTarget = (booking) => {
  if (booking?.slotId) return { model: "slot", id: booking.slotId };
  if (booking?.crmTripSlotId) return { model: "crmTripSlot", id: booking.crmTripSlotId };
  if (booking?.crmFestivalSlotId) return { model: "crmFestivalSlot", id: booking.crmFestivalSlotId };
  return null;
};

/**
 * Atomically claim the selected departure. The conditional update is the
 * capacity lock: concurrent payment confirmations cannot overbook a slot.
 */
export const reserveBookingSlotCapacity = async (tx, booking) => {
  const count = travelerCount(booking);
  const target = slotTarget(booking);
  if (!target) return;
  const { model, id } = target;
  const current = await tx[model].findUnique({
    where: { id },
    select: { capacity: true, filledSpots: true },
  });
  if (!current || current.capacity - current.filledSpots < count) {
    throw new ValidationError("This departure no longer has enough remaining capacity.");
  }

  const claimed = await tx[model].updateMany({
    where: {
      id,
      filledSpots: { lte: current.capacity - count },
    },
    data: { filledSpots: { increment: count } },
  });
  if (!claimed.count) {
    throw new ValidationError("This departure no longer has enough remaining capacity.");
  }
};

/**
 * Release at most the capacity owned by this booking. Callers must only invoke
 * this while moving a RESERVED/CONFIRMED booking to CANCELLED.
 */
export const releaseBookingSlotCapacity = async (tx, booking) => {
  const count = travelerCount(booking);
  const target = slotTarget(booking);
  if (!target) return;
  const { model, id } = target;
  const current = await tx[model].findUnique({
    where: { id },
    select: { filledSpots: true },
  });
  if (!current) return;

  const safeDecrement = Math.min(count, Math.max(0, current.filledSpots));
  if (!safeDecrement) return;
  await tx[model].update({
    where: { id },
    data: { filledSpots: { decrement: safeDecrement } },
  });
};

export const cancelBookingOperations = (tx, bookingId) =>
  tx.operationalTask.updateMany({
    where: {
      bookingId,
      status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] },
    },
    data: { status: "CANCELLED" },
  });
