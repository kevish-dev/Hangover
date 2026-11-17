import { prisma } from "../prisma/client.js";

const origin = "https://hangovertrails.com";
const key = process.env.SEO_INDEXNOW_KEY;
const enabled = /^[a-z0-9-]{8,128}$/i.test(key ?? "");

export async function publicCatalogPath(kind, id) {
  if (!enabled) return null;
  const model = kind === "trips" ? prisma.crmTrip : prisma.crmFestival;
  try {
    const item = await model.findFirst({
      where: { id, isActive: true, isPublished: true, isListed: true },
      select: { id: true, publicSlug: true },
    });
    return item ? `/${kind}/${encodeURIComponent(item.publicSlug || item.id)}` : null;
  } catch {
    console.warn("Could not resolve a public URL for IndexNow");
    return null;
  }
}

export function notifyCatalogChange(kind, ...paths) {
  const knownPaths = paths.filter(Boolean);
  if (!enabled || !knownPaths.length) return;
  const urlList = [...new Set([`/${kind}`, "/trips", ...knownPaths])].map((path) => `${origin}${path}`);
  void fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList }),
    signal: AbortSignal.timeout(5000),
  }).then((response) => {
    if (!response.ok) console.warn(`IndexNow returned HTTP ${response.status}`);
    void response.body?.cancel().catch(() => undefined);
  }).catch(() => console.warn("IndexNow could not be reached"));
}
