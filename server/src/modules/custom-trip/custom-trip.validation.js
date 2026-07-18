import { ValidationError } from "../../core/errors/errors.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_MS = 86_400_000;

const text = (value, max = 5000) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.slice(0, max) : null;
};

const parseDate = (value, field) => {
  if (!value) throw new ValidationError(`${field} is required.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} is invalid.`);
  return date;
};

const dateOnly = (date) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
));

export const durationInDays = (startDate, endDate) =>
  Math.floor((dateOnly(endDate) - dateOnly(startDate)) / DAY_MS) + 1;

const normalizeHighlights = (value) => {
  if (!Array.isArray(value)) return [];
  if (value.length > 30) throw new ValidationError("A custom trip can have at most 30 highlights.");
  return value
    .map((item, index) => {
      if (typeof item === "string") return { title: text(item, 160), description: null };
      if (!item || typeof item !== "object") {
        throw new ValidationError(`Highlight ${index + 1} is invalid.`);
      }
      return {
        title: text(item.title, 160),
        description: text(item.description, 1000),
      };
    })
    .filter((item) => item.title || item.description);
};

const normalizeItinerary = (value) => {
  if (!Array.isArray(value)) return [];
  if (value.length > 60) throw new ValidationError("A custom trip can have at most 60 itinerary days.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ValidationError(`Itinerary day ${index + 1} is invalid.`);
    }
    const day = Number(item.day ?? index + 1);
    if (!Number.isInteger(day) || day < 1) {
      throw new ValidationError(`Itinerary day ${index + 1} needs a valid day number.`);
    }
    const activities = Array.isArray(item.activities)
      ? item.activities.map((entry) => text(entry, 500)).filter(Boolean).slice(0, 30)
      : [];
    return {
      day,
      title: text(item.title, 160),
      description: text(item.description, 3000),
      activities,
    };
  });
};

const normalizeImages = (value) => {
  if (!Array.isArray(value)) return [];
  if (value.length > 10) throw new ValidationError("A custom trip can have at most 10 banner images.");
  return value.map((url) => {
    try {
      const parsed = new URL(String(url));
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      return parsed.toString();
    } catch {
      throw new ValidationError("Every banner image must be a valid HTTP or HTTPS URL.");
    }
  });
};

export const normalizeCustomTripInput = (input = {}) => {
  const title = text(input.title, 160);
  const customerName = text(input.customerName, 160);
  const customerEmail = text(input.customerEmail, 254)?.toLowerCase();
  if (!title || title.length < 3) throw new ValidationError("Title must contain at least 3 characters.");
  if (!customerName) throw new ValidationError("Customer name is required.");
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) throw new ValidationError("A valid customer email is required.");

  const startDate = parseDate(input.startDate, "Start date");
  const endDate = parseDate(input.endDate, "End date");
  const durationDays = durationInDays(startDate, endDate);
  if (durationDays < 1 || durationDays > 60) {
    throw new ValidationError("End date must be on or after the start date, with a maximum duration of 60 days.");
  }

  const travelerCount = Number(input.travelerCount);
  if (!Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 100) {
    throw new ValidationError("Traveler count must be between 1 and 100.");
  }

  const totalAmount = Number(input.totalAmount);
  const tokenAmount = Number(input.tokenAmount ?? 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new ValidationError("Total amount must be greater than zero.");
  if (!Number.isFinite(tokenAmount) || tokenAmount < 0 || tokenAmount > totalAmount) {
    throw new ValidationError("Token amount must be between zero and the total amount.");
  }

  const validUntil = parseDate(input.validUntil, "Offer validity");
  const balanceDueDate = input.balanceDueDate ? parseDate(input.balanceDueDate, "Balance due date") : null;
  if (balanceDueDate && dateOnly(balanceDueDate) > dateOnly(startDate)) {
    throw new ValidationError("Balance due date cannot be after the trip start date.");
  }

  return {
    title,
    description: text(input.description, 10_000),
    customerName,
    customerEmail,
    customerPhone: text(input.customerPhone, 40),
    customerUserId: text(input.customerUserId, 100),
    bannerImages: normalizeImages(input.bannerImages),
    highlights: normalizeHighlights(input.highlights),
    itinerary: normalizeItinerary(input.itinerary),
    startDate: dateOnly(startDate),
    endDate: dateOnly(endDate),
    durationDays,
    travelerCount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    tokenAmount: Math.round(tokenAmount * 100) / 100,
    currency: "INR",
    balanceDueDate: balanceDueDate ? dateOnly(balanceDueDate) : null,
    validUntil,
    pricingNotes: text(input.pricingNotes, 5000),
    internalNotes: text(input.internalNotes, 5000),
  };
};

export const validateReadyToSend = (trip) => {
  if (!trip.bannerImages?.length) throw new ValidationError("At least one banner image is required.");
  if (!Array.isArray(trip.highlights) || !trip.highlights.length) {
    throw new ValidationError("At least one trip highlight is required.");
  }
  if (!Array.isArray(trip.itinerary) || trip.itinerary.length !== trip.durationDays) {
    throw new ValidationError(`Add exactly ${trip.durationDays} day-wise itinerary entries before sending the offer.`);
  }
  const days = new Set(trip.itinerary.map((item) => Number(item.day)));
  for (let day = 1; day <= trip.durationDays; day += 1) {
    if (!days.has(day)) throw new ValidationError(`Itinerary day ${day} is missing.`);
  }
  if (trip.itinerary.some((item) => !item.title && !item.description && !item.activities?.length)) {
    throw new ValidationError("Each itinerary day needs a title, description, or activity.");
  }
  if (trip.validUntil <= new Date()) throw new ValidationError("Offer validity must be in the future.");
  if (dateOnly(trip.validUntil) > dateOnly(trip.startDate)) {
    throw new ValidationError("Offer validity cannot extend beyond the trip start date.");
  }
  if (dateOnly(trip.startDate) < dateOnly(new Date())) throw new ValidationError("A custom trip cannot start in the past.");
  if (Number(trip.tokenAmount) < Number(trip.totalAmount) && !trip.balanceDueDate) {
    throw new ValidationError("Balance due date is required when a token payment is available.");
  }
  if (trip.balanceDueDate && dateOnly(trip.balanceDueDate) < dateOnly(new Date())) {
    throw new ValidationError("Balance due date cannot be in the past.");
  }
};

export const normalizeAdditionalTravelers = (value, expectedCount) => {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new ValidationError(`Provide details for exactly ${expectedCount} additional traveler(s).`);
  }
  return value.map((traveler, index) => {
    const fullName = text(traveler?.fullName, 160);
    if (!fullName) throw new ValidationError(`Traveler ${index + 2} name is required.`);
    if (!traveler?.aadhaarAssetId && !text(traveler?.aadhaar, 2000)) {
      throw new ValidationError(`Traveler ${index + 2} government ID is required.`);
    }
    const dateOfBirth = traveler.dateOfBirth ? new Date(traveler.dateOfBirth) : null;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      throw new ValidationError(`Traveler ${index + 2} date of birth is invalid.`);
    }
    return {
      fullName,
      gender: text(traveler.gender, 40),
      dateOfBirth,
      phone: text(traveler.phone, 40),
      aadhaar: traveler.aadhaarAssetId ? null : text(traveler.aadhaar, 2000),
      aadhaarAssetId: text(traveler.aadhaarAssetId, 100),
    };
  });
};
