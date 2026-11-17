import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/axios";
import { trackRecordStatistics } from "../../seo/track-record.mjs";

interface TrackRecordData {
  departures: number;
  travelerPlaces: number;
  travelerBookings?: number;
  returningBookers?: number;
  destinations?: number;
  festivalPackages?: number;
  averageRating: number | null;
  reviewCount: number;
}

export function TrackRecord() {
  const { data } = useQuery({
    queryKey: ["public", "track-record"],
    queryFn: async ({ signal }) => (await apiClient.get<TrackRecordData>("/landing-content/track-record", { signal })).data,
    staleTime: 60_000,
  });
  const statistics = trackRecordStatistics(data);
  if (statistics.length === 0) return null;

  return (
    <section className="border-y border-[#ded4c7] bg-[#f5f0e6] px-6 py-12 text-[#241c18] sm:px-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-3xl font-medium text-[#781216]">Our track record</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-3 lg:gap-x-12">
          {statistics.map((stat) => (
            <div className="flex min-w-0 flex-col border-t border-[#ded4c7] pt-5" key={stat.label}>
              <dt className="order-2 mt-3 text-sm font-medium text-[#59433b]">{stat.label}</dt>
              <dd className="order-1 text-4xl leading-none font-medium tracking-tight text-[#781216] tabular-nums sm:text-5xl">{stat.value}</dd>
              <dd className="order-3 mt-1 max-w-56 text-xs leading-relaxed text-[#75645b]">{stat.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
