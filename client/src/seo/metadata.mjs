import { LOGO_PATH, pages, SITE_NAME, SITE_ORIGIN } from "./content.mjs";

export const pathOf = (kind, item) => `/${kind}/${encodeURIComponent(item.publicSlug || item.slug || item.id)}`;
export const isListedPublicly = (item) => Boolean(item?.isPublished && item.isActive !== false && item.isListed !== false);

const catalogNames = {
  "3c0fdab9-8419-4ff0-85fa-af83ce074cf0": "Anini and Namsai Tour Package",
  "e541dbd3-a24f-4dc1-ae93-2ba8bc86afcc": "Mechuka Tour Package",
  "8814b565-8e5c-46bc-ac3c-8f9683950175": "Meghalaya College Group Trip",
  "ea5e3934-770c-4db1-bc7d-af71deee7d93": "Tawang College Group Trip",
  "049fc3f8-78c1-4c07-aee1-48edd7209948": "Tawang Group Trip",
  "1e6217ed-2a25-46b4-b6ab-86e97d3a2a05": "Ziro Valley and Kaziranga Tour Package",
  "033d854e-2001-4be0-ae9a-62d923e3bb9d": "Meghalaya Cherry Blossom Festival Package",
  "ce3eccfa-c52c-42b6-af3b-9fa085fa8107": "Hornbill Festival Package for Two Travelers",
  "5feb2a3a-9c47-4e9c-be67-2f3578c71872": "Hornbill Festival Package in Nagaland",
  "409605c2-26cd-4cc6-b856-57ea934ad2c7": "Ziro Music Festival Travel Package",
};

// The two Hornbill listings share an itinerary but have separate checkout inventory.
const hornbillPair = "ce3eccfa-c52c-42b6-af3b-9fa085fa8107";
const hornbillMain = "5feb2a3a-9c47-4e9c-be67-2f3578c71872";
export const primaryFestivalId = (item) => item?.id === hornbillPair ? hornbillMain : null;

const durationTitles = new Set(Object.keys(catalogNames).filter((id) => ![
  "033d854e-2001-4be0-ae9a-62d923e3bb9d",
  "ce3eccfa-c52c-42b6-af3b-9fa085fa8107",
  "409605c2-26cd-4cc6-b856-57ea934ad2c7",
].includes(id)));

export function catalogName(item) {
  if (!Object.hasOwn(catalogNames, item.id)) return item.title;
  const name = catalogNames[item.id];
  const days = Number(item.duration);
  return durationTitles.has(item.id) && Number.isInteger(days) && days > 0 ? `${days}-Day ${name}` : name;
}

export function summary(text, max = 155) {
  const cleaned = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  if (cleaned.length <= max) return cleaned;
  const cutoff = cleaned.lastIndexOf(" ", max - 1);
  return `${cleaned.slice(0, cutoff > max / 2 ? cutoff : max - 1)}…`;
}

export function absoluteImage(source, origin = SITE_ORIGIN) {
  if (typeof source !== "string" || !source.trim()) return undefined;
  try {
    const image = new URL(source, origin);
    if (["https:", "http:"].includes(image.protocol) && !image.username && !image.password) return image.href;
  } catch {
    return undefined;
  }
}

export function pageMetadata(path, origin = SITE_ORIGIN) {
  if (!Object.hasOwn(pages, path)) return { title: SITE_NAME, indexable: false };
  const page = pages[path];
  return {
    title: `${page.heading} | ${SITE_NAME}`,
    description: page.description,
    canonical: new URL(path, origin).href,
    image: new URL(LOGO_PATH, origin).href,
    type: path.startsWith("/guides/") ? "article" : "website",
    indexable: true,
  };
}

export function detailMetadata(kind, item, primaryItem, origin = SITE_ORIGIN) {
  const name = catalogName(item);
  const title = `${name} | ${SITE_NAME}`;
  if (!isListedPublicly(item)) return { title, indexable: false };
  const primary = isListedPublicly(primaryItem) ? primaryItem : item;
  return {
    title,
    description: summary(item.overview) || `Explore ${name} with Hangover Trails. See the itinerary, departure dates and package inclusions.`,
    canonical: new URL(pathOf(kind, primary), origin).href,
    image: absoluteImage(item.bannerImages?.[0], origin) || new URL(LOGO_PATH, origin).href,
    type: "website",
    indexable: true,
  };
}

export function isPrivateRoute(path) {
  return /^\/(?:book(?:\/|$)|bookings(?:\/|$)|profile(?:\/|$)|dashboard(?:\/|$))/.test(path);
}

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

export function upcomingSlots(slots, now = new Date()) {
  const today = dateKeyFormatter.format(now);
  return (Array.isArray(slots) ? slots : []).filter(({ startDate }) => {
    if (!startDate) return true;
    const timestamp = Date.parse(startDate);
    return Number.isFinite(timestamp) && dateKeyFormatter.format(timestamp) >= today;
  });
}

export function equivalentFestival(variant, primary) {
  return Boolean(isListedPublicly(primary) && primaryFestivalId(variant) === primary.id &&
    variant.duration === primary.duration && variant.location === primary.location &&
    variant.title.replace(/\s*-\s*2 persons\s*$/i, "").trim() === primary.title.trim() &&
    variant.overview?.trim() && variant.overview.trim() === primary.overview?.trim());
}
