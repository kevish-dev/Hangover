import { CONTACT_EMAIL, CONTACT_PHONE, guidePaths, LOGO_PATH, navigation, pages, SITE_NAME } from "./content.mjs";
import { absoluteImage, catalogName, pathOf, summary, upcomingSlots } from "./metadata.mjs";

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const link = (href, label) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
const para = (content) => `<p>${escapeHtml(content)}</p>`;
const list = (items) => items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
const section = (name, body) => body ? `<section><h2>${escapeHtml(name)}</h2>${body}</section>` : "";
const textList = (values) => list((Array.isArray(values) ? values : []).filter((item) => typeof item === "string" && item.trim()).map(escapeHtml));
const flatText = (value) => typeof value === "string" && value.trim() ? para(value) : "";
const dateFormatter = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

function packagePrice(item) {
  const amount = Number(item.packages?.[0]?.price ?? item.price);
  return Number.isFinite(amount) && amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : null;
}

function departureLabel(slot) {
  const range = [slot.startDate, slot.endDate].map((date) => Date.parse(date)).filter(Number.isFinite);
  const dates = [...new Set(range.map((date) => dateFormatter.format(date)))].join(" to ");
  return `${dates || "Dates on request"}${Number(slot.capacity) > 0 && Number(slot.filledSpots ?? 0) >= Number(slot.capacity) ? " · Sold out" : ""}`;
}

function catalogList(entries) {
  return list(entries.map(({ item, kind }) => {
    const details = [item.location, item.duration > 0 && `${item.duration} days`, packagePrice(item)].filter(Boolean).join(" · ");
    return `${link(pathOf(kind, item), catalogName(item))}${details ? ` <span>— ${escapeHtml(details)}</span>` : ""}`;
  }));
}

function pageBody(path, catalog, trackRecord) {
  const page = pages[path];
  const sections = (page.sections ?? []).map(([heading, content]) => section(heading, para(content))).join("");
  const find = (slugs) => slugs.map((slug) => catalog.find(({ item }) => item.publicSlug === slug)).filter(Boolean);
  let links = "";
  if (path === "/") {
    links += section("Explore trips", catalogList(catalog.filter(({ kind }) => kind === "trips")));
    links += section("Festival packages", catalogList(catalog.filter(({ kind }) => kind === "festivals")));
    links += section("Plan your trip", list(navigation.slice(2).map(([href, label]) => link(href, label))));
  }
  if (path === "/trips" || path === "/festivals") {
    const filtered = path === "/trips" ? catalog : catalog.filter(({ kind }) => kind === "festivals");
    links += section("Browse the catalog", catalogList(filtered) || para("Contact Hangover Trails to ask about upcoming trips."));
  }
  if (path === "/guides") links += list(guidePaths.map((href) => link(href, pages[href].heading)));
  if (page.related?.length) {
    links += section("Related trips", catalogList(find(page.related)) || list([link("/trips", "Browse the trip catalog")]));
  }
  if (page.external?.length) links += section("Official information", list(page.external.map(([href, label]) => link(href, label))));
  if (page.inquiry) links += section("Contact Hangover Trails", list([link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL), link(`tel:${CONTACT_PHONE}`, "+91 84159 29069")]));
  if (trackRecord && (path === "/" || path === "/about")) {
    const facts = [
      trackRecord.departures > 0 && `${trackRecord.departures.toLocaleString("en-IN")} departures with completed bookings`,
      trackRecord.travelerPlaces > 0 && `${trackRecord.travelerPlaces.toLocaleString("en-IN")} traveler places on completed bookings`,
      trackRecord.reviewCount > 0 && `${trackRecord.averageRating?.toFixed(1)}/5 from ${trackRecord.reviewCount} verified reviews`,
    ].filter(Boolean);
    links += section("Track record", textList(facts));
  }
  return `<h1>${escapeHtml(page.heading)}</h1>${para(page.description)}${sections}${links}`;
}

function itineraryBody(item) {
  const itinerary = Array.isArray(item.itinerary) ? item.itinerary : item.itinerary?.days;
  if (!itinerary?.length) return "";
  return itinerary.map((day) => {
    const number = Number(day.dayNumber ?? String(day.day ?? "").match(/\d+/)?.[0]);
    const heading = day.title || (number > 0 ? `Day ${number}` : "Itinerary stop");
    const activities = Array.isArray(day.activities)
      ? day.activities.map((activity) => typeof activity === "string" ? activity : activity?.title)
      : [day.activities];
    const notes = `${flatText(day.description)}${textList([...(Array.isArray(day.todos) ? day.todos : []), ...activities])}`;
    return notes ? `<h3>${escapeHtml(heading)}</h3>${notes}` : "";
  }).join("");
}

