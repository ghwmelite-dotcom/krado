import { MESSAGES, type Lang, type MessageKey } from "@krado/shared";
import type { Bindings, QueueMessage } from "../env";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/**
 * Sends one pre-approved template via the WhatsApp Cloud API and updates the
 * message_log row. Without credentials (local dev) it logs and marks sent so
 * flows stay testable end-to-end.
 */
export async function deliverTemplate(msg: QueueMessage, env: Bindings): Promise<void> {
  // Guard: only registered template keys may go out (they map 1:1 to the
  // templates submitted to Meta).
  if (!(msg.template in MESSAGES.en) || !msg.template.startsWith("wa_")) {
    throw new Error(`unknown template: ${msg.template}`);
  }

  if (!env.WA_ACCESS_TOKEN || !env.WA_PHONE_NUMBER_ID) {
    console.log("[dev] WhatsApp send", {
      template: msg.template,
      to: msg.recipient,
      body: renderPreview(msg.template as MessageKey, msg.language, msg.params),
    });
    await markLog(env, msg.log_id, "sent", `wamid.dev.${crypto.randomUUID()}`);
    return;
  }

  const res = await fetch(`${GRAPH_BASE}/${env.WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WA_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: msg.recipient.replace("+", ""),
      type: "template",
      template: {
        name: msg.template,
        language: { code: msg.language },
        components: [
          {
            type: "body",
            parameters: msg.params.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    await markLog(env, msg.log_id, "failed", null);
    throw new Error(`whatsapp send failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { messages?: Array<{ id: string }> };
  await markLog(env, msg.log_id, "sent", body.messages?.[0]?.id ?? null);
}

async function markLog(
  env: Bindings,
  logId: string | undefined,
  status: "sent" | "failed",
  waMessageId: string | null,
): Promise<void> {
  if (!logId) return;
  await env.DB.prepare("UPDATE message_log SET status = ?, wa_message_id = COALESCE(?, wa_message_id) WHERE id = ?")
    .bind(status, waMessageId, logId)
    .run();
}

function renderPreview(key: MessageKey, lang: Lang, params: string[]): string {
  let body: string = MESSAGES[lang]?.[key] ?? MESSAGES.en[key];
  params.forEach((p, i) => {
    body = body.replaceAll(`{{${i + 1}}}`, p);
  });
  return body;
}
