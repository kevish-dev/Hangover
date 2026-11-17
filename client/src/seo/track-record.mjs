export function trackRecordStatistics(data) {
  if (!data) return [];

  const counts = [
    { value: data.travelerBookings, label: "Traveler bookings", description: "Reserved, confirmed and completed" },
    { value: data.travelerPlaces, label: "Travelers hosted", description: "On completed bookings" },
    { value: data.departures, label: "Completed departures", description: "With completed traveler bookings" },
    { value: data.destinations, label: "Destinations to explore", description: "Across our published itineraries" },
    { value: data.festivalPackages, label: "Festival packages", description: "In our travel collection" },
    { value: data.returningBookers, label: "Returning bookers", description: "Two or more trip bookings" },
  ];
  const statistics = counts.filter(({ value }) => Number.isFinite(value) && value > 0)
    .map((stat) => ({ ...stat, value: stat.value.toLocaleString("en-IN") }));

  if (data.reviewCount > 0 && Number.isFinite(data.averageRating) && data.averageRating > 0) {
    statistics.push({
      value: `${data.averageRating.toFixed(1)}/5`,
      label: "Traveler rating",
      description: `From ${data.reviewCount.toLocaleString("en-IN")} verified ${data.reviewCount === 1 ? "review" : "reviews"}`,
    });
  }
  return statistics;
}
