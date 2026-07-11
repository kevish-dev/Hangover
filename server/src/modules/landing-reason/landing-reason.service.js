import * as repository from "./landing-reason.repository.js";
import { ValidationError } from "../../core/errors/errors.js";
import { uploadToCloudinary } from "../../core/services/upload.service.js";
import { randomUUID } from "crypto";

const stringFields = ["title", "description", "detail", "imageUrl"];

function validate(data, partial = false) {
  for (const field of stringFields) {
    if (!partial || data[field] !== undefined) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        throw new ValidationError(`${field} is required.`);
      }
    }
  }
  if (data.imageUrl !== undefined) {
    try {
      new URL(data.imageUrl);
    } catch {
      throw new ValidationError("imageUrl must be a valid URL.");
    }
  }
  if (data.sortOrder !== undefined && (!Number.isInteger(data.sortOrder) || data.sortOrder < 0)) {
    throw new ValidationError("sortOrder must be a non-negative integer.");
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    throw new ValidationError("isActive must be a boolean.");
  }
}

export const getReasons = (isAdmin) => repository.findAll(isAdmin);

export const createReason = async (data) => {
  validate(data);
  return repository.create({
    title: data.title.trim(),
    description: data.description.trim(),
    detail: data.detail.trim(),
    imageUrl: data.imageUrl.trim(),
    sortOrder: data.sortOrder ?? 0,
    isActive: data.isActive ?? true,
  });
};

export const updateReason = async (id, data) => {
  validate(data, true);
  const next = { ...data };
  for (const field of stringFields) {
    if (typeof next[field] === "string") next[field] = next[field].trim();
  }
  return repository.update(id, next);
};

export const deleteReason = (id) => repository.remove(id);

export const uploadReasonImage = async (file) => {
  if (!file?.buffer) throw new ValidationError("An image file is required.");
  return uploadToCloudinary(file.buffer, {
    folder: "uploads/landing-reasons",
    publicId: randomUUID(),
    optimize: true,
  });
};
