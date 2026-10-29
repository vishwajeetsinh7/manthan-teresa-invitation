"use client";

/**
 * Realistic flower "blast" on one canvas.
 *
 * Each flower is cut into petal-shaped pieces of its OWN photo (so a red
 * rose throws real red-rose petals), plus a few loose petal images and a
 * burst of gold sparks. Every piece then lives by simple physics:
 *   explosive kick → air drag (petals slow and float) → gravity
 *   + side-to-side flutter + 3D flip (tumbling) + spin + depth.
 * Pre-rendered sprites + one canvas keeps it cheap on phones; the loop only
 * runs while something is in the air.
 */

type Sprite = { img: CanvasImageSource; w: number; h: number };
type Piece = {
  s: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  flip: number;
  vflip: number;
  swayA: number;
  swayF: number;
  swayP: number;
  drag: number;
  grav: number;
  scale: number;
  age: number;
  life: number;
  alpha: number;
  spark?: boolean;
  /** this petal fades out around the middle of the screen (the rest fall to the bottom) */
  mid?: boolean;
  delay: number;
};
type Puff = { x: number; y: number; r: number; age: number; life: number; delay: number };

export type BlastSource = {
  /** the flower's <img> (already loaded) */
  img: HTMLImageElement;
  /** its box on screen */
  rect: DOMRect;
  /** loose petal images to mix in */
  extras: HTMLImageElement[];
  /** seconds before this flower blasts (cascade) */
  delay: number;
  /** small flower / bud → fewer pieces */
  small?: boolean;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class PetalBlast {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private pieces: Piece[] = [];
  private puffs: Puff[] = [];
  private raf = 0;
  private last = 0;
  private W = 0;
  private H = 0;
  private ro: ResizeObserver;
  private spark: Sprite;

  constructor(
    private host: HTMLElement,
    private lite: boolean,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "blast-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.spark = this.makeSpark();
  }

  private resize() {
    this.W = this.host.clientWidth;
    this.H = this.host.clientHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private makeSpark(): Sprite {
    const c = document.createElement("canvas");
    const S = 24;
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, "rgba(255,248,220,1)");
    grd.addColorStop(0.3, "rgba(236,204,140,0.9)");
    grd.addColorStop(1, "rgba(176,138,74,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
    return { img: c, w: S, h: S };
  }

  /** Cut one petal-shaped piece out of the flower photo. */
  private cut(src: HTMLCanvasElement, cx: number, cy: number, a: number, b: number, angle: number): Sprite {
    const c = document.createElement("canvas");
    c.width = Math.ceil(a * 2 + 2);
    c.height = Math.ceil(b * 2 + 2);
    const g = c.getContext("2d")!;
    g.translate(c.width / 2, c.height / 2);
    g.beginPath();
    // a petal: an egg shape, wider at the outer end
    g.moveTo(-a, 0);
    g.bezierCurveTo(-a * 0.6, -b * 0.95, a * 0.75, -b * 1.05, a, 0);
    g.bezierCurveTo(a * 0.75, b * 1.05, -a * 0.6, b * 0.95, -a, 0);
    g.closePath();
    g.clip();
    g.rotate(-angle);
    g.drawImage(src, -cx, -cy);
    // a soft inner shade along the base makes it read as a curved petal
    g.rotate(angle);
    const sh = g.createLinearGradient(-a, 0, a, 0);
    sh.addColorStop(0, "rgba(30,5,8,0.28)");
    sh.addColorStop(0.5, "rgba(30,5,8,0)");
    g.fillStyle = sh;
    g.fillRect(-a, -b, a * 2, b * 2);
    return { img: c, w: c.width / this.dpr, h: c.height / this.dpr };
  }

  blast(sources: BlastSource[]) {
    const host = this.host.getBoundingClientRect();
    for (const s of sources) {
      const R = Math.min(s.rect.width, s.rect.height) / 2; // css px
      if (R < 4) continue;
      const ox = s.rect.left - host.left + s.rect.width / 2;
      const oy = s.rect.top - host.top + s.rect.height / 2;

      // the flower photo at device resolution
      const src = document.createElement("canvas");
      const P = Math.ceil(R * 2 * this.dpr);
      src.width = src.height = P;
      const sg = src.getContext("2d")!;
      try {
        sg.drawImage(s.img, 0, 0, P, P);
      } catch {
        continue;
      }
      const pr = P / 2; // radius in device px

      // rings of petals: outer, inner, heart
      const rings = s.small
        ? [
            { n: this.lite ? 3 : 4, rho: 0.56, a: 0.38, b: 0.29 },
            { n: 2, rho: 0.22, a: 0.28, b: 0.21 },
          ]
        : [
            { n: this.lite ? 5 : 6, rho: 0.6, a: 0.34, b: 0.25 },
            { n: this.lite ? 2 : 3, rho: 0.33, a: 0.26, b: 0.19 },
            { n: 1, rho: 0, a: 0.17, b: 0.15 },
          ];
      for (const ring of rings) {
        for (let i = 0; i < ring.n; i++) {
          const ang = (i / ring.n) * Math.PI * 2 + rnd(-0.2, 0.2);
          const cx = pr + Math.cos(ang) * ring.rho * pr;
          const cy = pr + Math.sin(ang) * ring.rho * pr;
          const sprite = this.cut(src, cx, cy, ring.a * pr, ring.b * pr, ang);
          // start where that bit of the flower was
          const sx = ox + Math.cos(ang) * ring.rho * R;
          const sy = oy + Math.sin(ang) * ring.rho * R;
          const kick = rnd(260, 560) * (0.6 + ring.rho) * (s.small ? 0.8 : 1);
          const dir = ang + rnd(-0.35, 0.35);
          this.pieces.push(this.petal(sprite, sx, sy, Math.cos(dir) * kick, Math.sin(dir) * kick - rnd(120, 300), ang, s.delay));
        }
      }

      // a few loose petal images for variety
      const extraN = s.small ? 0 : this.lite ? 1 : 2;
      for (let i = 0; i < extraN && s.extras.length; i++) {
        const im = s.extras[i % s.extras.length];
        const size = R * rnd(0.32, 0.5);
        const sprite = { img: im, w: size, h: size };
        const dir = rnd(0, Math.PI * 2);
        const kick = rnd(220, 480);
        this.pieces.push(this.petal(sprite, ox, oy, Math.cos(dir) * kick, Math.sin(dir) * kick - rnd(150, 320), dir, s.delay));
      }

      // gold sparks + a flash of light at the moment of the blast
      const sparks = s.small ? 4 : this.lite ? 6 : 10;
      for (let i = 0; i < sparks; i++) {
        const dir = rnd(0, Math.PI * 2);
        const kick = rnd(260, 720);
        const size = rnd(4, 9);
        this.pieces.push({
          s: { img: this.spark.img, w: size, h: size },
          x: ox,
          y: oy,
          vx: Math.cos(dir) * kick,
          vy: Math.sin(dir) * kick,
          rot: 0,
          vr: 0,
          flip: 0,
          vflip: 0,
          swayA: 0,
          swayF: 0,
          swayP: 0,
          drag: 4.2,
          grav: 160,
          scale: 1,
          age: 0,
          life: rnd(0.45, 0.9),
          alpha: 1,
          spark: true,
          delay: s.delay,
        });
      }
      this.puffs.push({ x: ox, y: oy, r: R * 1.6, age: 0, life: 0.38, delay: s.delay });
    }
    this.start();
  }

  private petal(s: Sprite, x: number, y: number, vx: number, vy: number, rot: number, delay: number): Piece {
    return {
      s,
      x,
      y,
      vx,
      vy,
      rot,
      vr: rnd(-7, 7), // rad/s, fast spin that slows with drag
      flip: rnd(0, Math.PI * 2),
      vflip: rnd(2.5, 7) * (Math.random() < 0.5 ? -1 : 1), // 3D tumble
      swayA: rnd(30, 90),
      swayF: rnd(1.6, 3.4),
      swayP: rnd(0, Math.PI * 2),
      drag: rnd(1.7, 2.8), // air resistance → floaty fall
      grav: rnd(480, 640),
      scale: rnd(0.85, 1.25), // depth: some petals closer
      age: 0,
      life: rnd(3.6, 5.2),
      alpha: 1,
      mid: Math.random() < 0.5,
      delay,
    };
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 1 / 30);
      this.last = now;
      this.step(dt);
      this.draw();
      if (this.pieces.length || this.puffs.length) this.raf = requestAnimationFrame(tick);
      else {
        this.raf = 0;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private step(dt: number) {
    const H = this.H;
    for (const p of this.pieces) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.age += dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.grav * dt * (p.spark ? 1 : 0.9);
      // flutter: petals swing side to side as they fall
      const sway = p.spark ? 0 : Math.sin(p.age * p.swayF + p.swayP) * p.swayA;
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vr *= Math.exp(-0.6 * dt);
      p.flip += p.vflip * dt;
      // fade near the end of life / bottom of the screen
      const lifeFade = Math.min(1, (p.life - p.age) / (p.spark ? 0.35 : 0.8));
      // half the petals melt away around the middle of the screen; the rest fall to the bottom
      const floor = p.mid ? H * 0.58 : H + 40;
      const floorFade = p.spark ? 1 : Math.min(1, (floor - p.y) / (H * (p.mid ? 0.14 : 0.25)));
      p.alpha = Math.max(0, Math.min(lifeFade, floorFade));
    }
    this.pieces = this.pieces.filter((p) => p.delay > 0 || (p.age < p.life && p.y < H + 60 && p.alpha > 0.01));
    for (const f of this.puffs) {
      if (f.delay > 0) f.delay -= dt;
      else f.age += dt;
    }
    this.puffs = this.puffs.filter((f) => f.delay > 0 || f.age < f.life);
  }

  private draw() {
    const c = this.ctx;
    const d = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // flash of warm light where a flower bursts
    for (const f of this.puffs) {
      if (f.delay > 0) continue;
      const t = f.age / f.life;
      const r = f.r * (0.4 + t * 0.9);
      c.setTransform(d, 0, 0, d, 0, 0);
      const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, `rgba(255,244,214,${0.55 * (1 - t)})`);
      g.addColorStop(1, "rgba(255,244,214,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(f.x, f.y, r, 0, Math.PI * 2);
      c.fill();
    }

    for (const p of this.pieces) {
      if (p.delay > 0 || p.alpha <= 0) continue;
      const fx = p.spark ? 1 : Math.cos(p.flip); // 3D tumble: width follows the flip
      const sx = (Math.abs(fx) < 0.18 ? 0.18 * Math.sign(fx || 1) : fx) * p.scale;
      const cos = Math.cos(p.rot);
      const sin = Math.sin(p.rot);
      c.globalCompositeOperation = p.spark ? "lighter" : "source-over";
      c.globalAlpha = p.alpha;
      c.setTransform(cos * sx * d, sin * sx * d, -sin * p.scale * d, cos * p.scale * d, p.x * d, p.y * d);
      c.drawImage(p.s.img, -p.s.w / 2, -p.s.h / 2, p.s.w, p.s.h);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.remove();
  }
}
