import * as service from "./crm-festival.service.js";

export const listFestivals = async (req, res, next) => {
  try {
    res.json(await service.listFestivals(req.query));
  } catch (error) {
    next(error);
  }
};
export const listPublicFestivals = async (_req, res, next) => {
  try {
    res.json(await service.getPublicFestivals());
  } catch (error) {
    next(error);
  }
};
export const getFeaturedPublicFestivals = async (_req, res, next) => {
  try {
    res.json(await service.getFeaturedPublicFestivals());
  } catch (error) {
    next(error);
  }
};
export const getPublicFestival = async (req, res, next) => {
  try {
    res.json(await service.getPublicFestival(req.params.id));
  } catch (error) {
    next(error);
  }
};
export const getFestival = async (req, res, next) => {
  try {
    res.json(await service.getFestival(req.params.id));
  } catch (error) {
    next(error);
  }
};
export const createFestival = async (req, res, next) => {
  try {
    res.status(201).json(await service.createFestival(req.body));
  } catch (error) {
    next(error);
  }
};
export const updateFestival = async (req, res, next) => {
  try {
    res.json(await service.updateFestival(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const deleteFestival = async (req, res, next) => {
  try {
    await service.deleteFestival(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const regenerateInclusions = async (req, res, next) => {
  try {
    res.json(await service.manuallyRegenerateInclusions(req.params.id));
  } catch (error) {
    next(error);
  }
};
export const getItinerary = async (req, res, next) => {
  try {
    res.json((await service.getFestival(req.params.id)).itineraryDays);
  } catch (error) {
    next(error);
  }
};
export const getInclusions = async (req, res, next) => {
  try {
    res.json((await service.getFestival(req.params.id)).inclusions);
  } catch (error) {
    next(error);
  }
};
export const getOperationsCalendar = async (req, res, next) => {
  try {
    res.json(
      await service.getOperationsCalendar(req.params.id, req.query.slotId),
    );
  } catch (error) {
    next(error);
  }
};

export const getDay = async (req, res, next) => {
  try {
    res.json(await service.getItineraryDay(req.params.id));
  } catch (error) {
    next(error);
  }
};
export const createDay = async (req, res, next) => {
  try {
    res
      .status(201)
      .json(await service.createItineraryDay(req.params.festivalId, req.body));
  } catch (error) {
    next(error);
  }
};
export const deleteDay = async (req, res, next) => {
  try {
    await service.deleteItineraryDay(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const updateDay = async (req, res, next) => {
  try {
    res.json(await service.updateDay(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const replacePlaces = async (req, res, next) => {
  try {
    res.json(await service.replacePlaces(req.params.id, req.body.placeIds));
  } catch (error) {
    next(error);
  }
};
export const updateMeals = async (req, res, next) => {
  try {
    res.json(await service.updateMeals(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const updateDropOff = async (req, res, next) => {
  try {
    res.json(await service.updateDropOff(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const createActivity = async (req, res, next) => {
  try {
    res.status(201).json(await service.createActivity(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const updateActivity = async (req, res, next) => {
  try {
    res.json(
      await service.updateActivity(
        req.params.id,
        req.params.activityId,
        req.body,
      ),
    );
  } catch (error) {
    next(error);
  }
};
export const deleteActivity = async (req, res, next) => {
  try {
    await service.deleteActivity(req.params.id, req.params.activityId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const updateCommonInclusion = async (req, res, next) => {
  try {
    res.json(await service.updateCommonInclusion(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const updateDayCommonInclusion = async (req, res, next) => {
  try {
    res.json(await service.updateDayCommonInclusion(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
export const createUploadSignature = async (req, res, next) => {
  try {
    const { createDirectImageUploadSignature } = await import("../../core/services/upload.service.js");
    const folder = req.query.type === "video" ? "uploads/videos" : "uploads/generic";
    const signature = createDirectImageUploadSignature(folder);
    res.json(signature);
  } catch (error) {
    next(error);
  }
};
