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
      /** the carpet spins open and lands (s) as the page arrives… */
      carpetSeconds: 2.8,
      /** …then the bride, toran, groom, props and henna come in one by one within this long (s);
       *  going back up reverses it faster */
      assemble: 6.3,
      /** then the hidden initial: he leans in, a script letter draws on her palm, a heart, his
       *  hand to his heart (s) */
      initialSeconds: 2.8,
      /** the letter hidden in her henna */
      hiddenInitial: "M",
      /** idle: his lean towards her, a heart rising between them, a glint across the letter (s between) */
      lean: [6, 9] as [number, number],
      hearts: [8, 12] as [number, number],
      glint: 10,
      /** the carpet keeps turning slowly while idle: once every carpetSpinSeconds */
      carpetIdleSpin: true as boolean,
      carpetSpinSeconds: 40,
      /** the groom's pose at the end: "a" still pointing at her palm (as he arrives), "b" hand on heart */
      groomFinal: "a" as "a" | "b",
      /** the carpet's tilt (°): a circle seen as master-v2's oval (acos 250 / 1075) */
      carpetTilt: 76.5,
      reverseSpeed: 1.8,
      /** it starts once the stage's top is this far up the screen */
      startAt: "96%",
      maxAmbient: 8,
      /** the flower girl's dash across the front (s), and the least time between dashes */
      girlRun: 3.6,
      girlEvery: 30,
      /** where petals leave the girl's basket (share of the piece) */
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
      /**
       * the swing: a tap pushes it in depth (towards / away from us), a shake swings it side to
       * side and makes everything react — damped pendulums about the beam. threshold / strong: the
       * jolt (m/s²) that counts as a shake / a strong one (puff, petals off the beam, buzz);
       * tapPush / sidePush: how fast it sets off (°/s; amplitude ≈ push / (2π / period) rad, so
       * 40 °/s ≈ 17°); period (s), damping (1/s): a few visible swings; maxAngle / sideMax (°)
       */
      swingShake: { threshold: 11, strong: 17, cooldown: 0.25, tapPush: 40, period: 2.6, damping: 0.34, maxAngle: 22, sidePush: [14, 38] as [number, number], sideMax: 16 },
    },
    /** the Hindu wedding scene ("Four Rounds of Fire"): the story plays (timed) as its page arrives */
    hindu: {
      /** seconds for each act: the mandap builds; the kund and the fire, the pandit; the couple
       *  appear, wedded; together (the knot, the diyas); the blessing */
      acts: { mandap: 1.5, ritual: 1.8, couple: 1.4, together: 2.2, blessing: 1.6 },
      /** leaving back up rewinds this much faster */
      reverseSpeed: 6,
      startAt: "96%",
      maxAmbient: 8,
      /** the pandit's ghee offering (s between) */
      offering: [5, 7] as [number, number],
      /** taps: at most this many tap petals on screen (the oldest fade early) */
      tapMax: 40,
      /** shake to shower blessings: a jolt over `threshold` m/s² on `hits` readings within
       *  `window` s, at most once per `cooldown` s */
      shake: { threshold: 15, hits: 2, window: 0.4, cooldown: 1.5 },
      /** a subtle heat shimmer over the flames (off: only if it stays smooth on iPhone) */
      heatShimmer: false as boolean,
    },
    /** the Hindu wedding on a heavenly lotus ("Swarg Kamal"): the story plays (timed) as its page arrives */
    lotus: {
      /** seconds for each act: clouds and a whirl of flowers; the stage lotus blooms; the arch
       *  assembles; the canopy floats down and blooms, its strands unroll; the kund, the fire, the
       *  pandit, the diyas; the couple; the diyas light one by one; the blessing */
      acts: { arrive: 1.3, bloom: 2.0, arch: 1.3, canopy: 1.5, setup: 1.3, couple: 1.1, diyas: 1.6, blessing: 2.2 },
      reverseSpeed: 6,
      startAt: "96%",
      maxAmbient: 8,
      /** one full turn (s): the stage lotus (clockwise from above), the canopy lotus
       *  (anticlockwise), the rangoli (anticlockwise) */
      stageSpinSeconds: 60,
      crownSpinSeconds: 45,
      rangoliSpinSeconds: 120,
      /** "3d": petals built in 3D, held still (never turning, so they never swap places), each
       *  leaning slowly in and out; "painted": the painted lotus (the low-power fallback) */
      /** the petals' slow wave: how far each leans in and out (°), one wave round the lotus (s) */
      petalSway: { amp: 6, seconds: 7 },
      lotusMode: "3d" as "3d" | "painted",
      /** the camera: perspective (× the stage width), its tilt onto each lotus (°), how much the
       *  phone's own tilt nudges it (°) and the clouds (px) */
      camera: { perspective: 2.6, stageTilt: 74, crownTilt: 87, tiltNudge: 3, cloudNudge: 10 },
      /** petal rings (radius, petal height, drop — how far below the floor the petals grow from —
       *  all × the lotus radius; lean: ° outward from upright; offset: × a petal step); `lite`: the
       *  counts when the phone is slow. The bowl hangs under the floor, as in the painting: the
       *  front petals rise just to its front edge, so the fire and the couple stay in view */
      stageRings: [
        { piece: "petal-lower", n: 18, lite: 12, r: 0.86, h: 0.46, drop: 0.3, lean: 100, offset: 0 },
        { piece: "petal-outer", n: 18, lite: 12, r: 1.02, h: 0.54, drop: 0.24, lean: 58, offset: 0.5 },
        { piece: "petal-inner", n: 16, lite: 10, r: 0.92, h: 0.38, drop: 0.12, lean: 32, offset: 0 },
      ],
      crownRings: [
        { piece: "crown-petal-outer", n: 14, lite: 10, r: 0.8, h: 0.42, drop: 0, lean: 35, offset: 0.5 },
        { piece: "crown-petal-inner", n: 10, lite: 7, r: 0.46, h: 0.32, drop: 0, lean: 12, offset: 0 },
      ],
      /** which outer petals carry the four diyas */
      diyaPetals: [0, 5, 9, 14],
      /** the pandit's ghee offering (s between) */
      offering: [5, 7] as [number, number],
      /** taps: at most this many tap petals on screen */
      tapMax: 40,
      /** shake to shower blessings (as in the first Hindu wedding) */
      shake: { threshold: 15, hits: 2, window: 0.4, cooldown: 1.5 },
      /** below this many frames a second (for 2 s) it sheds petals, then falls back to the painted lotus */
      minFps: 40,
    },
    /** the church wedding scene ("The Aisle"): the story plays (timed) as its page arrives */
    church: {
      /** seconds for each act: the church appears; pews and guests, candles; the runner and the
       *  priest (the groom comes to wait); the flower girl walks up the aisle, the bride after her
       *  (girl + bride); the beam of light, they turn to each other; the minnu; the rings; the
       *  bells and the walk back down the aisle; the finale */
      acts: { church: 1.6, aisle: 1.6, runner: 1.2, girl: 2.0, bride: 1.8, couple: 1.2, minnu: 1.3, rings: 1.4, recessional: 3.0, finale: 1.6 },
      reverseSpeed: 6,
      startAt: "96%",
      maxAmbient: 8,
      /** the flower girl's petal tosses once it idles (s between) */
      toss: [5, 7] as [number, number],
    },
    /** the Garba / Dance Night scene ("Raas to Remix"): one stage, two looks on one beat */
    garba: {
      /** tempo (beats a minute): the garba, the drop's peak, the dance */
      bpm: { garba: 110, drop: 140, dance: 124 },
      /** garba → drop → dance → return → …, each look this many beats (off: only the toggle switches) */
      autoLoop: true as boolean,
      modeBeats: 24,
      /** the assembly as the page arrives (s); going back up rewinds it this much faster */
      assemble: 6.6,
      reverseSpeed: 6,
      startAt: "96%",
      /** the ring: bars for one turn; the gap inside a pair (°) and how far each closes to click */
      barsPerTurn: 8,
      pairGap: 34,
      clickClose: 7,
      /** at most this many drifting petals (garba) */
      maxAmbient: 8,
      /** disco reflections; confetti pieces in a burst (every 8 beats) */
      reflections: 24,
      confetti: [20, 30] as [number, number],
      /** spotlight swing (± °) */
      beamSwing: 20,
      /** shake: a jolt over `threshold` m/s² on `hits` readings within `window` s, at most once per `cooldown` s */
      shake: { threshold: 15, hits: 2, window: 0.4, cooldown: 1.5 },
      /** under this many frames a second for 2 s it sheds work: fewer reflections and confetti,
       *  then no blend modes, then a still floor */
      minFps: 40,
    },
    /** the one rose that travels down the vine to the event in focus */
    traveler: { pxPerSecond: 320, minDur: 0.7, maxDur: 1.6, roll: 0.6 },
  },

  /** background song: starts on the opening tap (the video itself is muted) */
  music: { fadeIn: 2.5, volume: 0.75 },
} as const;
