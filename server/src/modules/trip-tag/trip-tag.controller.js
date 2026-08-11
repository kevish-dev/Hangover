import * as tripTagService from "./trip-tag.service.js";

export const createTripTag = async (req, res, next) => {
  try {
    const tag = await tripTagService.createTripTag(req.body);
    res.status(201).json(tag);
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await tripTagService.getAllTripTags();
      const match = existing.find(t => t.tag.toLowerCase() === req.body.tag?.trim()?.toLowerCase());
      if (match) return res.status(200).json(match);
      return res.status(400).json({ message: "Tag already exists" });
    }
    next(error);
  }
};

export const getAllTripTags = async (req, res, next) => {
  try {
    const tags = await tripTagService.getAllTripTags();
    res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
};

export const getTripTagById = async (req, res, next) => {
  try {
    const tag = await tripTagService.getTripTagById(req.params.id);
    res.status(200).json(tag);
  } catch (error) {
    next(error);
  }
};

export const updateTripTag = async (req, res, next) => {
  try {
    const tag = await tripTagService.updateTripTag(req.params.id, req.body);
    res.status(200).json(tag);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "Tag already exists" });
    }
    next(error);
  }
};

export const deleteTripTag = async (req, res, next) => {
  try {
    await tripTagService.deleteTripTag(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
