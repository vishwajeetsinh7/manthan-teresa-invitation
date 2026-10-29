"use client";

import { useEffect, useRef } from "react";

/** Fine gold dust twinkling on a canvas. Pauses when off-screen. */
export function GoldDust({ count }: { count: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // one pre-rendered glow sprite, reused for every particle
    const sprite = document.createElement("canvas");
    const S = 32;
    sprite.width = sprite.height = S;
    const sc = sprite.getContext("2d")!;
    const g = sc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,240,200,1)");
    g.addColorStop(0.25, "rgba(222,190,120,0.85)");
    g.addColorStop(1, "rgba(176,138,74,0)");
    sc.fillStyle = g;
    sc.fillRect(0, 0, S, S);

    const n = Math.min(count, 40);
    const parts = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 2 + Math.random() * 4.5,
      ph: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 1.4,
      vy: 0.004 + Math.random() * 0.01,
      sw: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let last = performance.now();
    let visible = true;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      for (const p of parts) {
        p.y -= p.vy * dt;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const tw = Math.sin(t * p.sp + p.ph);
        const a = 0.12 + 0.7 * Math.pow(Math.max(0, tw), 3);
        const x = (p.x + Math.sin(t * 0.3 + p.sw) * 0.01) * W;
        const y = p.y * H;
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, x - p.r, y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
      if (visible) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [count]);

  return <canvas ref={ref} className="dust-canvas" aria-hidden />;
}
