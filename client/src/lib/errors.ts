import { toast } from "sonner";

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  errors?: unknown;
};

function firstValidationMessage(errors: unknown): string | null {
  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const message = record.message ?? record.msg;
        if (typeof message === "string" && message.trim()) return message.trim();
      }
    }
  }

  if (errors && typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
        return value[0].trim();
      }
    }
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const candidate = error as {
    message?: unknown;
    code?: unknown;
    response?: { status?: number; data?: ApiErrorPayload | string };
  } | null;
  const payload = candidate?.response?.data;

  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
    const validationMessage = firstValidationMessage(payload.errors);
    if (validationMessage) return validationMessage;
  }

  if (candidate?.response?.status === 413) {
    return "The uploaded file exceeds the 10 MB limit. Please select a smaller photo or compress it.";
  }

  if (candidate?.code === "ECONNABORTED" || candidate?.code === "ETIMEDOUT") {
    return "The request timed out. Check your connection and try again.";
  }

  if (candidate?.code === "ERR_NETWORK" || candidate?.message === "Network Error") {
    return "The server could not be reached. If you were uploading a file, it may exceed 10 MB or your connection timed out.";
  }

  if (candidate?.response?.status === 401) return "Your session has expired. Please sign in again.";
  if (candidate?.response?.status === 403) return "You do not have permission to perform this action.";
  if (candidate?.response?.status === 404) return "The requested record could not be found.";
  if (typeof candidate?.message === "string" && candidate.message.trim()) return candidate.message.trim();

  return fallback;
}

export function showErrorToast(error: unknown, fallback?: string, description?: string) {
  return toast.error(getErrorMessage(error, fallback), description ? { description } : undefined);
}

