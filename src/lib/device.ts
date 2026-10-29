"use client";

/**
 * Touch phones/tablets: skip effects that are cheap on a desktop GPU but
 * expensive on a phone (e.g. animating `filter: blur()`, which re-renders
 * the text on every frame).
 */
let cached: boolean | null = null;
export function isTouchDevice(): boolean {
  if (cached === null) {
    cached = typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }
  return cached;
}

/** A light blur for fade-ins on desktop; no blur on phones. */
export function SOFT_BLUR(px: number): string {
  return isTouchDevice() || px === 0 ? (isTouchDevice() ? "none" : "blur(0px)") : `blur(${px}px)`;
}
