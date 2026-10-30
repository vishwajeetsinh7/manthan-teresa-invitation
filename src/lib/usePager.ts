"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, Observer } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";

/**
 * One page per gesture, with a smooth glide between pages (GSAP).
 *
 * Pages are marked in the markup with data-page:
 *   "top"    — the element's top rests at the top of the screen (minus its
 *              CSS scroll-margin-top, so a heading gets breathing room)
 *   "center" — the element rests in the middle of the screen
 *
 * Touch: the page follows the finger at once (up to one page either way);
 * on release it glides on to the next page — or back, for a short nudge —
 * starting at about the finger's speed and slowing to rest.
 * Wheel / arrow keys: one notch moves one page, starting immediately.
 * Native scrolling is switched off while this runs (.scroller[data-paged]);
 * ScrollTriggers still see every scroll position. Each page change is
 * announced as `invite:page` { from, to } on window.
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
    const clamp = gsap.utils.clamp;
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
        list.push(clamp(0, max, Math.round(y)));
      });
      list.sort((a, b) => a - b);
      pages = list.filter((y, i) => i === 0 || y - list[i - 1] > 40);
      if (!pages.length) pages = [0];
    };
    const nearest = () =>
      pages.reduce((best, y, i) => (Math.abs(y - s.scrollTop) < Math.abs(pages[best] - s.scrollTop) ? i : best), 0);

    /** glide from wherever the page is now to page `to` */
    const glideTo = (to: number) => {
      to = clamp(0, pages.length - 1, to);
      const from = index;
      if (to !== from) window.dispatchEvent(new CustomEvent("invite:page", { detail: { from, to } }));
      index = to;
      const remaining = Math.abs(pages[to] - s.scrollTop);
      if (remaining < 1) {
        s.scrollTop = pages[to];
        return;
      }
      // leaving / returning to the first screen is the grandest move; a finger
      // that already moved part of the way leaves less to glide
      const base = to === from ? P.backDur : from === 0 || to === 0 ? P.firstDur : P.dur;
      const full = Math.abs(pages[to] - pages[from]) || s.clientHeight;
      gliding = true;
      gsap.to(s, {
        scrollTop: pages[to],
        duration: clamp(0.3, base, base * Math.sqrt(remaining / full)),
        ease: P.ease,
        overwrite: true,
        onComplete: () => {
          gliding = false;
          quietUntil = performance.now() + P.cooldown * 1000; // swallow trackpad momentum
        },
      });
    };
    const step = (dir: 1 | -1) => {
      if (gliding || performance.now() < quietUntil) return;
      measure();
      if (index + dir < 0 || index + dir >= pages.length) return;
      glideTo(index + dir);
    };
    api.current = { next: () => step(1), enabled: true };

    // where are we now? (the guest may have scrolled before this started)
    measure();
    index = nearest();

    // wheel: one notch → one page, moving straight away (wheelSpeed −1: same sense as touch)
    const wheel = Observer.create({
      target: s,
      type: "wheel",
      wheelSpeed: -1,
      tolerance: P.tolerance,
      preventDefault: true,
      onDown: () => step(-1),
      onUp: () => step(1),
    });

    // touch: the page sticks to the finger, then glides on (or back) on release
    let dragFrom = 0;
    let lo = 0;
    let hi = 0;
    const touch = Observer.create({
      target: s,
      type: "touch",
      preventDefault: true,
      dragMinimum: 2,
      onDragStart: () => {
        gsap.killTweensOf(s); // a touch during a glide catches the page
        gliding = false;
        measure();
        index = nearest();
        dragFrom = s.scrollTop;
        lo = pages[Math.max(0, index - 1)];
        hi = pages[Math.min(pages.length - 1, index + 1)];
      },
      onDrag: (self) => {
        s.scrollTop = clamp(lo, hi, dragFrom - (self.y! - self.startY!));
      },
      onDragEnd: (self) => {
        const moved = self.y! - self.startY!;
        const v = self.velocityY;
        let to = index;
        if (moved < -P.swipe || v < -P.flick) to = index + 1;
        else if (moved > P.swipe || v > P.flick) to = index - 1;
        glideTo(to);
      },
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) step(1);
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) step(-1);
      else if (k === "Home") glideTo(0);
      else if (k === "End") glideTo(pages.length - 1);
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
      wheel.kill();
      touch.kill();
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      gsap.killTweensOf(s);
      delete s.dataset.paged;
      api.current = { next: () => {}, enabled: false };
    };
  }, [scrollerRef, active]);

  return api;
}
