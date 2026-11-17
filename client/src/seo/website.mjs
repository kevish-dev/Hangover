import { readFile } from "node:fs/promises";
import { SITE_ORIGIN } from "./content.mjs";
import { createWebsiteHandler, sendWebsiteResponse } from "./handler.mjs";

let html;
const siteHost = new URL(SITE_ORIGIN).hostname;
const apiBase = process.env.SEO_API_BASE_URL || process.env.VITE_API_URL || "https://api.hangovertrails.com/api/v1";
const createHandler = (indexable) => createWebsiteHandler({
  template: () => html ??= readFile(new URL("./index.html", import.meta.url), "utf8").catch((error) => {
    html = undefined;
    throw error;
  }),
  apiBase,
  indexable,
  indexNowKey: process.env.SEO_INDEXNOW_KEY,
});
const production = createHandler(true);
const preview = createHandler(false);

export default async function website(request, response) {
  const host = request.headers.host?.toLowerCase().split(":")[0];
  const isProduction = process.env.VERCEL_ENV === "production";
  try {
    if (isProduction && host === `www.${siteHost}`) {
      const requestUrl = new URL(request.url, SITE_ORIGIN);
      const path = requestUrl.pathname === "/api/website" ? requestUrl.searchParams.get("__path") : requestUrl.pathname;
      if (path && /^\/(?!\/)[^?#\\]*$/.test(path)) {
        requestUrl.searchParams.delete("__path");
        response.writeHead(308, { Location: `${SITE_ORIGIN}${path}${requestUrl.search}` });
        response.end();
        return;
      }
    }
    const handler = isProduction && host === siteHost ? production : preview;
    sendWebsiteResponse(request, response, await handler(request));
  } catch (error) {
    console.error("Failed to serve site HTML", error);
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60", "Cache-Control": "no-store" });
    response.end("The site is temporarily unavailable. Please try again shortly.");
  }
}
