import { AppError, ValidationError } from "./errors.js";
import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    const payload = {
      success: false,
      code: err.code,
      message: err.message,
    };
    if (err instanceof ValidationError && err.details.length > 0) {
      payload.details = err.details;
    }
    return res.status(err.statusCode).json(payload);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: err.errors,
    });
  }

  console.error("Unhandled Error:", err);

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
  });
};
