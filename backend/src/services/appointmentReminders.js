import Appointment from "../models/Appointment.js";
import AppointmentReminder from "../models/AppointmentReminder.js";

export const APPOINTMENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function reminderEventKey(appointment) {
  return `${appointment._id}:${new Date(appointment.scheduledAt).getTime()}`;
}

function reminderMessage(appointment) {
  const appointmentTime = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.HOSPITAL_TIME_ZONE || "Asia/Kolkata"
  }).format(new Date(appointment.scheduledAt));
  return `Your appointment with ${appointment.doctor?.fullName || "your doctor"} is scheduled for ${appointmentTime}.`;
}

/**
 * Reconcile one appointment's persisted reminder after creation, rescheduling,
 * cancellation, or a lifecycle transition. The unique event key makes retries safe.
 */
export async function syncAppointmentReminder(appointment, now = new Date()) {
  if (!appointment?._id || !appointment.patient || !appointment.doctor || !appointment.scheduledAt) {
    return { created: false, active: false };
  }

  const appointmentId = appointment._id;
  const isActive = ["Booked", "Confirmed"].includes(appointment.status);
  const scheduledAt = new Date(appointment.scheduledAt);
  const withinWindow = scheduledAt > now && scheduledAt <= new Date(now.getTime() + APPOINTMENT_REMINDER_WINDOW_MS);
  const eventKey = reminderEventKey(appointment);
  const pending = await AppointmentReminder.find({ appointment: appointmentId, status: "Pending" });

  for (const reminder of pending) {
    if (!isActive) {
      reminder.status = appointment.status === "Cancelled" ? "Cancelled" : "Superseded";
      await reminder.save();
    } else if (reminder.eventKey !== eventKey) {
      reminder.status = "Superseded";
      await reminder.save();
    } else if (scheduledAt <= now) {
      reminder.status = "Expired";
      await reminder.save();
    }
  }

  if (!isActive || !withinWindow) return { created: false, active: false };

  try {
    const result = await AppointmentReminder.updateOne(
      { eventKey },
      {
        $setOnInsert: {
          appointment: appointmentId,
          patient: appointment.patient._id || appointment.patient,
          doctor: appointment.doctor._id || appointment.doctor,
          eventKey,
          scheduledAt,
          message: reminderMessage(appointment),
          status: "Pending"
        }
      },
      { upsert: true }
    );
    return { created: Boolean(result.upsertedCount), active: true };
  } catch (error) {
    // Another scheduler instance may have inserted the same unique event key.
    if (error?.code === 11000) return { created: false, active: true };
    throw error;
  }
}

/**
 * Generate all reminders whose appointments are due within the next 24 hours,
 * while reconciling persisted reminders for appointments that moved or changed status.
 */
export async function generateAppointmentReminders(now = new Date()) {
  const windowEnd = new Date(now.getTime() + APPOINTMENT_REMINDER_WINDOW_MS);
  const pendingReminders = await AppointmentReminder.find({ status: "Pending" }).select("appointment");
  const pendingIds = [...new Set(pendingReminders.map(item => String(item.appointment)))];

  const [appointmentsWithPendingReminders, dueAppointments] = await Promise.all([
    pendingIds.length
      ? Appointment.find({ _id: { $in: pendingIds } }).populate("patient", "fullName").populate("doctor", "fullName")
      : Promise.resolve([]),
    Appointment.find({
      status: { $in: ["Booked", "Confirmed"] },
      scheduledAt: { $gt: now, $lte: windowEnd }
    }).populate("patient", "fullName").populate("doctor", "fullName")
  ]);

  const currentAppointments = new Map();
  for (const appointment of [...appointmentsWithPendingReminders, ...dueAppointments]) {
    currentAppointments.set(String(appointment._id), appointment);
  }

  let created = 0;
  let active = 0;
  for (const appointment of currentAppointments.values()) {
    const result = await syncAppointmentReminder(appointment, now);
    if (result.created) created += 1;
    if (result.active) active += 1;
  }

  const existingIds = new Set([...currentAppointments.keys()]);
  const missingAppointmentIds = pendingIds.filter(id => !existingIds.has(id));
  if (missingAppointmentIds.length) {
    await AppointmentReminder.updateMany(
      { appointment: { $in: missingAppointmentIds }, status: "Pending" },
      { $set: { status: "Cancelled" } }
    );
  }

  const expired = await AppointmentReminder.updateMany(
    { status: "Pending", scheduledAt: { $lte: now } },
    { $set: { status: "Expired" } }
  );

  return { created, active, expired: expired.modifiedCount || 0 };
}
