# Teresa & Manthan — wedding invitation

Mobile-only cinematic invitation (Next.js 16 + GSAP). On tablet/desktop it shows a centred phone frame.

- Wording: `src/content/invitation.ts`
- Animation timing: `src/config/timing.ts`
- Asset paths: `src/config/assets.ts`
- Dev tip: scrub the reveal from the browser console with `__revealTl.pause().seek(4)`

Every missing file falls back to a built-in placeholder, so the site always runs.
Drop a file in the right path and it is picked up automatically (reload the page).

## Asset spec

All sizes are for a phone up to 430px wide at 3× pixel density.
**Transparent PNG** unless stated. No text baked into any image. `next/image` converts to WebP/AVIF automatically.

### Step 1 — Seal and the flowers around it

| File | Size (px) | Ratio | Notes |
| --- | --- | --- | --- |
| `public/assets/seal/wax-seal-tm.png` | 600 × 600 | 1:1 | Gold wax seal with "T&M" (match the video). Seal centred, filling ~94% of the canvas. Shot straight on, light from top-left. **No drop shadow** (the site adds one). |
| `public/assets/flowers/flower-1-open.png` | 512 × 512 | 1:1 | Deep burgundy rose, fully open. Face-on (top view), centred, head fills ~90%. No stem. |
| `public/assets/flowers/flower-1-bud.png` | 512 × 512 | 1:1 | Same flower as a closed bud, pointing up, centred on the same point, ~45% of canvas height. |
| `flower-2-open.png` / `flower-2-bud.png` | 512 × 512 | 1:1 | Blush pink rose / peony. Same rules as flower 1. |
| `flower-3-open.png` / `flower-3-bud.png` | 512 × 512 | 1:1 | Ivory / cream rose. |
| `flower-4-open.png` / `flower-4-bud.png` | 512 × 512 | 1:1 | Small raspberry bloom (filler flower). |
| `public/assets/leaves/leaf-1.png` … `leaf-5.png` | 300 × 800 | 3:8 | One leaf each, pointing **straight up**, stem end touching the **bottom-centre** of the canvas (that point is the pivot it fans out from). Mix of sage/olive greens; leaf 4 can be gilded gold. |

Bud and open versions must share the same canvas and centre: the site cross-fades one into the other.

### Step 2 — Velvet drapes

| File | Size (px) | Ratio | Notes |
| --- | --- | --- | --- |
| `public/assets/velvet/drape-top-left.png` | 900 × 1080 | 5:6 | Burgundy velvet gathered into the top-left corner. Fabric touches the top and left edges; its free edge curves from top-right to bottom-left (like the placeholder). Optional thin gold trim on that edge. |
| `public/assets/velvet/drape-bottom-right.png` | 900 × 1080 | 5:6 | Mirror for the bottom-right corner (fabric touches bottom and right edges). Can be the same image rotated 180°. |

### Step 3 — Paper

| File | Size (px) | Ratio | Notes |
| --- | --- | --- | --- |
| `public/assets/bg/paper.webp` | 1080 × 1920 | 9:16 | Cream paper texture (#F6EEE3), subtle grain, slightly lighter centre. No text, no ornaments. WebP, under ~250 KB. |

### Step 4 — Falling petals

| File | Size (px) | Ratio | Notes |
| --- | --- | --- | --- |
| `public/assets/petals/petal-1.png` … `petal-3.png` | 120 × 144 | 5:6 | Single loose petals: burgundy, blush, ivory. Centred, ~90% fill. |

### Step 5 — Music (optional)

| File | Format | Notes |
| --- | --- | --- |
| `public/assets/audio/music.mp3` | MP3, 128 kbps | 2–3 min instrumental that loops cleanly, under 3 MB. |

### Step 6 — QR code (desktop only)

Currently a static placeholder in `src/components/DesktopNote.tsx`. Once the live URL is known, export a QR as SVG or 400 × 400 PNG and swap it in.

### Already done

- `public/assets/video/envelope.mp4`, `envelope.webm`, `envelope-poster.webp` — made from `public/opening video.mp4` (trimmed to 8.8s, it is fully white from ~6s to ~9s).
- `public/assets/og.jpg` — WhatsApp/social preview (1200 × 630).
- Gold vines, dividers and flourishes — SVG line art in `src/components/art/LineArt.tsx`.

## Adding new raw images

Put the raw PNGs in a folder, add a line for each to `JOBS` in `scripts/prepare-assets.mjs`, then:

```bash
node scripts/prepare-assets.mjs "C:/path/to/raw images"
```

It removes edge fringe and specks, trims, centres on a square, bakes a soft shadow (flowers) and writes into `public/assets/`.

## Status

Done: seal, flowers 1–4 (open), rosebud, leaves 1–5 (frame 420 × 800, stem at bottom-centre),
petals 1–3, paper texture, velvet texture for the drapes (cut from the video).
Flowers no longer need bud images — they unfurl from the centre.

Still missing: music, real QR.
Drape PNGs are optional now (the drapes use the envelope's own velvet).
Reference image `public/assets/reference.png` was not in the repo — the layout was designed from the brief and the video.
