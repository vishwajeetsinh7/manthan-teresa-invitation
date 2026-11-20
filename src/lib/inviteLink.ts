import "server-only";
/**
 * Invitation links: /i/<code>. The code says which events the link opens and is
 * signed with INVITE_SECRET (an HMAC), so it can't be edited to open other
 * events: a changed code simply opens nothing (the card alone).
 *
 *   code = <events: 1 base-36 char, a bit per event> + <signature: 16 chars>
 *
 * The same events always give the same link. Changing INVITE_SECRET retires every
 * link made before.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { EVENT_IDS } from "@/src/content/events";
import type { EventId } from "@/src/content/types";

const SIG_LEN = 16;

/** used while INVITE_SECRET isn't set. Set your own in Vercel before sending links: anyone who
 *  can read this code could otherwise make links (and changing the secret later retires the
 *  links already sent) */
const FALLBACK_SECRET = "6G9WVOl9xS7dZATW5rEuyJyX7UKce7Ao";

/** the signing secret (INVITE_SECRET, or the built-in fallback) */
export function inviteSecret() {
  const s = process.env.INVITE_SECRET;
  return s && s.length >= 16 ? s : FALLBACK_SECRET;
}

/** is the built-in fallback secret in use? */
export const usingFallbackSecret = () => inviteSecret() === FALLBACK_SECRET;

const secret = inviteSecret;

function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(`invite:v1:${payload}`).digest("base64url").slice(0, SIG_LEN);
}

/** the code for a link to these events (null: no secret set, or no events) */
export function codeFor(ids: readonly EventId[]): string | null {
  const key = secret();
  let mask = 0;
  EVENT_IDS.forEach((id, i) => {
    if (ids.includes(id)) mask |= 1 << i;
  });
  if (!key || !mask) return null;
  const payload = mask.toString(36);
  return payload + sign(payload, key);
}

/** the events a code opens (null: not a valid, signed code) */
export function eventsOf(code: string): EventId[] | null {
  const key = secret();
  if (!key || typeof code !== "string" || code.length < 1 + SIG_LEN || code.length > 2 + SIG_LEN) return null;
  const payload = code.slice(0, code.length - SIG_LEN);
  const sig = Buffer.from(code.slice(-SIG_LEN));
  const want = Buffer.from(sign(payload, key));
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return null;
  const mask = parseInt(payload, 36);
  if (!Number.isInteger(mask) || mask <= 0) return null;
  const ids = EVENT_IDS.filter((_, i) => mask & (1 << i));
  return ids.length ? ids : null;
}
