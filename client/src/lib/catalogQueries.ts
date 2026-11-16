import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchCrmFestivals, fetchFestivalBySlug, fetchLegacyFestivals, type ApiFestival } from "./festivalApi";
import { fetchAllTrips, fetchTripBySlug, type ApiTrip } from "./tripApi";

export const publicTripsQuery = queryOptions({
  queryKey: ["public", "trips"],
  queryFn: ({ signal }) => fetchAllTrips(signal),
  staleTime: 60_000,
});

export function usePublicFestivals() {
  const legacy = useQuery({
    queryKey: ["public", "festivals", "legacy"],
    queryFn: ({ signal }) => fetchLegacyFestivals(signal),
    staleTime: 60_000,
  });
  const crm = useQuery({
    queryKey: ["public", "festivals", "crm"],
    queryFn: ({ signal }) => fetchCrmFestivals(signal),
    staleTime: 60_000,
  });

  return { legacy, crm };
}

export function publicTripDetailQuery(
  slug: string | undefined,
  isFestival: boolean,
  shareToken: string | null,
  viewer: { userId?: string; isLoading: boolean },
) {
  return queryOptions<ApiTrip | ApiFestival>({
    queryKey: ["public", "detail", isFestival ? "festival" : "trip", slug, shareToken, viewer.userId ?? null],
    queryFn: ({ signal }) => isFestival
      ? fetchFestivalBySlug(slug!, signal)
      : fetchTripBySlug(slug!, shareToken, signal),
    enabled: Boolean(slug) && (isFestival || !viewer.isLoading),
    staleTime: 20_000,
  });
}
