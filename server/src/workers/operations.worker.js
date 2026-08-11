import PQueue from "p-queue";
import { prisma } from "../prisma/client.js";

// One concurrent job at a time — no stampede risk
const queue = new PQueue({ concurrency: 1 });

// How often (ms) we scan for overdue/urgent tasks
const POLL_INTERVAL_MS = 60 * 60 * 1000; // every hour

let _pollerHandle = null;

/**
 * Scans all PENDING / IN_PROGRESS OperationalTasks. For each one whose
 * `dueAt` is within the circuit's `operationsReminderDays` threshold,
 * queues an email blast to all ADMIN users unless we already sent one
 * today.
 */
async function scanAndNotify() {
  const now = new Date();

  // Fetch tasks that are not yet DONE / CANCELLED and have a dueAt set
  const urgentTasks = await prisma.operationalTask.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] },
      dueAt: { not: null },
    },
    include: {
      booking: {
        include: {
          slot: {
            include: {
              trip: true,
              festival: true,
            },
          },
          crmTrip: { select: { operationsReminderDays: true } },
        },
      },
    },
  });

  // Get all admin emails once
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const adminEmails = admins.map((a) => a.email).filter(Boolean);

  if (adminEmails.length === 0) return;

  for (const task of urgentTasks) {
    const dueAt = new Date(task.dueAt);
    const msTillDue = dueAt.getTime() - now.getTime();
    const daysTillDue = msTillDue / (1000 * 60 * 60 * 24);

    const reminderDays = task.booking?.crmTrip?.operationsReminderDays ?? 3;

    if (daysTillDue > reminderDays) continue; // still comfortable — skip

    // Skip if we already sent a reminder today
    if (task.lastReminderSentAt) {
      const lastSent = new Date(task.lastReminderSentAt);
      const sameDay =
        lastSent.getFullYear() === now.getFullYear() &&
        lastSent.getMonth() === now.getMonth() &&
        lastSent.getDate() === now.getDate();
      if (sameDay) continue;
    }

    queue.add(() => _sendReminderEmails(task, daysTillDue, adminEmails));
  }
}

async function _sendReminderEmails(task, daysTillDue, adminEmails) {
  try {
    const { sendOperationsReminderEmail } = await import(
      "../core/services/email.service.js"
    );

    await Promise.allSettled(
      adminEmails.map((email) =>
        sendOperationsReminderEmail({
          to: email,
          taskTitle: task.title,
          taskCategory: task.category,
          taskDescription: task.description,
          dueAt: task.dueAt,
          daysTillDue: Math.ceil(daysTillDue),
          bookingId: task.bookingId,
          isOverdue: daysTillDue < 0,
        })
      )
    );

    // Record that we sent a reminder now
    await prisma.operationalTask.update({
      where: { id: task.id },
      data: {
        lastReminderSentAt: new Date(),
        reminderCount: { increment: 1 },
      },
    });

    // Log a reminder record per email
    await prisma.operationalTaskReminder.createMany({
      data: adminEmails.map((email) => ({
        operationalTaskId: task.id,
        channel: "AUTOMATIC",
        recipientEmail: email,
        subject: `[Action Required] Ops Task Due: ${task.title}`,
        status: "SENT",
        sentAt: new Date(),
      })),
    });
  } catch (err) {
    console.error("[OpsWorker] Failed to send reminder for task", task.id, err.message);
  }
}

export function startOperationsWorker() {
  if (_pollerHandle) return; // already running

  console.log(
    `[OpsWorker] Started — scanning every ${POLL_INTERVAL_MS / 60000} minutes.`
  );

  // Run immediately on startup, then on interval
  scanAndNotify().catch((err) =>
    console.error("[OpsWorker] Initial scan error:", err)
  );

  _pollerHandle = setInterval(() => {
    scanAndNotify().catch((err) =>
      console.error("[OpsWorker] Scan error:", err)
    );
  }, POLL_INTERVAL_MS);
}

export function stopOperationsWorker() {
  if (_pollerHandle) {
    clearInterval(_pollerHandle);
    _pollerHandle = null;
    console.log("[OpsWorker] Stopped.");
  }
}
