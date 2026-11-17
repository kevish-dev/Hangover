import { guidePaths, pages, SITE_NAME, SITE_ORIGIN } from "./content.mjs";
import { catalogName, detailMetadata, equivalentFestival, isListedPublicly, isPrivateRoute, pageMetadata, pathOf, primaryFestivalId } from "./metadata.mjs";
import { escapeHtml, publicBody, renderDocument, schemaFor, statusBody } from "./render.mjs";

const legacyRedirects = {
  "/category/packages": "/trips",
  "/event-list": "/festivals",
  "/index.html": "/",
  "/post/experiencing-the-beauty-of-ziro-valley-in-arunachal-pradesh": "/guides/ziro-valley-trip-planning",
};
const detailPattern = /^\/(trips|festivals)\/([^/]{1,155})$/;
const staticCatalogPages = new Set(["/", "/trips", "/festivals"]);
const textType = "text/plain; charset=utf-8";
const htmlType = "text/html; charset=utf-8";
const privateCache = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const listingCache = { "Cache-Control": "public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control": "public, s-maxage=30" };
const missing = Symbol("unavailable");

function requestAddress(request) {
  const incoming = new URL(request.url, SITE_ORIGIN);
  // Vercel may pass the original URL or the rewritten function URL.
  if (incoming.pathname === "/api/website") {
    const originalPath = incoming.searchParams.get("__path");
    if (originalPath && /^\/(?!\/)[^?#\\]*$/.test(originalPath)) incoming.pathname = originalPath;
  }
  incoming.searchParams.delete("__path");
  return incoming;
}

function webResponse(status, type, body, headers = {}) {
  return { status, body, headers: { "Content-Type": type, ...headers } };
}

const redirect = (location) => webResponse(308, textType, "", { Location: location, "Cache-Control": "no-store" });

function useCatalog(apiBase, fetcher) {
  async function get(path) {
    const response = await fetcher(`${apiBase}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
    return response.json();
  }

  async function listLegacyFestivals() {
    const first = await get("/festivals?page=1&limit=200");
    if (!Array.isArray(first?.data)) throw new Error("Invalid festival list");
    const results = [...first.data];
    for (let page = 2; page <= Number(first.meta?.totalPages ?? 1); page++) {
      const next = await get(`/festivals?page=${page}&limit=200`);
      if (!Array.isArray(next?.data)) throw new Error("Invalid festival list");
      results.push(...next.data);
    }
    return results;
  }

  async function list(includeTrips = true) {
    const [trips, festivals, legacy] = await Promise.all([
      includeTrips ? get("/crm-trips/public").then((response) => response?.data) : [],
      get("/crm-festivals/public").then((response) => response?.data),
      listLegacyFestivals(),
    ]);
    if (!Array.isArray(trips) || !Array.isArray(festivals)) throw new Error("Invalid public catalog");
    return [
      ...trips.filter(isListedPublicly).map((item) => ({ kind: "trips", item })),
      ...[...festivals, ...legacy].filter(isListedPublicly).map((item) => ({ kind: "festivals", item })),
    ];
  }

  async function detail(kind, identifier) {
    const id = encodeURIComponent(identifier);
    if (kind === "trips") return get(`/crm-trips/public/${id}`);
    return (await get(`/crm-festivals/public/${id}`)) ?? get(`/festivals/${id}`);
  }

  async function reviews(kind, id) {
    const prefix = kind === "trips" ? "trip" : "festival";
    const result = await get(`/reviews/${prefix}/${encodeURIComponent(id)}`);
    if (!Array.isArray(result)) return [];
    return result.filter((row) => row.comment && row.displayName && Number.isInteger(row.rating)).slice(0, 6);
  }

  return { detail, list, reviews, trackRecord: () => get("/landing-content/track-record") };
}

function canonicalEntries(catalog) {
  const festivals = new Map(catalog.filter(({ kind }) => kind === "festivals").map(({ item }) => [item.id, item]));
  return catalog.filter(({ kind, item }) => kind !== "festivals" || !equivalentFestival(item, festivals.get(primaryFestivalId(item))));
}

function sitemap(catalog, origin) {
  const routes = new Map(Object.keys(pages).map((path) => [path, undefined]));
  for (const { kind, item } of canonicalEntries(catalog)) routes.set(pathOf(kind, item), item.updatedAt);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...routes].map(([path, updated]) => {
    const date = Date.parse(updated);
    const lastmod = Number.isFinite(date) ? `<lastmod>${new Date(date).toISOString()}</lastmod>` : "";
    return `  <url><loc>${escapeHtml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
  }).join("\n")}\n</urlset>\n`;
}

const markdownLabel = (value) => String(value).replace(/[\r\n]+/g, " ").replace(/[\\[\]]/g, "\\$&");

function llms(catalog, origin) {
  const docLink = (label, path) => `- [${markdownLabel(label)}](${new URL(path, origin).href})`;
  const entries = canonicalEntries(catalog);
  const lines = [
    `# ${SITE_NAME}`, "", `> ${pages["/"].description}`, "",
    "## Trips", docLink("All trips", "/trips"),
    ...entries.filter(({ kind }) => kind === "trips").map(({ kind, item }) => docLink(catalogName(item), pathOf(kind, item))),
    "", "## Festival travel", docLink("All festivals", "/festivals"),
    ...entries.filter(({ kind }) => kind === "festivals").map(({ kind, item }) => docLink(catalogName(item), pathOf(kind, item))),
    "", "## Services and travel planning",
    ...["/about", "/custom-trips", "/college-trips", "/booking-help", ...guidePaths].map((path) => docLink(pages[path].heading, path)),
    "", "The linked trip pages show current departures, pricing and inclusions.", "",
  ];
  return lines.join("\n");
}

export function createWebsiteHandler({ template, apiBase, fetcher = fetch, indexable = false, origin = SITE_ORIGIN, indexNowKey, now = () => new Date() }) {
  const catalog = useCatalog(apiBase.replace(/\/$/, ""), fetcher);
  return async (request) => {
    const url = requestAddress(request);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const search = url.search;
    const share = url.searchParams.has("share");
    const requestMethod = request.method ?? "GET";
    if (requestMethod !== "GET" && requestMethod !== "HEAD") {
      return webResponse(405, textType, "Method not allowed", { ...privateCache, Allow: "GET, HEAD" });
    }
    const output = async (status, metadata, body, schema) => {
      const html = renderDocument(await template(request), metadata, body, schema);
      const headers = metadata.indexable ? listingCache : privateCache;
      const extra = status === 503 ? { "Retry-After": "60" } : {};
      return webResponse(status, htmlType, html, { ...headers, ...extra, ...(share ? { "Referrer-Policy": "no-referrer" } : {}) });
    };
    const appShell = (status = 200, body) => output(status, { title: SITE_NAME, indexable: false }, body);
    const failure = () => appShell(503, statusBody(503));
    const notFound = () => appShell(404, statusBody(404));

    if (share || isPrivateRoute(path)) return appShell();
    if (url.pathname !== path && !path.startsWith("/api/")) return redirect(`${path}${search}`);
    if (Object.hasOwn(legacyRedirects, path)) return redirect(`${legacyRedirects[path]}${search}`);
    if (path === "/robots.txt") {
      const rules = indexable
        ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", origin).href}\n`
        : "User-agent: *\nDisallow: /\n";
      return webResponse(200, textType, rules, { "Cache-Control": "no-cache" });
    }
    if (indexable && /^[a-z0-9-]{8,128}$/i.test(indexNowKey ?? "") && path === `/${indexNowKey}.txt`) {
      return webResponse(200, textType, indexNowKey, listingCache);
    }
    if (path === "/sitemap.xml" || path === "/llms.txt") {
      if (!indexable) return webResponse(404, textType, "Not found", privateCache);
      try {
        const entries = await catalog.list();
        return path === "/sitemap.xml"
          ? webResponse(200, "application/xml; charset=utf-8", sitemap(entries, origin), listingCache)
          : webResponse(200, "text/markdown; charset=utf-8", llms(entries, origin), listingCache);
      } catch {
        return webResponse(503, textType, "Catalog temporarily unavailable", { ...privateCache, "Retry-After": "60" });
      }
    }

    const match = path.match(detailPattern);
    if (match) {
      const [, kind, encoded] = match;
      let item;
      try {
        const identifier = decodeURIComponent(encoded);
        if (!identifier || /[\\/\x00-\x1f\x7f]/.test(identifier)) return notFound();
        item = await catalog.detail(kind, identifier);
      } catch (error) {
        return error instanceof URIError ? notFound() : failure();
      }
      if (!item?.id) return notFound();
      if (!isListedPublicly(item)) return appShell();
      const canonicalPath = pathOf(kind, item);
      if (canonicalPath !== path) return redirect(`${canonicalPath}${search}`);
      const primaryId = kind === "festivals" ? primaryFestivalId(item) : null;
      const [candidate, reviews] = await Promise.all([
        primaryId ? catalog.detail(kind, primaryId).catch(() => null) : null,
        catalog.reviews(kind, item.id).catch(() => []),
      ]);
      const primary = equivalentFestival(item, candidate) ? candidate : null;
      const metadata = detailMetadata(kind, item, primary, origin);
      const body = publicBody({ path, item, kind, primary, reviews, origin, now: now() });
      return output(200, { ...metadata, indexable }, body, indexable && schemaFor(path, metadata, { item, kind, origin }));
    }

    if (!Object.hasOwn(pages, path)) return notFound();
    const page = pages[path];
    const [entries, trackRecord] = await Promise.all([
      staticCatalogPages.has(path) || page.related ? catalog.list(path !== "/festivals").catch(() => missing) : [],
      path === "/" || path === "/about" ? catalog.trackRecord().catch(() => null) : null,
    ]);
    if (entries === missing && (path === "/trips" || path === "/festivals")) return failure();
    const metadata = pageMetadata(path, origin);
    const body = publicBody({ path, catalog: entries === missing ? [] : entries, trackRecord, origin });
    return output(200, { ...metadata, indexable }, body, indexable && schemaFor(path, metadata, { origin }));
  };
}

export function sendWebsiteResponse(request, response, result) {
  response.writeHead(result.status, result.headers);
  response.end(request.method === "HEAD" ? undefined : result.body);
}
