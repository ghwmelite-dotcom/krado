import type { Bindings } from "./env";

/** Cron dispatch — engines land in the cron tasks (reminders, nudges, susu). */
export async function runCron(cron: string, env: Bindings): Promise<void> {
  switch (cron) {
    case "*/5 * * * *": {
      const { sendReminders } = await import("./jobs/reminders");
      return sendReminders(env);
    }
    case "0 20 * * *": {
      const { computeNudges } = await import("./jobs/nudges");
      return computeNudges(env);
    }
    case "0 21 * * *": {
      const { susuSweep } = await import("./jobs/susu");
      return susuSweep(env);
    }
    default:
      console.warn("unknown cron", cron);
  }
}
