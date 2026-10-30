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
    audioFade: 2.5,
    /** safety nets: open the invitation anyway if the video hasn't started
     *  this long after the tap, or freezes for this long */
    startTimeout: 7,
    stallTimeout: 4,
    /** the new wax seal over the video: glows with the video at ~1 s, then
     *  vanishes into the video's burst of light at ~3 s (video seconds) */
    seal: { glowAt: 0.85, burstAt: 2.88 },
  },

  // Scene 3 — invitation reveal (0 = the moment it starts over the video)
  reveal: {
    // slower paper fade: it now starts while the envelope is still opening,
    // so the video's burst of light stays visible through the paper
    paper: { at: 0, fadeIn: 2.4, whiteFade: 1.2, scaleDur: 2.8, scaleFrom: 1.05 },
    drapes: { at: 0.6, dur: 1.4 },
    vines: { at: 1.2, dur: 1.9, leafStagger: 0.07, leafDur: 0.45 },
    seal: { at: 1.6, drop: 0.55, press: 0.35, ringDur: 1.2, sheenDelay: 0.25, sheenDur: 0.9 },
    /** each flower unfurls from its centre while turning open */
    flowers: { at: 2.0, dur: 1.15, stagger: 0.11, turn: 70, leafDur: 0.8 },
    buds: { at: 2.5, dur: 1.0, stagger: 0.15 },
    together: { at: 2.8, dur: 1.1 },
    divider1: { at: 3.1, dur: 0.9 },
    bride: { at: 3.4, write: 1.6 },
    /** gold swash under each name; starts when the pen is this far through the name */
    flourish: { afterWrite: 0.75, dur: 0.9, stagger: 0.035 },
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

  /**
   * Flower blast + velvet retreat on scroll.
   * A flower blasts when its centre scrolls up into the top `zone` of the
   * screen; it blooms again once it is back below zone + hysteresis (or you
   * are back at the top). The velvet part is scroll-linked (scrubbed).
   */
  scrollBurst: {
    /** blast when a corner flower reaches the top 30% of the screen */
    zone: 0.3,
    /** …and bloom again only once it is this much lower (avoids flicker) */
    hysteresis: 0.08,
    /** flowers that start inside the zone wait for this much scrolling */
    minScroll: 0.02,
    /** back at the very top → everything blooms again */
    backAtTop: 0.01,
    /** gap between flowers that blast together, and the swell before a blast */
    stagger: 0.07,
    swell: 0.12,
    /** velvet: scroll distance (share of screen height) and smoothing */
    distance: 0.85,
    scrub: 0.6,
    /** velvet: slide right by this share of its width, down by this (u), and turn */
    drapeAwayX: 0.7,
    drapeAwayY: 120,
    drapeTurn: 10,
  },

  // Velvet corners: they never move; the pattern flows inside them
  velvet: {
    /** size of one repeat of the velvet pattern (u ≈ px on a 390-wide phone) */
    tileU: 210,
    /** seconds for the pattern to travel one full repeat (bigger = slower) */
    flowSeconds: 66,
    /** a soft sheen glides across the fabric once per this many seconds */
    sheenSeconds: 7,
  },

  /** One page per swipe (see src/lib/usePager.ts). The glide starts at
   *  once at about the finger's speed and eases to rest. */
  paging: {
    /** first screen ↔ Celebrations (a full glide; less if the finger moved part way) */
    firstDur: 1.8,
    /** every other page */
    dur: 1.2,
    /** a short nudge springs back this fast */
    backDur: 0.5,
    ease: "power3.out",
    /** a drag this long (px) or a flick this fast (px/s) turns the page */
    swipe: 48,
    flick: 450,
    /** ignore wheel input this long after a glide (trackpad momentum) */
    cooldown: 0.35,
    /** px of wheel before it counts */
    tolerance: 10,
    /** where a page's content rests: share of the free space left above it
     *  (0.5 = centred; less = a little higher), and the margins kept (u) */
    bias: 0.42,
    padTop: 30,
    padBottom: 24,
  },

  /** Two doves beside the names (start once the names have been written) */
  doves: {
    /** fly-in from outside the card: seconds, and the right dove's delay */
    enter: 2.2,
    rightDelay: 0.25,
    /** seconds per wingbeat (different, so they never flap in sync) */
    beat: [0.4, 0.44] as [number, number],
    /** body lift on each downstroke, and a slow drift (px, amplitude) */
    bob: 2.5,
    driftX: 2.5,
    driftY: 2,
    driftPeriod: [
      [3.4, 3.1],
      [3.9, 3.6],
    ] as [[number, number], [number, number]],
    /** glide: wings held level every 4–7 s for 0.6–0.9 s, sinking this much */
    glideEvery: [4, 7] as [number, number],
    glideHold: [0.6, 0.9] as [number, number],
    glideSink: 3,
    /** leaving the first page: they fly up and away (s); coming back: they fly in again */
    exit: 1.3,
    /** size limits (px) and the gap kept from any text */
    minWidth: 64,
    maxWidth: 110,
    clearance: 8,
    /** how far (px) a dove may rise above the "with" line to find room beside the names */
    lift: 48,
  },

  // Scene 4
  sections: {
    cardDur: 0.9,
    bloomDur: 0.9,
    /** schedule event titles are written in like the names */
    titleWrite: 1.1,
    /** gold event icon draws itself in this long */
    iconDraw: 1.3,
    /** "Celebrations" is handwritten in when the corner flowers burst
     *  (or when the heading reaches this point of the screen, if sooner) */
    heading: { write: 1.3, lotusDraw: 1.6, start: "top 55%" },
    /** each event's date: the gold ring draws, the day rolls up like a reel */
    date: { ring: 0.9, roll: 1.25 },
    /** Mehndi: a henna cone leaves the icon and draws the mandala under the
     *  text in real time (drawSeconds = pen time for the whole design) */
    henna: { drawSeconds: 7, hop: 0.16, fly: 1.1, wobble: 0.34, opacity: 0.85, restOpacity: 0.32, spinSeconds: 140 },
    /** church: pause between champagne clinks while focused */
    cheers: { pause: 1.1 },
    /** distance between events on the vine, in vine "waves" (1 wave ≈ a quarter screen) */
    /** vine waves between events (4: room for each event's scene under it), and after the last */
    wavesPerGap: 4,
    tailWaves: 3,
    /** the Mehndi scene, in the bottom part of the Mehndi page (u = design px of a 390-wide phone) */
    scene: {
      /** from the Mehndi node down to the stage's top */
      offset: 86,
      /** the pieces come in one by one, all within this long (s), as the page arrives; reverses faster */
      assemble: 3.2,
      reverseSpeed: 1.8,
      /** it starts once the stage's top is this far up the screen */
      startAt: "96%",
      maxAmbient: 8,
      /** the flower girl's dash across the front (s), and the least time between dashes */
      girlRun: 3.6,
      girlEvery: 30,
      /** where petals leave the Kerala friend's fingers / the girl's basket (share of the piece) */
      fingers: [0.13, 0.33] as [number, number],
      basket: [0.85, 0.56] as [number, number],
    },
    /** the Haldi scene ("The Golden Swing"), same placement as the Mehndi scene */
    haldi: {
      /** the whole assembly plays in this long (s) as the Haldi page arrives; reverses faster */
      assemble: 4.2,
      reverseSpeed: 1.8,
      startAt: "96%",
      maxAmbient: 8,
      /** the swing: a pendulum about the beam (± degrees, seconds per full swing) */
      swingAmp: 2.2,
      swingPeriod: 3.2,
      /** the little boy with the pichkari: first visit after assembly, then every … while in view (s) */
      boyFirst: 2,
      boyEvery: [20, 25] as [number, number],
    },
    /** the one rose that travels down the vine to the event in focus */
    traveler: { pxPerSecond: 320, minDur: 0.7, maxDur: 1.6, roll: 0.6 },
  },

  /** background song: starts on the opening tap (the video itself is muted) */
  music: { fadeIn: 2.5, volume: 0.75 },
} as const;
