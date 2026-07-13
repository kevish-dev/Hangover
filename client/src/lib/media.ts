export type MediaFit = "fill" | "fit" | "limit";

/**
 * Produces a cacheable, role-specific Cloudinary rendition while leaving
 * non-Cloudinary URLs untouched during the legacy-media migration.
 */
export function mediaImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; fit?: MediaFit; quality?: "auto:good" | "auto:eco" } = {},
) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url || "";

  const { width, height, fit = "fill", quality = "auto:good" } = options;
  const transforms = ["f_auto", `q_${quality}`, "dpr_auto"];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${fit}`);

  return url.replace("/image/upload/", `/image/upload/${transforms.join(",")}/`);
}

export function mediaVideoPosterUrl(url: string | null | undefined, width = 1280) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return undefined;
  return url
    .replace("/video/upload/", `/video/upload/so_0,f_auto,q_auto:good,w_${width},c_fill/`)
    .replace(/\.[a-zA-Z0-9]+($|\?)/, ".jpg$1");
}

export function mediaVideoUrl(url: string | null | undefined, width = 1280) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return url || "";
  return url.replace("/video/upload/", `/video/upload/q_auto,vc_auto,w_${width},c_limit/`);
}
