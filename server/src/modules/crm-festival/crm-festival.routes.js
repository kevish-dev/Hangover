import { Router } from "express";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import * as controller from "./crm-festival.controller.js";
import * as bookingController from "./crm-booking.controller.js";
import {
  createCrmFestivalSchema, updateCrmFestivalSchema, updateDaySchema, replacePlacesSchema,
  createActivitySchema, updateActivitySchema, updateMealsSchema, updateDropOffSchema, validate,
  updateCommonInclusionSchema,
  updateDayCommonInclusionSchema,
} from "./crm-festival.validation.js";

const router = Router();
router.get("/public/featured", controller.getFeaturedPublicFestivals);
router.get("/public/:id", controller.getPublicFestival);
router.get("/public", controller.listPublicFestivals);
router.post("/public/:id/bookings", requireAuth, bookingController.createPublic);
router.use(requireAuth, requireAdmin);

router.get("/", controller.listFestivals);
router.post("/upload-signature", controller.createUploadSignature);
router.post("/", validate(createCrmFestivalSchema), controller.createFestival);
router.get("/:id", controller.getFestival);
router.patch("/:id", validate(updateCrmFestivalSchema), controller.updateFestival);
router.delete("/:id", controller.deleteFestival);
router.get("/:id/itinerary", controller.getItinerary);
router.get("/:id/inclusions", controller.getInclusions);
router.get("/:id/operations", controller.getOperationsCalendar);
router.post("/:id/regenerate-inclusions", controller.regenerateInclusions);
router.get("/:id/bookings", bookingController.list);
router.post("/:id/bookings", bookingController.create);
router.post("/:id/bookings/:bookingId/installments", bookingController.createInstallment);
router.patch("/:id/common-inclusions", validate(updateCommonInclusionSchema), controller.updateCommonInclusion);

router.post("/:festivalId/itinerary-days", validate(updateDaySchema), controller.createDay);
router.get("/itinerary-days/:id", controller.getDay);
router.patch("/itinerary-days/:id", validate(updateDaySchema), controller.updateDay);
router.delete("/itinerary-days/:id", controller.deleteDay);
router.put("/itinerary-days/:id/places", validate(replacePlacesSchema), controller.replacePlaces);
router.patch("/itinerary-days/:id/meals", validate(updateMealsSchema), controller.updateMeals);
router.patch("/itinerary-days/:id/common-inclusions", validate(updateDayCommonInclusionSchema), controller.updateDayCommonInclusion);
router.patch("/itinerary-days/:id/drop-off", validate(updateDropOffSchema), controller.updateDropOff);
router.post("/itinerary-days/:id/activities", validate(createActivitySchema), controller.createActivity);
router.patch("/itinerary-days/:id/activities/:activityId", validate(updateActivitySchema), controller.updateActivity);
router.delete("/itinerary-days/:id/activities/:activityId", controller.deleteActivity);

export default router;
