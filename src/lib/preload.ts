"use client";

/**
 * Fetch + decode every reveal image ahead of time (while the guest is still
 * on the "Tap to open" screen), so the invitation never builds with images
 * popping in. One shared promise; safe to call many times.
 */
let ready: Promise<void> | null = null;
const keep: HTMLImageElement[] = []; // hold references so the decoded images stay in memory

export function preloadImages(urls: string[]): Promise<void> {
  if (ready) return ready;
  ready = Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          // low priority: never compete with the poster or the video
          (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
          img.onload = () => {
            (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).finally(() => resolve());
          };
          img.onerror = () => resolve(); // a missing file just shows its placeholder
          img.src = src;
          keep.push(img);
        }),
    ),
  ).then(() => undefined);
  return ready;
}

/** Resolves when images are ready, or after `ms` — whichever comes first. */
export function imagesReady(ms: number): Promise<void> {
  return Promise.race([ready ?? Promise.resolve(), new Promise<void>((r) => setTimeout(r, ms))]);
}
