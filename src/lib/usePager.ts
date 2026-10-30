"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, Observer } from "@/src/lib/gsap";
import { timing } from "@/src/config/timing";

/**
 * One page per gesture, with a smooth glide between pages (GSAP).
 *
 * Pages are content groups, marked in the markup with data-page="<name>":
 * every element with the same name (plus any [data-page-part] inside it, e.g.
 * the mandala and the ceremony scene hanging below the Mehndi text) makes up
 * one page. Its resting point is placed from that content:
 *   • fits on screen → the group sits a little above the middle
 *     (timing.paging.bias of the free space above it)
 *   • taller than the screen → its top rests just below the top edge
 *   • "hero" is always the very top
 * Boxes are measured without passing animations (entrance offsets, the
 * spinning mandala), so a page's stop never drifts while things animate.
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
    /** a slower glide between page i − 1 and i (a pinned scene assembling) */
    let slow: (number | undefined)[] = [];
    let index = 0;
    let gliding = false;
    let quietUntil = 0;

    /** an element's box in scroll coordinates. Elements that slide in on
        entry (.reveal-up) are measured by layout, ignoring that offset. */
    const boxOf = (el: HTMLElement, sTop: number, scrollTop: number) => {
      if (el.classList.contains("reveal-up")) {
        const top = offsetIn(el, s);
        return { top, bottom: top + el.offsetHeight };
      }
      const r = el.getBoundingClientRect();
      return { top: r.top - sTop + scrollTop, bottom: r.bottom - sTop + scrollTop };
    };
    const measure = () => {
      const H = s.clientHeight;
      const max = s.scrollHeight - H;
      const u = Math.min(s.clientWidth, H * 0.5625) / 390;
      // the controls sit 14u below the safe area: read the safe area from them
      const controls = document.querySelector<HTMLElement>(".controls");
      const safeTop = controls ? Math.max(0, controls.offsetTop - 14 * u) : 0;
      const padTop = P.padTop * u + safeTop;
      const padBottom = P.padBottom * u;
      const sTop = s.getBoundingClientRect().top;
      const groups = new Map<string, { top: number; bottom: number }>();
      s.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
        const name = el.dataset.page!;
        for (const part of [el, ...el.querySelectorAll<HTMLElement>("[data-page-part]")]) {
          const b = boxOf(part, sTop, s.scrollTop);
          if (b.bottom - b.top <= 0) continue;
          const g = groups.get(name);
          groups.set(name, g ? { top: Math.min(g.top, b.top), bottom: Math.max(g.bottom, b.bottom) } : b);
        }
      });
      const list: { y: number; dur?: number }[] = [];
      groups.forEach((g, name) => {
        let y = 0;
        if (name !== "hero") {
          const free = H - padTop - padBottom - (g.bottom - g.top);
          y = g.top - padTop - Math.max(0, free) * P.bias;
        }
        list.push({ y: clamp(0, max, Math.round(y)) });
      });
      // a pinned (sticky) scene: one stop where its stage settles into place,
      // one where it has finished assembling — reached by a slower glide
      s.querySelectorAll<HTMLElement>("[data-page-pin]").forEach((el) => {
        const stage = el.firstElementChild as HTMLElement | null;
        if (!stage) return;
        const stick = parseFloat(getComputedStyle(stage).top) || 0;
        const top = offsetIn(el, s);
        list.push({ y: clamp(0, max, Math.round(top - stick)) });
        list.push({ y: clamp(0, max, Math.round(top + el.offsetHeight - stage.offsetHeight - stick)), dur: Number(el.dataset.pageDur) || P.dur });
      });
      list.sort((a, b) => a.y - b.y);
      const kept = list.filter((p, i) => i === 0 || p.y - list[i - 1].y > 40);
      pages = kept.length ? kept.map((p) => p.y) : [0];
      slow = kept.map((p) => p.dur);
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
      const seg = Math.abs(to - from) === 1 ? slow[Math.max(to, from)] : undefined;
      const base = to === from ? P.backDur : (seg ?? (from === 0 || to === 0 ? P.firstDur : P.dur));
      const full = Math.abs(pages[to] - pages[from]) || s.clientHeight;
      gliding = true;
      gsap.to(s, {
        scrollTop: pages[to],
        duration: clamp(0.3, base, base * Math.sqrt(remaining / full)),
        // through an assembling scene: even pacing, so the build-up reads well
        ease: seg ? "power2.inOut" : P.ease,
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
    // dev only: inspect from the console
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __pager: object }).__pager = { pages: () => (measure(), pages), index: () => index, gliding: () => gliding };
    }

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
    let dragging = false;
    let dragFrom = 0;
    let lo = 0;
    let hi = 0;
    const touch = Observer.create({
      target: s,
      type: "touch",
      preventDefault: true,
      dragMinimum: 2,
      onDragStart: () => {
        dragging = true;
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
        dragging = false;
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

    // layout changes (fonts, images, rotation): ease back onto the same page —
    // never while the finger is down or a glide is running, never a jump
    let raf = 0;
    const realign = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (gliding || dragging) return;
        measure();
        index = Math.min(index, pages.length - 1);
        if (Math.abs(s.scrollTop - pages[index]) < 2) return;
        gsap.to(s, { scrollTop: pages[index], duration: 0.45, ease: "power2.out", overwrite: true });
      });
    };
    const ro = new ResizeObserver(realign);
    ro.observe(s);
    Array.from(s.children).forEach((c) => ro.observe(c));

    return () => {
      cancelAnimationFrame(raf);
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
