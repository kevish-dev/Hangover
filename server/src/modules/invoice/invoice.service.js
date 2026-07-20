import { prisma } from "../../prisma/client.js";
import { sendCustomInvoiceEmail } from "../../core/services/email.service.js";
import { AppError } from "../../core/errors/errors.js";

export const createInvoice = async (data) => {
  const { customerName, customerEmail, customerPhone, title, description, items, amount, currency, dueDate } = data;

  const invoice = await prisma.customInvoice.create({
    data: {
      customerName,
      customerEmail,
      customerPhone,
      title,
      description,
      items: items || [],
      amount,
      currency: currency || "INR",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "PAID",
    },
  });

  // Send the invoice email
  try {
    await sendCustomInvoiceEmail({
      to: customerEmail,
      customerName,
      title,
      description,
      items,
      amount,
      currency: currency || "INR",
      dueDate: dueDate ? new Date(dueDate) : null,
    });
  } catch (error) {
    console.error("Failed to send custom invoice email:", error);
    // Optionally update status to DRAFT or FAILED if email fails, but we'll leave it as SENT or let admin manage it
  }

  return invoice;
};

export const getInvoices = async () => {
  return await prisma.customInvoice.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const updateInvoiceStatus = async (id, status) => {
  return await prisma.customInvoice.update({
    where: { id },
    data: { status },
  });
};
