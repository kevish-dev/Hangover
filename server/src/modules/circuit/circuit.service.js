import * as repo from "./circuit.repository.js";
import {
  createCircuitSchema,
  updateCircuitSchema,
  createCircuitDaySchema,
  updateCircuitDaySchema,
  createCircuitDayTaskSchema,
  updateCircuitDayTaskSchema,
} from "./circuit.validation.js";

// ── Helpers ───────────────────────────────────────────────────────────────
const notFound = (label = "Circuit") => {
  const err = new Error(`${label} not found`);
  err.statusCode = 404;
  return err;
};

// ═══════════════════════════════════════════════════════════════════════════
// Circuit CRUD
// ═══════════════════════════════════════════════════════════════════════════
export const getCircuits = async (page = 1, limit = 10, query = {}) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);

  // Build filter
  const filter = {};
  if (query.tripType) filter.tripType = query.tripType;
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  if (query.destinationId) filter.destinationId = query.destinationId;
  if (query.search) {
    filter.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const { circuits, total } = await repo.findAll(skip, take, filter);
  return {
    data: circuits,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getCircuitById = async (id) => {
  const circuit = await repo.findById(id);
  if (!circuit) throw notFound();
  return circuit;
};

import { randomUUID } from "crypto";
import { 
  createDirectImageUploadSignature, 
  uploadToCloudinary, 
  deleteFromCloudinary, 
  isExpectedPublicImageUrl 
} from "../../core/services/upload.service.js";
import { ValidationError } from "../../core/errors/errors.js";

export const createCircuit = async (data, adminId) => {
  console.log("CREATE CIRCUIT PAYLOAD:", JSON.stringify(data, null, 2));
  try {
    const parsed = createCircuitSchema.parse(data);
    return await repo.create({ ...parsed, createdById: adminId });
  } catch(e) {
    console.error("ERROR IN CREATE:", e);
    throw e;
  }
};

export const updateCircuit = async (id, data) => {
  await getCircuitById(id);
  const parsed = updateCircuitSchema.parse(data);
  return repo.update(id, parsed);
};

export const deleteCircuit = async (id) => {
  const circuit = await getCircuitById(id);
  const contentUrls = [
    ...(circuit.bannerImages || []),
    ...(Array.isArray(circuit.highlights) ? circuit.highlights.map((item) => item?.imageUrl) : []),
    ...(Array.isArray(circuit.stayTransportImages) ? circuit.stayTransportImages.map((item) => item?.imageUrl) : []),
  ].filter(Boolean);
  await Promise.allSettled(contentUrls.map((url) => deleteFromCloudinary(url)));
  return repo.remove(id);
};

// ═══════════════════════════════════════════════════════════════════════════
// Circuit Media
// ═══════════════════════════════════════════════════════════════════════════
export const createUploadSignature = async () => {
  return createDirectImageUploadSignature(`uploads/circuits/media`);
};

export const createBannerUploadSignature = async (circuitId) => {
  await getCircuitById(circuitId);
  return createDirectImageUploadSignature(`uploads/circuits/${circuitId}/bannerimages`);
};

export const uploadBannerImages = async (circuitId, imageBuffers) => {
  await getCircuitById(circuitId);
  const folder = `uploads/circuits/${circuitId}/bannerimages`;
  const uploadPromises = imageBuffers.map(buffer => 
    uploadToCloudinary(buffer, { folder, publicId: randomUUID(), optimize: true })
  );
  const imageUrls = await Promise.all(uploadPromises);
  const circuit = await getCircuitById(circuitId);
  return repo.update(circuitId, { bannerImages: [...(circuit.bannerImages || []), ...imageUrls] });
};

export const attachBannerImages = async (circuitId, imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0 || imageUrls.length > 10) {
    throw new ValidationError("Provide between 1 and 10 banner image URLs.");
  }
  const folder = `uploads/circuits/${circuitId}/bannerimages`;
  if (!imageUrls.every((url) => typeof url === "string" && isExpectedPublicImageUrl(url, folder))) {
    throw new ValidationError("One or more banner URLs are invalid.");
  }
  const circuit = await getCircuitById(circuitId);
  return repo.update(circuitId, { bannerImages: [...(circuit.bannerImages || []), ...imageUrls] });
};

export const deleteBannerImage = async (circuitId, imageUrl) => {
  const circuit = await getCircuitById(circuitId);
  const existingBanners = circuit.bannerImages || [];
  if (!existingBanners.includes(imageUrl)) throw new Error("Image not found in circuit");
  await deleteFromCloudinary(imageUrl);
  const newBanners = existingBanners.filter(url => url !== imageUrl);
  return repo.update(circuitId, { bannerImages: newBanners });
};

export const syncHighlights = async (circuitId, payloadStr, files) => {
  const circuit = await repo.findById(circuitId);
  if (!circuit) throw new Error("Circuit not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/circuits/${circuitId}/highlights`;
  
  const uploadPromises = payload.map(async (item) => {
    if (item.type === "EXISTING") {
      return { text: item.text, imageUrl: item.url };
    } else if (item.type === "NEW") {
      const file = files[item.fileIndex];
      if (!file) throw new Error("Missing file for new highlight image");
      const imageUrl = await uploadToCloudinary(file.buffer, { folder, publicId: randomUUID(), optimize: true });
      return { text: item.text, imageUrl };
    }
  });

  const updatedHighlights = await Promise.all(uploadPromises);
  return repo.update(circuitId, { highlights: updatedHighlights });
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDay sub-resource
// ═══════════════════════════════════════════════════════════════════════════

/** Verify a day belongs to the specified circuit */
const verifyDayOwnership = async (circuitId, dayId) => {
  const circuit = await getCircuitById(circuitId);
  const day = circuit.days.find((d) => d.id === dayId);
  if (!day) throw notFound("Circuit Day");
  return day;
};

export const addDay = async (circuitId, data) => {
  await getCircuitById(circuitId);
  const parsed = createCircuitDaySchema.parse(data);
  return repo.createDay(circuitId, parsed);
};

export const editDay = async (circuitId, dayId, data) => {
  await verifyDayOwnership(circuitId, dayId);
  const parsed = updateCircuitDaySchema.parse(data);
  return repo.updateDay(dayId, parsed);
};

export const removeDay = async (circuitId, dayId) => {
  await verifyDayOwnership(circuitId, dayId);
  return repo.removeDay(dayId);
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDayTask sub-resource
// ═══════════════════════════════════════════════════════════════════════════

/** Verify a task belongs to a day which belongs to the circuit */
const verifyTaskOwnership = async (circuitId, dayId, taskId) => {
  const day = await verifyDayOwnership(circuitId, dayId);
  const task = day.tasks.find((t) => t.id === taskId);
  if (!task) throw notFound("Circuit Day Task");
  return task;
};

export const addTask = async (circuitId, dayId, data) => {
  await verifyDayOwnership(circuitId, dayId);
  const parsed = createCircuitDayTaskSchema.parse(data);
  return repo.createTask(dayId, parsed);
};

export const editTask = async (circuitId, dayId, taskId, data) => {
  await verifyTaskOwnership(circuitId, dayId, taskId);
  const parsed = updateCircuitDayTaskSchema.parse(data);
  return repo.updateTask(taskId, parsed);
};

export const removeTask = async (circuitId, dayId, taskId) => {
  await verifyTaskOwnership(circuitId, dayId, taskId);
  return repo.removeTask(taskId);
};
