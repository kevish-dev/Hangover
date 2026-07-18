import { prisma } from "../../prisma/client.js";

export const getBookingOperations = async (req, res, next) => {
  try {
    const tasks = await prisma.operationalTask.findMany({
      where: { bookingId: req.params.bookingId },
      orderBy: { dueAt: "asc" },
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};
