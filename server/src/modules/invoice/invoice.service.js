import { prisma } from "../../prisma/client.js";
import { sendCustomInvoiceEmail } from "../../core/services/email.service.js";
import { AppError } from "../../core/errors/errors.js";

export const createInvoice = async (data) => {
  const { customerName, customerEmail, customerPhone, title, description, items, amount, currency, dueDate } = data;

  const invoice = await prisma.customInvoice.create({
    data: {
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      title,
      description: description || null,
      items: items || [],
      amount,
      currency: currency || "INR",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "DRAFT",
      source: "CUSTOM",
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
    return await prisma.customInvoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", sentAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to send custom invoice email:", error);
    throw new AppError(
      "Receipt was saved as a draft because its email could not be delivered",
      502,
      "INVOICE_EMAIL_FAILED",
    );
  }
};

export const getInvoices = async () => {
  return await prisma.customInvoice.findMany({
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
  });
};

export const updateInvoiceStatus = async (id, status) => {
  return await prisma.customInvoice.update({
    where: { id },
    data: { status },
  });
};
