import { nanoid } from "nanoid";
import type { Bindings, QueueMessage } from "../env";

/**
 * Every outbound WhatsApp send is enqueued here: a message_log row (status
 * 'queued') is the audit trail; the queue consumer flips it to sent/failed.
 */
export async function enqueueTemplate(
  env: Bindings,
  msg: Omit<QueueMessage, "kind">,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO message_log (id, recipient, template, language, booking_id) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(`msg_${nanoid(12)}`, msg.recipient, msg.template, msg.language, msg.booking_id ?? null)
    .run();
  await env.MESSAGES.send({ kind: "whatsapp_template", ...msg });
}
