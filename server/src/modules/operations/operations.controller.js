import { prisma } from "../../prisma/client.js";
import * as operationsService from "./operations.service.js";

export const listOperationalTasks = async (req, res, next) => {
  try {
    res.status(200).json(await operationsService.listOperationalTasks(req.query));
  } catch (error) {
    next(error);
  }
};

export const updateOperationalTask = async (req, res, next) => {
  try {
    res.status(200).json(await operationsService.updateOperationalTask(req.params.taskId, req.body));
  } catch (error) {
    next(error);
  }
};

export const getBookingOperations = async (req, res, next) => {
  try {
    const tasks = await prisma.operationalTask.findMany({
      where: { bookingId: req.params.bookingId },
      orderBy: { dueAt: "asc" },
      include: { itineraryDay: true },
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createOperationalTask = async (req, res, next) => {
  try {
    res.status(201).json(await operationsService.createOperationalTask(req.params.bookingId, req.body));
  } catch (error) {
    next(error);
  }
};

export const deleteOperationalTask = async (req, res, next) => {
  try {
    await operationsService.deleteOperationalTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
