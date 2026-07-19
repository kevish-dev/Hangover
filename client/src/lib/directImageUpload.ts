import { apiClient } from "./axios";

const MAX_IMAGE_BYTES = 500 * 1024 * 1024; // Effectively no size restriction for admins
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const uploadOne = async (file: File, signature: { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }) => {
  if (!IMAGE_TYPES.has(file.type)) throw new Error(`${file.name}: use JPG, PNG, WebP, or AVIF.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: maximum file size exceeded.`);

  const body = new FormData();
  body.append("file", file, file.name);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("folder", signature.folder);
  body.append("signature", signature.signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const payload = await response.json();
  if (!response.ok || !payload.secure_url) throw new Error(payload?.error?.message || `${file.name}: upload failed.`);
  return payload.secure_url as string;
};

/** Uploads at most three images at a time to keep the admin's network responsive. */
export async function uploadBannerImagesDirect(
  kind: "trips" | "festivals" | "circuits",
  id: string,
  files: File[],
  onProgress?: (completed: number, total: number) => void,
) {
  if (files.length === 0) return [];
  if (files.length > 10) throw new Error("A maximum of 10 banners can be uploaded at once.");

  const { data: signature } = await apiClient.post(`/${kind}/${id}/banner-upload-signature`);
  const urls: string[] = new Array(files.length);
  let cursor = 0;
  let completed = 0;
  const workers = Array.from({ length: Math.min(3, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor++;
      urls[index] = await uploadOne(files[index], signature);
      completed += 1;
      onProgress?.(completed, files.length);
    }
  });
  await Promise.all(workers);

  await apiClient.post(`/${kind}/${id}/banner-images/attach`, { imageUrls: urls });
  return urls;
}

/** Uploads a single image directly and returns the URL. Useful for forms where entity ID doesn't exist yet. */
export async function uploadGenericImageDirect(file: File) {
  const { data: signature } = await apiClient.post(`/circuits/upload-signature`);
  return uploadOne(file, signature);
}
