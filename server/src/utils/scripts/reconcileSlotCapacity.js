import { prisma } from "../../prisma/client.js";

// The current booking lifecycle counts capacity only after an initial payment
// succeeds: RESERVED and CONFIRMED bookings own places; PENDING and CANCELLED
// bookings do not. Run with --apply only after reviewing the dry-run output.
const apply = process.argv.includes("--apply");
const activeStatuses = ["RESERVED", "CONFIRMED"];

const targets = [
  { label: "catalog slots", field: "slotId", model: "slot" },
  { label: "CRM trip slots", field: "crmTripSlotId", model: "crmTripSlot" },
  { label: "CRM festival slots", field: "crmFestivalSlotId", model: "crmFestivalSlot" },
];

try {
  let mismatchCount = 0;
  for (const target of targets) {
    const totals = await prisma.booking.groupBy({
      by: [target.field],
      where: {
        [target.field]: { not: null },
        status: { in: activeStatuses },
      },
      _sum: { numberOfTravelers: true },
    });
    const expectedById = new Map(
      totals.map((row) => [row[target.field], Number(row._sum.numberOfTravelers || 0)]),
    );
    const slots = await prisma[target.model].findMany({
      select: { id: true, capacity: true, filledSpots: true },
    });
    const mismatches = slots
      .map((slot) => ({ ...slot, expected: expectedById.get(slot.id) || 0 }))
      .filter((slot) => slot.filledSpots !== slot.expected);

    mismatchCount += mismatches.length;
    console.log(`${target.label}: ${mismatches.length} mismatch(es)`);
    for (const slot of mismatches) {
      console.log(`  ${slot.id}: ${slot.filledSpots} -> ${slot.expected} (capacity ${slot.capacity})`);
    }

    if (apply && mismatches.length) {
      await prisma.$transaction(
        mismatches.map((slot) => prisma[target.model].update({
          where: { id: slot.id },
          data: { filledSpots: slot.expected },
        })),
      );
    }
  }

  console.log(apply ? `Applied ${mismatchCount} capacity correction(s).` : `Dry run complete: ${mismatchCount} capacity correction(s). Use --apply to write them.`);
} finally {
  await prisma.$disconnect();
}
