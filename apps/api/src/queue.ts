import type { Bindings, QueueMessage } from "./env";

/** Queue consumer — WhatsApp sender lands in the messaging task. */
export async function consumeMessages(batch: MessageBatch<QueueMessage>, env: Bindings): Promise<void> {
  const { deliverTemplate } = await import("./lib/whatsapp");
  for (const msg of batch.messages) {
    try {
      await deliverTemplate(msg.body, env);
      msg.ack();
    } catch (err) {
      console.error("queue delivery failed", { template: msg.body.template, err: (err as Error).message });
      msg.retry({ delaySeconds: 30 * (msg.attempts + 1) });
    }
  }
}
