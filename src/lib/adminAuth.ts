import "server-only";
/**
 * The /admin sign-in: ADMIN_PASSWORD (an environment variable; "admin2026" while it isn't set) lets you in, and a
 * signed, http-only cookie keeps you in for 30 days. Changing ADMIN_PASSWORD (or
 * INVITE_SECRET) signs everyone out.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { inviteSecret } from "./inviteLink";

const COOKIE = "invite_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

/** the password while ADMIN_PASSWORD isn't set */
const DEFAULT_PASSWORD = "admin2026";

function keys() {
  return { password: process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD, secret: inviteSecret() };
}

/** is the default password in use? */
export const usingDefaultPassword = () => !process.env.ADMIN_PASSWORD;

function token(k: { password: string; secret: string }) {
  return createHmac("sha256", k.secret).update(`admin:v1:${k.password}`).digest("base64url");
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function isAdmin() {
  const k = keys();
  const c = (await cookies()).get(COOKIE)?.value;
  return !!c && same(c, token(k));
}

/** checks the password; on a match, signs this browser in */
export async function signIn(password: string) {
  const k = keys();
  if (!same(password, k.password)) return false;
  (await cookies()).set(COOKIE, token(k), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
  return true;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
