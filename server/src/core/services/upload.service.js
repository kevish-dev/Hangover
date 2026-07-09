import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import sharp from "sharp";
import env from "../env/env.js";

// Cloudinary configures itself automatically if CLOUDINARY_URL is present in the environment.
// However, we explicitly configure it here just in case.
if (env.CLOUDINARY_URL) {
  // It automatically picks up CLOUDINARY_URL from process.env, but we can also be explicit
} else if (env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  // Fallback if URL is missing but key/secret are provided
  cloudinary.config({
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    // cloud_name would be needed here, which is why CLOUDINARY_URL is preferred
  });
}

// Memory storage for multer so we can process with sharp before uploading
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 50MB
});

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - The image buffer
 * @param {Object} options - Configuration options
 * @param {string} options.folder - The folder path in Cloudinary
 * @param {string} [options.publicId] - Specific public ID to use (useful for overwriting)
 * @param {boolean} [options.optimize=true] - Whether to use Sharp to optimize and convert to WebP
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (buffer, options = {}) => {
  const { folder, publicId, optimize = true } = options;

  let imageBuffer = buffer;

  // If optimization is enabled, resize and convert to webp
  if (optimize) {
    imageBuffer = await sharp(buffer)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: !!publicId, // If a publicId is provided, allow it to overwrite existing
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    // Write the buffer to the stream and end it
    uploadStream.end(imageBuffer);
  });
};

/**
 * Extracts public ID from a Cloudinary URL
 * @param {string} url - Cloudinary secure URL
 * @returns {string|null}
 */
const extractPublicId = (url) => {
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  if (matches) return matches[1];
  return null;
};

/**
 * Deletes an image from Cloudinary
 * @param {string} url - The Cloudinary secure URL
 * @returns {Promise<any>}
 */
export const deleteFromCloudinary = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
};

/**
 * Deletes all assets in a specific trip folder
 * @param {string} tripId - The Trip ID
 * @returns {Promise<any>}
 */
export const deleteTripAssets = async (tripId) => {
  try {
    return await cloudinary.api.delete_resources_by_prefix(`uploads/trips/${tripId}`);
  } catch (err) {
    console.error(`Failed to delete trip assets for ${tripId}:`, err);
    return null;
  }
};
