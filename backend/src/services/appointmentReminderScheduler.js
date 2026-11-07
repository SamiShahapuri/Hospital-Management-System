import { generateAppointmentReminders } from "./appointmentReminders.js";

const DEFAULT_INTERVAL_MS = 60 * 1000;

export function startAppointmentReminderScheduler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await generateAppointmentReminders();
      if (result.created > 0) {
        console.info(`Generated ${result.created} appointment reminder(s).`);
      }
    } catch (error) {
      console.error("Appointment reminder job failed:", error.message);
    } finally {
      running = false;
    }
  };

  // Run once at startup, then poll once per minute. The unref'd timer does not
  // keep the API process alive during graceful shutdown.
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
