"use server";

import { redirect } from "next/navigation";
import { isAdmin, signIn, signOut } from "@/src/lib/adminAuth";
import { codeFor } from "@/src/lib/inviteLink";
import { EVENT_IDS } from "@/src/content/events";
import type { EventId } from "@/src/content/types";

export async function login(_prev: { error: string } | null, form: FormData) {
  const ok = await signIn(String(form.get("password") ?? ""));
  if (!ok) {
    // a moment's pause makes guessing slow
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That password isn't right." };
  }
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin");
}

/** a signed invitation link (its path) for these events — admins only */
export async function createLink(ids: string[]): Promise<{ path: string } | { error: string }> {
  if (!(await isAdmin())) return { error: "Please sign in again." };
  const chosen = EVENT_IDS.filter((id) => ids.includes(id)) as EventId[];
  if (!chosen.length) return { error: "Choose at least one event." };
  const code = codeFor(chosen);
  if (!code) return { error: "Couldn't make that link." };
  return { path: `/i/${code}` };
}