function detailBody(item, kind, related, primary, origin, now, reviews) {
  const name = catalogName(item);
  const image = absoluteImage(item.bannerImages?.[0], origin);
  const departures = upcomingSlots(item.slots, now);
  const highlights = (Array.isArray(item.highlights) ? item.highlights : []).map((item) => typeof item === "string" ? item : item?.text);
  const faqs = (Array.isArray(item.faqs) ? item.faqs : []).filter((faq) => faq.question && faq.answer);
  const facts = [item.location, item.duration > 0 && `${item.duration} days`, packagePrice(item)].filter(Boolean);
  const guide = related && pages[related];
  const bookingPath = `/book/${encodeURIComponent(item.id)}${kind === "festivals" ? "?type=festival" : ""}`;
  const hasSeats = departures.some((slot) => Number(slot.capacity) > Number(slot.filledSpots ?? 0));
  const actions = hasSeats ? link(bookingPath, "See booking options") : link("/booking-help", "Ask about availability");
  return `${link(`/${kind}`, kind === "trips" ? "All trips" : "All festivals")}
    <h1>${escapeHtml(name)}</h1>${facts.length ? para(facts.join(" · ")) : ""}
    ${flatText(item.overview)}<p>${actions}${primary ? ` · ${link(pathOf(kind, primary), "See the main Hornbill package")}` : ""}</p>
    ${image ? `<img class="seo-hero" src="${escapeHtml(image)}" alt="${escapeHtml(item.location || name)}" decoding="async">` : ""}
    ${section("Upcoming departures", departures.length ? textList(departures.map(departureLabel)) : para("Ask us about the next departure."))}
    ${section("Trip highlights", textList(highlights))}${section("Day-by-day itinerary", itineraryBody(item))}
    ${section("What’s included", textList(item.inclusions))}${section("What’s excluded", textList(item.exclusions))}
    ${section("Frequently asked questions", faqs.map((faq) => `<h3>${escapeHtml(faq.question)}</h3>${para(faq.answer)}`).join(""))}
    ${section("Reviews from completed bookings", reviews.map((review) => `<blockquote>${para(review.comment)}${para(`${review.displayName} · ${review.rating}/5`)}</blockquote>`).join(""))}
    ${guide ? section("Plan your trip", link(related, guide.heading)) : ""}
    <p>${link("/booking-help", "Booking, cancellation and payment help")}</p>`;
}

const guideForSlug = {
  "ziro-valley-kaziranga-tour-package": "/guides/ziro-valley-trip-planning",
  "ziro-music-festival-package": "/guides/ziro-valley-trip-planning",
  "tawang-group-trip": "/guides/tawang-trip-planning",
  "tawang-college-group-trip": "/guides/tawang-trip-planning",
  "mechuka-tour-package": "/guides/mechuka-trip-planning",
  "hornbill-festival-package": "/guides/hornbill-festival-trip-planning",
  "hornbill-festival-package-two-travelers": "/guides/hornbill-festival-trip-planning",
};
export const relatedGuide = (item) => Object.hasOwn(guideForSlug, item.publicSlug) ? guideForSlug[item.publicSlug] : undefined;

export function publicBody({ path, item, kind, catalog, primary, reviews = [], trackRecord, origin, now }) {
  const body = item ? detailBody(item, kind, relatedGuide(item), primary, origin, now, reviews) : pageBody(path, catalog, trackRecord);
  return `<div class="seo-page"><header class="seo-nav">${link("/", SITE_NAME)}<nav aria-label="Explore">${navigation.map(([href, label]) => link(href, label)).join("")}</nav></header><main>${body}</main><footer>${link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)} · ${link("/booking-help", "Booking help")}</footer></div>`;
}

export function statusBody(status) {
  const title = status === 404 ? "Page not found" : "Trips are temporarily unavailable";
  const message = status === 404 ? "Browse the catalog to find a current trip or festival." : "Please try again shortly or contact Hangover Trails for help.";
  return `<main class="seo-page"><h1>${title}</h1>${para(message)}${list([link("/trips", "Browse trips"), link("/festivals", "Browse festivals"), link("/booking-help", "Booking help")])}</main>`;
}

