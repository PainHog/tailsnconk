// Resend transactional-email helper.
//
// Reads RESEND_API_KEY and NEWSLETTER_FROM from the environment (never hardcode
// keys). Exposes a single send() plus a batch sender for the broadcast job.

import { requireEnv } from "./supabase.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Extra RFC headers, e.g. List-Unsubscribe / List-Unsubscribe-Post. */
  headers?: Record<string, string>;
  /** Override the default sender for this message. */
  from?: string;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

function withFrom(msg: EmailMessage): EmailMessage & { from: string } {
  return { ...msg, from: msg.from ?? requireEnv("NEWSLETTER_FROM") };
}

/** Send one email via Resend. Throws on a non-2xx response. */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(withFrom(msg)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}

/**
 * Send a batch of emails via Resend's batch endpoint (max 100 per call). The
 * caller is responsible for chunking to <= 100. Throws on a non-2xx response.
 */
export async function sendEmailBatch(messages: EmailMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(RESEND_BATCH_ENDPOINT, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(messages.map(withFrom)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend batch send failed (${res.status}): ${detail}`);
  }
}
