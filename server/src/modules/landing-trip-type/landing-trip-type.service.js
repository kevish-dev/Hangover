import * as repository from "./landing-trip-type.repository.js";
import { ValidationError } from "../../core/errors/errors.js";
import { uploadToCloudinary } from "../../core/services/upload.service.js";
import { randomUUID } from "crypto";

const fields = ["label", "description", "tag", "imageUrl"];
const iconNames = new Set(["Users", "Home", "Heart", "GraduationCap", "Mountain", "Compass"]);

function validate(data, partial = false) {
  for (const field of fields) if ((!partial || data[field] !== undefined) && (typeof data[field] !== "string" || !data[field].trim())) throw new ValidationError(`${field} is required.`);
  if (data.imageUrl !== undefined) try { new URL(data.imageUrl); } catch { throw new ValidationError("imageUrl must be a valid URL."); }
  if (data.iconName !== undefined && !iconNames.has(data.iconName)) throw new ValidationError("iconName is invalid.");
  if (data.sortOrder !== undefined && (!Number.isInteger(data.sortOrder) || data.sortOrder < 0)) throw new ValidationError("sortOrder must be a non-negative integer.");
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") throw new ValidationError("isActive must be a boolean.");
}

export const getTripTypes = (isAdmin) => repository.findAll(isAdmin);
export const createTripType = async (data) => { validate(data); return repository.create({ ...data, label: data.label.trim(), description: data.description.trim(), tag: data.tag.trim(), imageUrl: data.imageUrl.trim(), iconName: data.iconName || "Compass", sortOrder: data.sortOrder ?? 0, isActive: data.isActive ?? true }); };
export const updateTripType = async (id, data) => { validate(data, true); const next = { ...data }; for (const field of fields) if (typeof next[field] === "string") next[field] = next[field].trim(); return repository.update(id, next); };
export const deleteTripType = (id) => repository.remove(id);
export const uploadTripTypeImage = async (file) => { if (!file?.buffer) throw new ValidationError("An image file is required."); return uploadToCloudinary(file.buffer, { folder: "uploads/landing-trip-types", publicId: randomUUID(), optimize: true }); };
