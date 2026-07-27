import { prisma } from "../../prisma/client.js";
import * as operationsService from "../../modules/operations/operations.service.js";
import * as crmService from "../../modules/crm/crm.service.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

let createdHotelId;
let createdTaskId;
let booking;
let admin;
let originalOps;
let originalDeparture;
let originalProfile;
let originalTraveler;

try {
  admin = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  booking = await prisma.booking.findFirst({
    where: { user: { profile: { isNot: null } } },
    include: { opsCase: true, user: { include: { profile: true } }, travelers: true, slot: { include: { operation: true } } },
    orderBy: { createdAt: "asc" },
  });
  assert(admin, "An active admin is required for the operations smoke test.");
  assert(booking, "A booking with a primary traveler profile is required for the operations smoke test.");

  originalOps = booking.opsCase && {
    coordinatorId: booking.opsCase.coordinatorId,
    documentsVerifiedAt: booking.opsCase.documentsVerifiedAt,
    documentsVerifiedById: booking.opsCase.documentsVerifiedById,
    specialRequestsReviewedAt: booking.opsCase.specialRequestsReviewedAt,
    specialRequestsReviewedById: booking.opsCase.specialRequestsReviewedById,
    blockerReason: booking.opsCase.blockerReason,
    blockerResolvedAt: booking.opsCase.blockerResolvedAt,
    blockerResolvedById: booking.opsCase.blockerResolvedById,
    nextActionAt: booking.opsCase.nextActionAt,
    hotelRequired: booking.opsCase.hotelRequired,
    internalNotes: booking.opsCase.internalNotes,
  };
  originalDeparture = booking.slot.operation && {
    status: booking.slot.operation.status,
    coordinatorId: booking.slot.operation.coordinatorId,
    notes: booking.slot.operation.notes,
    blockerReason: booking.slot.operation.blockerReason,
    blockerResolvedAt: booking.slot.operation.blockerResolvedAt,
    blockerResolvedById: booking.slot.operation.blockerResolvedById,
    nextActionAt: booking.slot.operation.nextActionAt,
  };
  originalProfile = {
    govtIdVerificationStatus: booking.user.profile.govtIdVerificationStatus,
    govtIdVerifiedAt: booking.user.profile.govtIdVerifiedAt,
    govtIdVerifiedById: booking.user.profile.govtIdVerifiedById,
    govtIdVerificationNotes: booking.user.profile.govtIdVerificationNotes,
  };
  if (booking.travelers[0]) {
    originalTraveler = {
      verificationStatus: booking.travelers[0].verificationStatus,
      verifiedAt: booking.travelers[0].verifiedAt,
      verifiedById: booking.travelers[0].verifiedById,
      verificationNotes: booking.travelers[0].verificationNotes,
    };
  }

  await operationsService.updateBookingOps(booking.id, {
    coordinatorId: admin.id,
    specialRequestsReviewed: true,
    hotelRequired: true,
    internalNotes: "Operations smoke test",
    nextActionAt: new Date(Date.now() + 86_400_000).toISOString(),
  }, admin.id);
  await operationsService.updatePrimaryDocument(booking.id, { status: "PENDING", notes: "Smoke-test review" }, admin.id);
  if (booking.travelers[0]) {
    await operationsService.updateTraveler(booking.id, booking.travelers[0].id, { verificationStatus: "PENDING", verificationNotes: "Smoke-test review" }, admin.id);
  }
  const hotelResult = await operationsService.createHotel(booking.id, {
    hotelName: `Operations smoke hotel ${Date.now()}`,
    roomCount: 1,
    guestCount: booking.numberOfTravelers,
    status: "CONFIRMED",
    estimatedAmount: 1000,
    amountPaid: 500,
    paymentStatus: "PARTIALLY_PAID",
    currency: "INR",
  });
  const createdHotel = hotelResult.hotelReservations.find((hotel) => hotel.hotelName.startsWith("Operations smoke hotel"));
  assert(createdHotel, "Hotel reservation creation did not return the new reservation.");
  createdHotelId = createdHotel.id;

  const task = await crmService.createTask({
    bookingId: booking.id,
    hotelReservationId: createdHotelId,
    title: "Operations smoke task",
    category: "HOTEL",
    priority: "HIGH",
    assigneeId: admin.id,
  }, admin.id);
  createdTaskId = task.id;
  await crmService.updateTask(task.id, { status: "DONE" }, admin.id);
  await operationsService.updateDeparture(booking.slotId, {
    status: "IN_PROGRESS",
    coordinatorId: admin.id,
    notes: "Operations smoke test",
  }, admin.id);

  const [workspace, departure, dashboard] = await Promise.all([
    operationsService.getBooking(booking.id),
    operationsService.getDeparture(booking.slotId),
    operationsService.getDashboard(),
  ]);
  assert(workspace.opsCase?.coordinatorId === admin.id, "Booking coordinator update failed.");
  assert(workspace.hotelReservations.some((hotel) => hotel.id === createdHotelId && hotel.paymentStatus === "PARTIALLY_PAID"), "Hotel/vendor payment tracking failed.");
  assert(workspace.crmTasks.some((entry) => entry.id === createdTaskId && entry.status === "DONE"), "Contextual task completion failed.");
  assert(departure.operation?.status === "IN_PROGRESS", "Departure operation update failed.");
  assert(Array.isArray(workspace.readiness.checks) && workspace.readiness.checks.length === 8, "Readiness calculation is incomplete.");
  assert(dashboard.summary.activeBookings >= 1, "Operations dashboard aggregation failed.");

  console.log(JSON.stringify({
    success: true,
    bookingReference: workspace.bookingReference,
    readiness: workspace.readiness.status,
    readinessChecks: workspace.readiness.checks.length,
    hotelPaymentStatus: createdHotel.paymentStatus,
    taskStatus: "DONE",
    departureStatus: departure.operation.status,
  }, null, 2));
} finally {
  if (createdTaskId) await prisma.crmTask.deleteMany({ where: { id: createdTaskId } });
  if (createdHotelId) await prisma.hotelReservation.deleteMany({ where: { id: createdHotelId } });
  if (booking?.user?.profile && originalProfile) await prisma.userProfile.update({ where: { id: booking.user.profile.id }, data: originalProfile });
  if (booking?.travelers?.[0] && originalTraveler) await prisma.traveler.update({ where: { id: booking.travelers[0].id }, data: originalTraveler });
  if (booking) {
    if (originalOps) await prisma.bookingOpsCase.update({ where: { bookingId: booking.id }, data: originalOps });
    else await prisma.bookingOpsCase.deleteMany({ where: { bookingId: booking.id } });
    if (originalDeparture) await prisma.departureOperation.update({ where: { slotId: booking.slotId }, data: originalDeparture });
    else await prisma.departureOperation.deleteMany({ where: { slotId: booking.slotId } });
  }
  await prisma.$disconnect();
}
