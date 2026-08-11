import { prisma } from "../../prisma/client.js";
import { amountDueAfterPayment } from "../gst.js";

// Repairs only stale balance fields; it never changes a booking price or an
// already-recorded payment. Review the dry run first, then use --apply.
const apply = process.argv.includes("--apply");

try {
  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
      bookingReference: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      status: true,
      paymentStatus: true,
      initialPaymentType: true,
    },
  });

  const mismatches = bookings
    .map((booking) => ({
      ...booking,
      expectedAmountDue:
        booking.status === "CANCELLED" || booking.paymentStatus === "REFUNDED"
          ? 0
          : booking.status === "PENDING" && booking.initialPaymentType === "FULL"
            ? 0
          : amountDueAfterPayment(booking.totalAmount, booking.amountPaid),
    }))
    .filter((booking) => Math.abs(Number(booking.amountDue) - booking.expectedAmountDue) > 0.01);

  console.log(`${mismatches.length} booking balance mismatch(es) found.`);
  for (const booking of mismatches) {
    console.log(`${booking.bookingReference}: ₹${booking.amountDue} -> ₹${booking.expectedAmountDue}`);
  }

  if (apply && mismatches.length) {
    await prisma.$transaction(
      mismatches.map((booking) => prisma.booking.update({
        where: { id: booking.id },
        data: { amountDue: booking.expectedAmountDue },
      })),
    );
    console.log(`Applied ${mismatches.length} booking balance correction(s).`);
  } else if (!apply) {
    console.log("Dry run only. Re-run with --apply after reviewing the list.");
  }
} finally {
  await prisma.$disconnect();
}
