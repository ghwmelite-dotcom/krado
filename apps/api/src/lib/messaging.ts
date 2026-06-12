import { nanoid } from "nanoid";
import type { Bindings, QueueMessage } from "../env";

/**
 * Every outbound WhatsApp send is enqueued here: a message_log row (status
 * 'queued') is the audit trail; the queue consumer flips it to sent/failed.
 */
export async function enqueueTemplate(
  env: Bindings,
  msg: Omit<QueueMessage, "kind" | "log_id">,
): Promise<void> {
  const logId = `msg_${nanoid(12)}`;
  await env.DB.prepare(
    "INSERT INTO message_log (id, recipient, template, language, booking_id) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(logId, msg.recipient, msg.template, msg.language, msg.booking_id ?? null)
    .run();
  await env.MESSAGES.send({ kind: "whatsapp_template", ...msg, log_id: logId });
}