export function schemaFor(path, metadata, { origin, item, kind }) {
  const absolute = (pathname) => new URL(pathname, origin).href;
  const organizationId = `${absolute("/")}#organization`;
  const rootNode = {
    "@type": "Organization",
    "@id": organizationId,
    name: SITE_NAME,
    url: absolute("/"),
    logo: absolute(LOGO_PATH),
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE,
    sameAs: ["https://www.instagram.com/hangovertrails/", "https://www.linkedin.com/company/hangover-trails/", "https://www.facebook.com/hangovertrails/"],
  };
  const graph = [];
  if (path === "/" || path === "/about") graph.push(rootNode);
  if (path === "/") graph.push({ "@type": "WebSite", name: SITE_NAME, url: absolute("/"), publisher: { "@id": organizationId } });
  if (path !== "/") {
    const crumbs = [["Home", absolute("/")]];
    if (item) crumbs.push([kind === "trips" ? "Trips" : "Festivals", absolute(`/${kind}`)]);
    if (path.startsWith("/guides/")) crumbs.push(["Travel guides", absolute("/guides")]);
    crumbs.push([item ? catalogName(item) : pages[path].heading, metadata.canonical]);
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map(([name, url], index) => ({ "@type": "ListItem", position: index + 1, name, item: url })),
    });
  }
  if (item && metadata.canonical === absolute(pathOf(kind, item))) {
    graph.push({
      "@type": "TouristTrip",
      name: catalogName(item),
      url: metadata.canonical,
      description: summary(item.overview, 500) || metadata.description,
      ...(item.tripType === "INSTITUTE_COLLEGE_TRIP" ? { touristType: "College groups" } : {}),
      provider: { "@id": organizationId, "@type": "Organization", name: SITE_NAME, url: absolute("/") },
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export const seoStyles = `<style>
.seo-page{max-width:76rem;margin:auto;padding:clamp(1rem,4vw,3rem);color:#271a18;background:#fffdf8;font:1rem/1.65 Poppins,system-ui,sans-serif}
.seo-page main{max-width:54rem;padding-block:clamp(1.5rem,4vw,3rem)}.seo-page h1{font-size:clamp(2rem,6vw,4rem);line-height:1.1;letter-spacing:-.045em;margin:1rem 0}.seo-page h2{margin:1rem 0 .4rem}.seo-page p{white-space:pre-line}.seo-page a{color:#781216;text-decoration:underline;text-underline-offset:.22em}.seo-page section{margin:1.8rem 0}.seo-nav,.seo-nav nav{display:flex;flex-wrap:wrap;gap:.6rem 1.1rem}.seo-nav{justify-content:space-between;border-bottom:1px solid #e7ded3;padding-bottom:1rem}.seo-nav>a{font-weight:700}.seo-hero{margin-block:1rem;width:min(100%,54rem);aspect-ratio:16/9;object-fit:cover;border-radius:.5rem}.seo-page li{margin:.3rem 0}.seo-page footer{border-top:1px solid #e7ded3;padding-top:1rem}
</style>`;

function metaTag(attribute, key, value) {
  return value ? `<meta ${attribute}="${key}" content="${escapeHtml(value)}">` : "";
}

export function renderDocument(template, metadata, body, schema, configureFonts = true) {
  const meta = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    metaTag("name", "robots", metadata.indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow"),
    metaTag("name", "description", metadata.description),
    metadata.canonical ? `<link rel="canonical" href="${escapeHtml(metadata.canonical)}">` : "",
    ...(metadata.canonical ? [
      metaTag("property", "og:site_name", SITE_NAME), metaTag("property", "og:type", metadata.type),
      metaTag("property", "og:title", metadata.title), metaTag("property", "og:description", metadata.description),
      metaTag("property", "og:url", metadata.canonical), metaTag("property", "og:image", metadata.image),
      metaTag("name", "twitter:card", "summary_large_image"), metaTag("name", "twitter:title", metadata.title),
      metaTag("name", "twitter:description", metadata.description), metaTag("name", "twitter:image", metadata.image),
    ] : []),
    schema ? `<script id="page-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>` : "",
    body && configureFonts ? seoStyles : "",
  ].join("\n");
  const html = template.replace(/<!-- seo-start -->[\s\S]*?<!-- seo-end -->/, () => meta);
  return body ? html.replace(/<!-- route-start -->[\s\S]*?<!-- route-end -->/, () => body) : html;
}
