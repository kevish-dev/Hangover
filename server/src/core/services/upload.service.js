import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import sharp from "sharp";
import env from "../env/env.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const toHttpError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "INVALID_MEDIA";
  return error;
};

const createUploadMiddleware = ({ allowedTypes, fileSize, files }) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize, files, fields: 20, parts: files + 20 },
    fileFilter: (_req, file, callback) => {
      if (!allowedTypes.has(file.mimetype)) {
        return callback(toHttpError("Unsupported media type."));
      }
      callback(null, true);
    },
  });

// Public content uses images only. Limits are intentionally per request, not just UI hints.
export const imageUploadMiddleware = createUploadMiddleware({
  allowedTypes: IMAGE_TYPES,
  fileSize: 12 * 1024 * 1024,
  files: 15,
});

// IDs may be a clear image or PDF, but are stored as authenticated assets.
export const documentUploadMiddleware = createUploadMiddleware({
  allowedTypes: DOCUMENT_TYPES,
  fileSize: 8 * 1024 * 1024,
  files: 1,
});

export const videoUploadMiddleware = createUploadMiddleware({
  allowedTypes: VIDEO_TYPES,
  fileSize: 80 * 1024 * 1024,
  files: 1,
});

// Backward-compatible default for existing image routes.
export const uploadMiddleware = imageUploadMiddleware;

const cloudinaryResourceType = (resourceType) => resourceType?.toLowerCase?.() || "image";

/**
 * Upload public visual content. Originals are normalized once, then Cloudinary
 * delivers responsive derivatives at read time.
 */
export const uploadPublicImage = async (buffer, options = {}) => {
  const { folder, publicId } = options;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: Boolean(publicId),
        resource_type: "image",
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    ).end(buffer);
  });
};

/** Creates a short-lived signature for a browser to upload a public image directly to Cloudinary. */
export const createDirectImageUploadSignature = (folder) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const cloudConfig = cloudinary.config();
  if (!cloudConfig.cloud_name || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary upload credentials are not configured.");
  }
  return {
    timestamp,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: cloudConfig.cloud_name,
    signature: cloudinary.utils.api_sign_request({ folder, timestamp }, env.CLOUDINARY_API_SECRET),
  };
};

export const isExpectedPublicImageUrl = (url, folder) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname === "res.cloudinary.com"
      && parsed.pathname.startsWith(`/${cloudinary.config().cloud_name}/image/upload/`)
      && parsed.pathname.includes(`/${folder}/`);
  } catch {
    return false;
  }
};

/** Upload a sensitive ID as an authenticated Cloudinary asset. */
export const uploadSensitiveDocument = async (file, options = {}) => {
  const { folder, publicId } = options;
  const isPdf = file.mimetype === "application/pdf";
  const resourceType = isPdf ? "raw" : "image";
  const resolvedPublicId = isPdf && !publicId.endsWith(".pdf") ? `${publicId}.pdf` : publicId;
  const payload = isPdf
    ? file.buffer
    : await sharp(file.buffer, { limitInputPixels: false })
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88, smartSubsample: true })
        .toBuffer();

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: resolvedPublicId,
        overwrite: Boolean(publicId),
        resource_type: resourceType,
        type: "authenticated",
        ...(isPdf ? {} : { format: "webp" }),
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    ).end(payload);
  });
};

/** Upload a public video without image processing. Video delivery is transformed separately. */
export const uploadPublicVideo = async (file, options = {}) => {
  const { folder, publicId } = options;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        chunk_size: 6000000,
        folder,
        public_id: publicId,
        overwrite: Boolean(publicId),
        resource_type: "video",
        eager_async: true,
        eager: [
          { format: "jpg", transformation: [{ width: 1280, height: 720, crop: "fill", gravity: "auto" }] },
          { format: "mp4", transformation: [{ width: 1280, crop: "limit" }, { video_codec: "auto" }] },
        ],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    ).end(file.buffer);
  });
};

// Kept for existing service callers. New public-image callers should use uploadPublicImage.
export const uploadToCloudinary = async (buffer, options = {}) => {
  const result = await uploadPublicImage(buffer, options);
  return result.secure_url;
};

export const createAuthenticatedDeliveryUrl = (asset) => {
  if (!asset?.publicId) return null;
  return cloudinary.url(asset.publicId, {
    secure: true,
    sign_url: true,
    type: "authenticated",
    resource_type: cloudinaryResourceType(asset.resourceType),
    format: asset.format || undefined,
    version: asset.version || undefined,
    ...(env.CLOUDINARY_AUTH_TOKEN_KEY && {
      auth_token: { key: env.CLOUDINARY_AUTH_TOKEN_KEY, duration: 300 },
    }),
  });
};

export const deleteMediaAsset = async (asset) => {
  if (!asset?.publicId) return null;
  return cloudinary.uploader.destroy(asset.publicId, {
    resource_type: cloudinaryResourceType(asset.resourceType),
    type: asset.deliveryType === "AUTHENTICATED" ? "authenticated" : "upload",
    invalidate: true,
  });
};

const extractPublicId = (url) => {
  const matches = url?.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return matches?.[1] || null;
};

// Legacy public URL cleanup. New uploads use MediaAsset metadata instead.
export const deleteFromCloudinary = async (url, { resourceType = "image" } = {}) => {
  const publicId = extractPublicId(url);
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
};

export const deleteTripAssets = async (tripId) => {
  const prefix = `uploads/trips/${tripId}`;
  try {
    await Promise.all([
      cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image" }),
      cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "video" }),
    ]);
  } catch (err) {
    console.error(`Failed to delete trip assets for ${tripId}:`, err);
  }
};

export const deleteFestivalAssets = async (festivalId) => {
  const prefix = `uploads/festivals/${festivalId}`;
  try {
    await Promise.all([
      cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image" }),
      cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "video" }),
    ]);
  } catch (err) {
    console.error(`Failed to delete festival assets for ${festivalId}:`, err);
  }
};

if (!env.CLOUDINARY_URL && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({ api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
}
