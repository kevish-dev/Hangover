import * as userService from "./user.service.js";

// --- Me Endpoints ---
export const getMyProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    res.status(200).json(user.profile || {});
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await userService.updateMyProfile(req.user.id, req.body);
    res.status(200).json({ message: "Profile updated successfully", profile });
  } catch (error) {
    next(error);
  }
};

export const uploadGovtId = async (req, res, next) => {
  try {
    const { govtIdType } = req.body;
    if (!govtIdType) {
      return res.status(400).json({ message: "govtIdType is required" });
    }

    const frontImageBuffer = req.files?.frontImage?.[0]?.buffer;
    const backImageBuffer = req.files?.backImage?.[0]?.buffer;

    if (!frontImageBuffer && !backImageBuffer) {
      return res.status(400).json({ message: "At least one image (front or back) is required" });
    }

    const profile = await userService.uploadGovtIdImages(
      req.user.id,
      govtIdType,
      frontImageBuffer,
      backImageBuffer
    );
    
    res.status(200).json({ message: "Govt ID uploaded successfully", profile });
  } catch (error) {
    next(error);
  }
};

// --- Admin Endpoints ---
export const getUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await userService.getUsers(page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ message: "User not found" });
    }
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const profile = await userService.updateUserProfile(req.params.id, req.body);
    res.status(200).json({ message: "User profile updated successfully", profile });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    const user = await userService.updateUserStatus(req.params.id, isActive);
    res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    next(error);
  }
};
