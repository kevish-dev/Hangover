import * as service from "./landing-reason.service.js";

export const getReasons = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === "ADMIN" && req.query.adminView === "true";
    const data = await service.getReasons(isAdmin);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

export const createReason = async (req, res, next) => {
  try {
    const reason = await service.createReason(req.body);
    res.status(201).json({ message: "Landing reason created", reason });
  } catch (error) {
    next(error);
  }
};

export const updateReason = async (req, res, next) => {
  try {
    const reason = await service.updateReason(req.params.id, req.body);
    res.status(200).json({ message: "Landing reason updated", reason });
  } catch (error) {
    next(error);
  }
};

export const deleteReason = async (req, res, next) => {
  try {
    await service.deleteReason(req.params.id);
    res.status(200).json({ message: "Landing reason deleted" });
  } catch (error) {
    next(error);
  }
};

export const uploadReasonImage = async (req, res, next) => {
  try {
    const imageUrl = await service.uploadReasonImage(req.file);
    res.status(201).json({ message: "Panel image uploaded", imageUrl });
  } catch (error) {
    next(error);
  }
};
