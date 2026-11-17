import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createWebsiteHandler } from "../src/seo/handler.mjs";
import { upcomingSlots } from "../src/seo/metadata.mjs";
import { trackRecordStatistics } from "../src/seo/track-record.mjs";

const template = await readFile(new URL("../index.html", import.meta.url), "utf8");
const now = () => new Date("2026-11-17T18:35:00Z");
const trip = {
  id: "049fc3f8-78c1-4c07-aee1-48edd7209948",
  publicSlug: "tawang-group-trip",
  title: "Tawang",
  overview: 'See Sangti Valley and stop at <script>alert("x")</script>.',
  itinerary: [{ dayNumber: 1, description: "Arrive in Dirang", todos: ["Check in at the homestay"] }],
  inclusions: ["Pickup and shared transport"],
  faqs: [{ question: "Where does it start?", answer: "Ask us for the confirmed pickup." }],
  slots: [
    { startDate: "2026-10-01T00:00:00Z", endDate: "2026-10-07T00:00:00Z", capacity: 10, filledSpots: 1 },
    { startDate: "2026-11-18T00:00:00Z", endDate: "2026-11-24T00:00:00Z", capacity: 10, filledSpots: 1 },
  ],
  packages: [{ price: "22999.00" }],
  bannerImages: ["https://example.com/photo.jpg"],
  duration: 7,
  isActive: true,
  isPublished: true,
  isListed: true,
};
const festival = {
  ...trip,
  id: "5feb2a3a-9c47-4e9c-be67-2f3578c71872",
  title: "Hornbill Festival 2026",
  overview: "Nagaland trip with festival access",
  publicSlug: "hornbill-festival-package",
};
const variant = {
  ...festival,
  id: "ce3eccfa-c52c-42b6-af3b-9fa085fa8107",
  title: "Hornbill Festival 2026 - 2 persons",
  publicSlug: "hornbill-festival-package-two-travelers",
};
const legacy = { ...festival, id: "test-legacy", publicSlug: null, slug: "legacy-festival", title: "Legacy festival" };
const unlisted = { ...trip, id: "internal-only", publicSlug: "private-trip", isListed: false, overview: "PRIVATE CONTENT" };

function setup({ indexable = true, offline = false, main = festival } = {}) {
  const calls = [];
  const festivals = [main, variant].filter(Boolean);
  const fetcher = async (url, options) => {
    const address = new URL(url);
    const path = address.pathname;
    calls.push({ path, options });
    if (offline) return new Response("bad gateway", { status: 502 });
    if (path === "/crm-trips/public") return Response.json({ data: [trip, unlisted] });
    if (path === "/crm-festivals/public") return Response.json({ data: festivals });
    if (path === "/festivals") return Response.json({ data: [legacy] });
    if (path.startsWith("/reviews/")) return Response.json([{ displayName: "Verified traveler", rating: 5, comment: "Great stay", user: { email: "must-stay-private@example.com" } }]);
    if (path === "/landing-content/track-record") return Response.json({ departures: 3, travelerPlaces: 17, travelerBookings: 25, returningBookers: 2, destinations: 6, festivalPackages: 4, averageRating: 4.5, reviewCount: 2 });
    const identifier = path.split("/").at(-1);
    const records = path.startsWith("/crm-trips/public/") ? [trip, unlisted] : path.startsWith("/crm-festivals/public/") ? festivals : [legacy];
    const record = records.find((row) => [row.id, row.publicSlug, row.slug].includes(identifier));
    return record ? Response.json(record) : new Response(null, { status: 404 });
  };
  const request = createWebsiteHandler({ template: () => template, apiBase: "https://api.example.com", fetcher, indexable, now, indexNowKey: "test-indexnow-key" });
  return { get: (url) => request({ url }), calls };
}

