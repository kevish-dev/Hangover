import * as userRepo from "./user.repository.js";
import { prisma } from "../../prisma/client.js";
import { randomUUID } from "crypto";
import { ValidationError } from "../../core/errors/errors.js";
import {
  createAuthenticatedDeliveryUrl,
  deleteFromCloudinary,
  deleteMediaAsset,
  uploadSensitiveDocument,
} from "../../core/services/upload.service.js";

const serializeProfile = (profile) => {
  if (!profile) return {};
  const { govtIdAsset, ...safeProfile } = profile;
  return {
    ...safeProfile,
    // Legacy public URLs remain readable while existing records are migrated.
    govtIdImageUrl: govtIdAsset
      ? createAuthenticatedDeliveryUrl(govtIdAsset)
      : safeProfile.govtIdImageUrl || null,
    govtIdMimeType: govtIdAsset
      ? (govtIdAsset.resourceType === "RAW" ? "application/pdf" : `image/${govtIdAsset.format || "webp"}`)
      : null,
  };
};

const PROFILE_FIELDS = new Set([
  "fullName", "phone", "alternatePhone", "dateOfBirth", "gender",
  "addressLine1", "addressLine2", "city", "state", "postalCode", "country",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
  "bloodGroup", "medicalNotes", "govtIdType", "govtIdNumber",
]);

const editableProfileData = (data = {}) => Object.fromEntries(
  Object.entries(data).filter(([key]) => PROFILE_FIELDS.has(key)),
);

export const getUsers = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { users, total } = await userRepo.findAllUsers(skip, take);
  
  return {
    data: users,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

export const getUserById = async (id) => {
  const user = await userRepo.findUserById(id);
  if (!user) throw new Error("User not found");
  return user;
};

export const getMyProfile = async (userId) => {
  const user = await getUserById(userId);
  return serializeProfile(user.profile);
};

export const updateMyProfile = async (userId, data) => {
  if (data.phone) {
    const cleanPhone = String(data.phone).replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      throw new ValidationError("Contact number must be exactly 10 digits.");
    }
  }
  const profile = await userRepo.updateUserProfile(userId, editableProfileData(data));
  return serializeProfile(profile);
};

export const updateUserProfile = async (id, data) => {
  await getUserById(id); // Ensure user exists
  const profile = await userRepo.updateUserProfile(id, editableProfileData(data));
  return serializeProfile(profile);
};

export const updateUserStatus = async (id, isActive) => {
  await getUserById(id);
  return userRepo.updateUserStatus(id, isActive);
};

const VALID_ROLES = new Set(["USER", "ADMIN"]);

export const updateUserRole = async (id, role, requestingUserId) => {
  if (!VALID_ROLES.has(role)) {
    throw new ValidationError("Role must be either USER or ADMIN.");
  }
  if (id === requestingUserId) {
    throw new ValidationError("You cannot change your own role.");
  }
  await getUserById(id);
  return userRepo.updateUserRole(id, role);
};

export const deleteUser = async (id, requestingUserId) => {
  if (id === requestingUserId) {
    throw new ValidationError("You cannot delete your own account.");
  }
  await getUserById(id);
  return userRepo.deleteUser(id);
};

export const uploadGovtIdImage = async (userId, govtIdType, file) => {
  const folder = `uploads/users/${userId}/govtid/${govtIdType}`;
  const uploaded = await uploadSensitiveDocument(file, {
    folder,
    publicId: randomUUID(),
  });

  const user = await getUserById(userId);
  const assetData = {
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type.toUpperCase(),
    deliveryType: "AUTHENTICATED",
    format: uploaded.format || null,
    version: uploaded.version ? String(uploaded.version) : null,
    bytes: uploaded.bytes || null,
    width: uploaded.width || null,
    height: uploaded.height || null,
    folder,
    uploadedById: userId,
  };

  const asset = await prisma.mediaAsset.create({ data: assetData });

  let profile;
  try {
    profile = await userRepo.updateUserProfile(userId, {
      govtIdType,
      govtIdImageUrl: null,
      govtIdAssetId: asset.id,
    });
  } catch (error) {
    await Promise.allSettled([
      deleteMediaAsset(asset),
      prisma.mediaAsset.delete({ where: { id: asset.id } }),
    ]);
    throw error;
  }
  if (user.profile?.govtIdImageUrl) {
    await deleteFromCloudinary(user.profile.govtIdImageUrl).catch(() => undefined);
  }
  if (user.profile?.govtIdAsset) {
    await Promise.allSettled([
      deleteMediaAsset(user.profile.govtIdAsset),
      prisma.mediaAsset.delete({ where: { id: user.profile.govtIdAsset.id } }),
    ]);
  }
  return serializeProfile(profile);
};
