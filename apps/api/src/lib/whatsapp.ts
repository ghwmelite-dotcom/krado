import type { Bindings, QueueMessage } from "../env";

/** Outbound WhatsApp template delivery — implemented in the messaging task. */
export async function deliverTemplate(msg: QueueMessage, env: Bindings): Promise<void> {
  if (!env.WA_ACCESS_TOKEN) {
    console.log("[dev] WhatsApp send skipped", { template: msg.template, to: msg.recipient });
    return;
  }
  throw new Error("not implemented");
}
