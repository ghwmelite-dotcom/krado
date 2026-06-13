import type { Bindings, QueueMessage } from "./env";

/** Queue consumer — delivers Telegram messages with retry/backoff. */
export async function consumeMessages(batch: MessageBatch<QueueMessage>, env: Bindings): Promise<void> {
  const { deliverQueued } = await import("./lib/telegram");
  for (const msg of batch.messages) {
    try {
      await deliverQueued(msg.body, env);
      msg.ack();
    } catch (err) {
      console.error("queue delivery failed", { chat: msg.body.chat_id, err: (err as Error).message });
      msg.retry({ delaySeconds: 30 * (msg.attempts + 1) });
    }
  }
}
