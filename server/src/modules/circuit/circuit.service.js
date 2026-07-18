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

export const getCircuitBySlug = async (slug) => {
  const circuit = await repo.findBySlug(slug);
  if (!circuit) throw notFound();
  return circuit;
};

export const createCircuit = async (data, adminId) => {
  const parsed = createCircuitSchema.parse(data);
  return repo.create({ ...parsed, createdById: adminId });
};

export const updateCircuit = async (id, data) => {
  await getCircuitById(id);
  const parsed = updateCircuitSchema.parse(data);
  return repo.update(id, parsed);
};

export const deleteCircuit = async (id) => {
  await getCircuitById(id);
  return repo.remove(id);
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
