import * as notificationService from "./notification.service.js";

export const getSettings = async (req, res, next) => {
  try {
    const settings = await notificationService.getSettings();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateRecipients = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { userIds } = req.body;
    const recipients = await notificationService.updateRecipients(category, userIds);
    res.status(200).json({ message: "Recipients updated", recipients });
  } catch (error) {
    next(error);
  }
};
