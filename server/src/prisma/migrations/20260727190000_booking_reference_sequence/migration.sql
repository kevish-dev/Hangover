-- Generate short, sequential booking references atomically.
CREATE SEQUENCE "BookingReferenceSequence" AS BIGINT START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- Continue after the number of bookings already present. For a fresh database,
-- setval(..., false) makes the first generated reference H0001.
SELECT setval(
  '"BookingReferenceSequence"',
  GREATEST((SELECT COUNT(*) FROM "Booking"), 1),
  (SELECT COUNT(*) FROM "Booking") > 0
);
