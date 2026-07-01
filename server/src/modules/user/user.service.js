import * as userRepo from "./user.repository.js";
import { uploadToCloudinary } from "../../core/services/upload.service.js";

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

export const updateMyProfile = async (userId, data) => {
  // We can add data validation here if needed, stripping out admin-only fields
  return userRepo.updateUserProfile(userId, data);
};

export const updateUserProfile = async (id, data) => {
  await getUserById(id); // Ensure user exists
  return userRepo.updateUserProfile(id, data);
};

export const updateUserStatus = async (id, isActive) => {
  await getUserById(id);
  return userRepo.updateUserStatus(id, isActive);
};

export const uploadGovtIdImages = async (userId, govtIdType, frontImageBuffer, backImageBuffer) => {
  const folder = `uploads/users/${userId}/govtid/${govtIdType}`;
  
  const uploadPromises = [];
  
  if (frontImageBuffer) {
    uploadPromises.push(uploadToCloudinary(frontImageBuffer, {
      folder,
      publicId: "front",
      optimize: true,
    }).then(url => ({ frontUrl: url })));
  }
  
  if (backImageBuffer) {
    uploadPromises.push(uploadToCloudinary(backImageBuffer, {
      folder,
      publicId: "back",
      optimize: true,
    }).then(url => ({ backUrl: url })));
  }
  
  const results = await Promise.all(uploadPromises);
  
  const updateData = {
    govtIdType
  };
  
  results.forEach(res => {
    if (res.frontUrl) updateData.govtIdFrontImageUrl = res.frontUrl;
    if (res.backUrl) updateData.govtIdBackImageUrl = res.backUrl;
  });
  
  return userRepo.updateUserProfile(userId, updateData);
};
