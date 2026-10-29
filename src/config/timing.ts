/**
 * Every animation time in one place (seconds).
 * `at` = when a step starts on the Scene 3 timeline (0 = white screen).
 * Tweak freely; `speed` scales the whole reveal (1.2 = 20% faster).
 */
export const timing = {
  speed: 1,

  // Scene 1 — tap to open
  tap: {
    pulse: 1.6, // "Tap to open" breathing cycle
    shimmerEvery: 3.2, // gold sweep across the poster
  },

  // Scene 2 — envelope video
  video: {
    /**
     * The reveal starts this many seconds before the video ends, layered on
     * top of it (the video is pure white from ~6.0s), so they feel continuous.
     */
    revealBeforeEnd: 5,
    skipAppearsAfter: 1.5,
    skipFade: 0.35,
    audioFade: 2.5,
  },

  // Scene 3 — invitation reveal (0 = the moment it starts over the video)
  reveal: {
    // slower paper fade: it now starts while the envelope is still opening,
    // so the video's burst of light stays visible through the paper
    paper: { at: 0, fadeIn: 2.4, whiteFade: 1.2, scaleDur: 2.8, scaleFrom: 1.05 },
    drapes: { at: 0.6, dur: 1.4, swayDeg: 1, swayDur: 6 },
    vines: { at: 1.2, dur: 1.9, leafStagger: 0.07, leafDur: 0.45 },
    seal: { at: 1.6, drop: 0.55, press: 0.35, ringDur: 1.2, sheenDelay: 0.25, sheenDur: 0.9 },
    /** each flower unfurls from its centre while turning open */
    flowers: { at: 2.0, dur: 1.15, stagger: 0.11, turn: 70, leafDur: 0.8 },
    buds: { at: 2.5, dur: 1.0, stagger: 0.15 },
    together: { at: 2.8, dur: 1.1 },
    divider1: { at: 3.1, dur: 0.9 },
    bride: { at: 3.4, write: 1.6 },
    brideParents: { at: 4.7, dur: 0.8 },
    joiner: { at: 5.2, dur: 0.8 },
    groom: { at: 5.6, write: 1.6 },
    groomParents: { at: 6.9, dur: 0.8 },
    divider2: { at: 7.4, dur: 0.9 },
    invite: { at: 7.7, dur: 1.0 },
    tagline: { at: 8.0, write: 1.5 },
    details: { at: 9.0, dur: 1.0, stagger: 0.18 },
    scrollHint: { at: 10.2, dur: 0.8 },
    /** Reduced-motion: single simple fade. */
    reducedFade: 0.8,
  },

  // Ambient loop (after reveal)
  ambient: {
    petals: 8, // 6–10 looks right
    petalFall: [11, 17] as [number, number], // seconds to fall, min/max
    petalFlutterDeg: 55, // 3D flip range; keep under ~65 so petals never go edge-on
    dustParticles: 40,
    breatheDur: 4,
    breatheScale: 1.03,
    budSwayDeg: 3,
    /** each flower drifts in a slow circle: radius (u) and seconds per loop */
    orbitRadius: [2, 4] as [number, number],
    orbitPeriod: [7, 11] as [number, number],
    swayDeg: 7,
    /** tap a flower → twirl + gold sparks */
    twirlDur: 1.1,
    sparks: 7,
    hintTwirlAfter: 1.8,
    shimmerEvery: 8,
    shimmerDur: 1.6,
    parallaxPx: 6, // max shift for the deepest layer
  },

  // Scene 4
  sections: {
    cardDur: 0.9,
    bloomDur: 0.9,
  },

  music: { fadeIn: 2.5, volume: 0.55 },
} as const;
