import { prisma } from "../../prisma/client.js";

// ── Full Circuit include shape (reused across queries) ────────────────────
const CIRCUIT_FULL_INCLUDE = {
  destination: true,
  createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
  days: {
    orderBy: { dayNumber: "asc" },
    include: {
      tasks: { orderBy: { createdAt: "asc" } },
    },
  },
  packages: true,
  faqs: { orderBy: { order: "asc" } },
  tags: true,
  addOns: { where: { isActive: true } },
};

// ── List ──────────────────────────────────────────────────────────────────
export const findAll = async (skip, take, filter = {}) => {
  const [circuits, total] = await Promise.all([
    prisma.circuit.findMany({
      where: filter,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        destination: true,
        tags: true,
        _count: { select: { days: true, trips: true } },
      },
    }),
    prisma.circuit.count({ where: filter }),
  ]);
  return { circuits, total };
};

// ── Single ────────────────────────────────────────────────────────────────
export const findById = async (id) => {
  return prisma.circuit.findUnique({
    where: { id },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

export const findBySlug = async (slug) => {
  return prisma.circuit.findUnique({
    where: { slug },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

// ── Create (full nested write) ────────────────────────────────────────────
export const create = async ({ days, packages, addOns, tagIds, ...rootData }) => {
  return prisma.circuit.create({
    data: {
      ...rootData,
      days: {
        create: days.map(({ tasks, ...dayData }) => ({
          ...dayData,
          tasks: { create: tasks },
        })),
      },
      packages: { create: packages },
      addOns: { create: addOns },
      tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
    },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

// ── Update root fields only ───────────────────────────────────────────────
export const update = async (id, { tagIds, ...data }) => {
  return prisma.circuit.update({
    where: { id },
    data: {
      ...data,
      ...(tagIds !== undefined && {
        tags: { set: tagIds.map((id) => ({ id })) },
      }),
    },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

// ── Delete ────────────────────────────────────────────────────────────────
export const remove = async (id) => {
  return prisma.circuit.delete({ where: { id } });
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDay sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const createDay = async (circuitId, { tasks, ...dayData }) => {
  return prisma.circuitDay.create({
    data: {
      ...dayData,
      circuitId,
      tasks: { create: tasks ?? [] },
    },
    include: { tasks: true },
  });
};

export const updateDay = async (dayId, data) => {
  return prisma.circuitDay.update({
    where: { id: dayId },
    data,
    include: { tasks: true },
  });
};

export const removeDay = async (dayId) => {
  return prisma.circuitDay.delete({ where: { id: dayId } });
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDayTask sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const createTask = async (circuitDayId, data) => {
  return prisma.circuitDayTask.create({ data: { ...data, circuitDayId } });
};

export const updateTask = async (taskId, data) => {
  return prisma.circuitDayTask.update({ where: { id: taskId }, data });
};

export const removeTask = async (taskId) => {
  return prisma.circuitDayTask.delete({ where: { id: taskId } });
};
