/** A single projection used by booking, payment, email, and UI-facing APIs. */
export const getBookingJourney = (booking) => {
  const catalog = booking?.crmTrip || booking?.crmFestival || booking?.trip || booking?.festival || booking?.slot?.trip || booking?.slot?.festival;
  const slot = booking?.crmTripSlot || booking?.crmFestivalSlot || booking?.slot;

  return {
    kind: booking?.crmTrip
      ? "CRM_TRIP"
      : booking?.crmFestival
        ? "CRM_FESTIVAL"
        : booking?.festival || booking?.slot?.festival
          ? "FESTIVAL"
          : "TRIP",
    title: catalog?.name || catalog?.title || "Trip",
    location: catalog?.destination?.name || catalog?.location || null,
    bannerImages: catalog?.websiteBannerImages || catalog?.bannerImages || [],
    startDate: slot?.startDate || null,
    endDate: slot?.endDate || null,
    durationDays: catalog?.numberOfNights ? catalog.numberOfNights + 1 : catalog?.duration || null,
    packageName: booking?.package?.title || null,
  };
};