test("public HTML includes travel content, crawl directives and safe structured data", async () => {
  const { get } = setup();
  const response = await get("/trips/tawang-group-trip?utm_source=chatgpt.com");
  assert.equal(response.status, 200);
  assert.match(response.body, /<title>7-Day Tawang Group Trip \| Hangover Trails<\/title>/);
  assert.match(response.body, /rel="canonical" href="https:\/\/hangovertrails\.com\/trips\/tawang-group-trip"/);
  assert.match(response.body, /content="index, follow, max-image-preview:large"/);
  assert.match(response.body, /Arrive in Dirang/);
  assert.match(response.body, /Pickup and shared transport/);
  assert.match(response.body, /Great stay/);
  assert.doesNotMatch(response.body, /must-stay-private@example\.com|Oct 2026|<script>alert/);
  const schema = JSON.parse(response.body.match(/application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.ok(schema["@graph"].some((node) => node["@type"] === "BreadcrumbList"));
  assert.ok(schema["@graph"].some((node) => node["@type"] === "TouristTrip"));
  assert.match(response.body, new RegExp(`/book/${trip.id}`));
});

test("old CRM and legacy IDs redirect while preserving attribution", async () => {
  const { get } = setup();
  const tripRedirect = await get(`/api/website?__path=/trips/${trip.id}&utm_source=chatgpt.com`);
  assert.equal(tripRedirect.status, 308);
  assert.equal(tripRedirect.headers.Location, "/trips/tawang-group-trip?utm_source=chatgpt.com");
  const festivalRedirect = await get(`/festivals/${legacy.id}`);
  assert.equal(festivalRedirect.headers.Location, "/festivals/legacy-festival");
  assert.equal((await get("/event-list")).headers.Location, "/festivals");
});

test("private visits never reach the SEO catalog and unlisted content stays out of HTML", async () => {
  const { get, calls } = setup();
  for (const route of ["/trips/tawang-group-trip?share=fake-token", `/book/${trip.id}`, "/profile", "/dashboard/crm-trips", "/bookings/example/review"]) {
    const response = await get(route);
    assert.equal(response.status, 200);
    assert.equal(response.headers["X-Robots-Tag"], "noindex, nofollow");
    assert.equal(response.headers["Cache-Control"], "private, no-store");
    assert.doesNotMatch(response.body, /fake-token|rel="canonical"|application\/ld\+json/);
  }
  assert.equal(calls.length, 0);
  const hidden = await get("/trips/private-trip");
  assert.equal(hidden.status, 200);
  assert.match(hidden.body, /noindex, nofollow/);
  assert.doesNotMatch(hidden.body, /PRIVATE CONTENT/);
});

test("sitemap and llms list canonical public URLs and keep the Hornbill booking variant accessible", async () => {
  const { get } = setup();
  const [sitemap, llms, duplicate, robots, key] = await Promise.all([
    get("/sitemap.xml"), get("/llms.txt"), get(`/festivals/${variant.publicSlug}`), get("/robots.txt"), get("/test-indexnow-key.txt"),
  ]);
  for (const document of [sitemap, llms]) {
    assert.equal(document.status, 200);
    assert.match(document.body, /\/trips\/tawang-group-trip/);
    assert.match(document.body, /\/festivals\/legacy-festival/);
    assert.doesNotMatch(document.body, /hornbill-festival-package-two-travelers|private-trip|\/dashboard/);
  }
  assert.equal(duplicate.status, 200);
  assert.match(duplicate.body, /canonical" href="https:\/\/hangovertrails\.com\/festivals\/hornbill-festival-package"/);
  assert.match(duplicate.body, new RegExp(`/book/${variant.id}`));
  assert.equal(robots.body, "User-agent: *\nAllow: /\n\nSitemap: https://hangovertrails.com/sitemap.xml\n");
  assert.equal(key.body, "test-indexnow-key");
  const { get: withoutPrimary } = setup({ main: null });
  assert.match((await withoutPrimary("/sitemap.xml")).body, /hornbill-festival-package-two-travelers/);
});

test("missing routes are distinguished from API outages and preview remains noindex", async () => {
  const { get } = setup();
  assert.equal((await get("/trips/no-such-trip")).status, 404);
  assert.equal((await get("/unknown-route")).status, 404);
  assert.equal((await get("/trips/%ZZ")).status, 404);
  const { get: unavailable } = setup({ offline: true });
  assert.equal((await unavailable("/trips/tawang-group-trip")).status, 503);
  assert.equal((await unavailable("/sitemap.xml")).status, 503);
  assert.equal((await unavailable("/book/private-booking")).status, 200);
  const { get: preview } = setup({ indexable: false });
  assert.match((await preview("/trips/tawang-group-trip")).body, /noindex, nofollow/);
  assert.match((await preview("/robots.txt")).body, /Disallow: \//);
  assert.equal((await preview("/sitemap.xml")).status, 404);
});

test("support and guide pages are rendered, and home displays verified counts", async () => {
  const { get } = setup();
  assert.match((await get("/custom-trips")).body, /Plan around your group/);
  assert.match((await get("/booking-help")).body, /Changes, cancellations and refunds/);
  assert.match((await get("/guides/mechuka-trip-planning")).body, /<h1>Planning a six-day Mechuka trip<\/h1>/);
  const home = (await get("/")).body;
  assert.match(home, /17 travelers hosted · On completed bookings/);
  assert.match(home, /25 traveler bookings · Reserved, confirmed and completed/);
  assert.match(home, /6 destinations to explore/);
  assert.match(home, /4 festival packages/);
  assert.match(home, /2 returning bookers/);
  assert.deepEqual(upcomingSlots([{ startDate: "2026-11-17T00:00:00Z" }, { startDate: null }, { startDate: "2026-11-18T00:00:00Z" }], now()), [{ startDate: null }, { startDate: "2026-11-18T00:00:00Z" }]);
});

test("track record tolerates earlier API responses and suppresses empty or invalid figures", () => {
  assert.deepEqual(trackRecordStatistics(undefined), []);
  assert.deepEqual(trackRecordStatistics({ departures: 0, travelerPlaces: 0, averageRating: null, reviewCount: 0 }), []);
  const legacy = trackRecordStatistics({ departures: 1, travelerPlaces: 4, averageRating: null, reviewCount: 0 });
  assert.equal(legacy.length, 2);
  assert.equal(legacy.find((stat) => stat.label === "Travelers hosted").value, "4");
  assert.equal(trackRecordStatistics({ travelerBookings: -2, destinations: NaN, festivalPackages: Infinity, reviewCount: 1, averageRating: null }).length, 0);
});
