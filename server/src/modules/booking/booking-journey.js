/** A single projection used by booking, payment, email, and UI-facing APIs. */
export const getBookingJourney = (booking) => {
  const catalog = booking.trip || booking.festival || booking.slot?.trip || booking.slot?.festival;
  const custom = booking.customTrip;
  if (custom || booking.source === "CUSTOM") {
    const snapshot = booking.customTripSnapshot || {};
    return {
      kind: "CUSTOM",
      title: custom?.title || snapshot.title || "Custom trip",
      location: null,
      bannerImages: custom?.bannerImages || snapshot.bannerImages || [],
      startDate: custom?.startDate || snapshot.startDate || null,
      endDate: custom?.endDate || snapshot.endDate || null,
      durationDays: custom?.durationDays || snapshot.durationDays || null,
      packageName: "Private custom trip",
    };
  }
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
