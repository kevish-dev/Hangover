export function publicCatalogSlug(name, id, fallback) {
  const descriptivePart = name.toLowerCase().normalize("NFKD")
    .replace(/\p{Mark}/gu, "").replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60).replace(/^-+|-+$/g, "");
  return `${descriptivePart || fallback}-${id.replaceAll("-", "")}`;
}
