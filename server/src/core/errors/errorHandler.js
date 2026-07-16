import { AppError, ValidationError } from "./errors.js";
import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      code: "INVALID_MEDIA",
      message: err.code === "LIMIT_FILE_SIZE" ? "Uploaded file exceeds the allowed size." : "Invalid upload request.",
    });
  }
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
      details: err.issues,
    });
  }

  if (err?.code === "P2002") {
    return res.status(409).json({
      success: false,
      code: "CONFLICT",
      message: "A record with the same unique details already exists.",
    });
  }

  if (err?.code === "P2003") {
    return res.status(400).json({
      success: false,
      code: "INVALID_REFERENCE",
      message: "One of the selected records does not exist.",
    });
  }

  if (err?.code === "P2025") {
    return res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "The requested record was not found.",
    });
  }

  console.error("Unhandled Error:", err);

  // Respect manually-set statusCode on plain Error objects (legacy support)
  if (err.statusCode && typeof err.statusCode === "number") {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code || "ERROR",
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
  });
};
