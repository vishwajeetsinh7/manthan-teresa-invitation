"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, Observer } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";

/**
 * One page per gesture, with a slow eased glide between pages (GSAP).
 *
 * Pages are marked in the markup with data-page:
 *   "top"    — the element's top rests at the top of the screen (minus its
 *              CSS scroll-margin-top, so a heading gets breathing room)
 *   "center" — the element rests in the middle of the screen
 * A swipe, wheel notch or arrow key moves exactly one page; input during a
 * glide is ignored. Native scrolling is switched off while this runs
 * (.scroller[data-paged]); ScrollTriggers still see every scroll position.
 * Each move announces itself as `invite:page` { from, to } on window.
 *
 * With reduced motion it does nothing and the page scrolls (and snaps) natively.
 */
export type PageEvent = CustomEvent<{ from: number; to: number }>;

/** an element's offset inside the scroller, ignoring transforms */
function offsetIn(el: HTMLElement, scroller: HTMLElement) {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== scroller) {
    y += n.offsetTop;
    const parent = n.offsetParent as HTMLElement | null;
    // the scroller is positioned, so the chain reaches it
    if (parent === scroller || !parent) break;
    n = parent;
  }
  return y;
}

export function usePager(scrollerRef: RefObject<HTMLDivElement | null>, active: boolean) {
  const api = useRef({ next: () => {}, enabled: false });

  useEffect(() => {
    const s = scrollerRef.current;
    if (!active || !s) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const P = timing.paging;
    s.dataset.paged = "";

    let pages: number[] = [0];
    let index = 0;
    let gliding = false;
    let quietUntil = 0;

    const measure = () => {
      const H = s.clientHeight;
      const max = s.scrollHeight - H;
      const list: number[] = [];
      s.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
        const top = offsetIn(el, s);
        const y =
          el.dataset.page === "center"
            ? top + el.offsetHeight / 2 - H / 2
            : top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
        list.push(gsap.utils.clamp(0, max, Math.round(y)));
      });
      list.sort((a, b) => a - b);
      pages = list.filter((y, i) => i === 0 || y - list[i - 1] > 40);
      if (!pages.length) pages = [0];
    };

    const goTo = (to: number) => {
      measure();
      to = gsap.utils.clamp(0, pages.length - 1, to);
      if (to === index || gliding) return;
      const from = index;
      index = to;
      gliding = true;
      window.dispatchEvent(new CustomEvent("invite:page", { detail: { from, to } }));
      gsap.to(s, {
        scrollTop: pages[to],
        // leaving / returning to the first screen is the slowest, grandest move
        duration: from === 0 || to === 0 ? P.firstDur : P.dur,
        ease: P.ease,
        overwrite: true,
        onComplete: () => {
          gliding = false;
          quietUntil = performance.now() + P.cooldown * 1000; // swallow trackpad inertia
        },
      });
    };
    const go = (dir: 1 | -1) => {
      if (gliding || performance.now() < quietUntil) return;
      goTo(index + dir);
    };
    api.current = { next: () => go(1), enabled: true };

    // where are we now? (the guest may have scrolled before this started)
    measure();
    index = pages.reduce((best, y, i) => (Math.abs(y - s.scrollTop) < Math.abs(pages[best] - s.scrollTop) ? i : best), 0);

    // wheel + touch swipes (wheelSpeed −1 makes both read the same way round)
    const obs = Observer.create({
      target: s,
      type: "wheel,touch",
      wheelSpeed: -1,
      tolerance: P.tolerance,
      preventDefault: true,
      onDown: () => go(-1),
      onUp: () => go(1),
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) go(1);
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) go(-1);
      else if (k === "Home") goTo(0);
      else if (k === "End") goTo(pages.length - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);

    // layout changes (fonts, rotation, resize): stay on the same page
    const realign = () => {
      if (gliding) return;
      measure();
      index = Math.min(index, pages.length - 1);
      s.scrollTop = pages[index];
    };
    const ro = new ResizeObserver(realign);
    ro.observe(s);
    Array.from(s.children).forEach((c) => ro.observe(c));

    return () => {
      obs.kill();
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      gsap.killTweensOf(s);
      delete s.dataset.paged;
      api.current = { next: () => {}, enabled: false };
    };
  }, [scrollerRef, active]);

  return api;
}
