import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/axios";

interface TrackRecordData {
  departures: number;
  travelerPlaces: number;
  averageRating: number | null;
  reviewCount: number;
}

export function TrackRecord() {
  const { data } = useQuery({
    queryKey: ["public", "track-record"],
    queryFn: async ({ signal }) => (await apiClient.get<TrackRecordData>("/landing-content/track-record", { signal })).data,
    staleTime: 60_000,
  });
  if (!data || !(data.departures || data.travelerPlaces || data.reviewCount)) return null;

  const statistics = [
    data.departures > 0 && { value: data.departures.toLocaleString("en-IN"), label: "Departures with completed bookings" },
    data.travelerPlaces > 0 && { value: data.travelerPlaces.toLocaleString("en-IN"), label: "Traveler places on completed bookings" },
    data.reviewCount > 0 && data.averageRating !== null && {
      value: `${data.averageRating.toFixed(1)}/5`,
      label: `From ${data.reviewCount.toLocaleString("en-IN")} verified ${data.reviewCount === 1 ? "review" : "reviews"}`,
    },
  ];
  return (
    <section className="border-y border-[#ded4c7] bg-[#f5f0e6] px-6 py-12 text-[#241c18] sm:px-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-3xl font-medium text-[#781216]">Our track record</h2>
        <dl className="flex flex-wrap gap-x-12 gap-y-5">
          {statistics.map((stat) => stat && (
            <div className="flex flex-col-reverse gap-1" key={stat.label}>
              <dt className="text-sm text-[#59433b]">{stat.label}</dt>
              <dd className="text-3xl font-semibold text-[#781216]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
