/** A single projection used by booking, payment, email, and UI-facing APIs. */
export const getBookingJourney = (booking) => {
  const catalog = booking.trip || booking.festival || booking.slot?.trip || booking.slot?.festival;

  return {
    kind: booking.festival || booking.slot?.festival ? "FESTIVAL" : "TRIP",
    title: catalog?.title || "Trip",
    location: catalog?.location || null,
    bannerImages: catalog?.bannerImages || [],
    startDate: booking.slot?.startDate || null,
    endDate: booking.slot?.endDate || null,
    durationDays: catalog?.duration || null,
    packageName: booking.package?.title || null,
  };
};
