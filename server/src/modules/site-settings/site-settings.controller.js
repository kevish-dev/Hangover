import { ValidationError } from "../../core/errors/errors.js";
import * as siteSettingsService from "./site-settings.service.js";

export const getSettings = async (req, res, next) => {
  try {
    const settings = await siteSettingsService.getSiteSettings();
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
};

export const setMaintenanceMode = async (req, res, next) => {
  try {
    if (typeof req.body?.maintenanceMode !== "boolean") {
      throw new ValidationError("maintenanceMode must be a boolean");
    }

    const settings = await siteSettingsService.updateMaintenanceMode(req.body.maintenanceMode);
    res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
};
