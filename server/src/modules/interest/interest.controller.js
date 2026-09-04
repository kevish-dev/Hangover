import { randomUUID } from "node:crypto";
import * as service from "./interest.service.js";

export const handlePublicSubmitInterest = async (req, res, next) => {
  try {
    let visitorToken = req.cookies.interest_visitor_token;
    if (!visitorToken) {
      visitorToken = randomUUID();
      res.cookie("interest_visitor_token", visitorToken, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      });
    }

    const userId = req.user?.id || null;

    const submission = await service.submitInterest({
      ...req.body,
      userId,
      visitorToken,
    });

    res.status(201).json({
      success: true,
      message: "Interest registered successfully",
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetInterestOverview = async (req, res, next) => {
  try {
    const overview = await service.getInterestOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteInterestSubmission = async (req, res, next) => {
  try {
    await service.removeInterestSubmission(req.params.id);
    res.json({
      success: true,
      message: "Interest submission deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
