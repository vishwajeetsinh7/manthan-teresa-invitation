/**
 * Phone tilt → which way "down" is on the screen, for things that hang
 * (garland strands swing to follow gravity; turn the phone upside down and
 * they hang the other way).
 *
 * From the device's orientation (beta: front/back, gamma: left/right) the
 * gravity vector in the screen plane is (sin γ · cos β, sin β) — x to the
 * right, y down the screen. Its angle from "straight down" is what a
 * pendulum hanging from the screen follows; its length says how upright the
 * phone is (1 upright, 0 lying flat — then nothing should swing).
 *
 * iOS asks the guest for permission, which may only happen during a tap:
 * call requestTilt() from the opening tap. Elsewhere (Android) it just starts.
 */
type Tilt = { /** degrees from screen-down, + towards the right */ angle: number; /** 0 (flat) … 1 (upright) */ strength: number };

let state: Tilt = { angle: 0, strength: 0 };
let listening = false;
const subs = new Set<(t: Tilt) => void>();

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  const b = (e.beta * Math.PI) / 180;
  const g = (e.gamma * Math.PI) / 180;
  const sx = Math.sin(g) * Math.cos(b);
  const sy = Math.sin(b);
  let angle = (Math.atan2(sx, sy) * 180) / Math.PI;
  // if the browser itself has turned the page (landscape), measure from the page's bottom
  const screenTurn = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
  angle = ((angle - screenTurn + 540) % 360) - 180;
  state = { angle, strength: Math.min(1, Math.hypot(sx, sy)) };
  subs.forEach((f) => f(state));
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("deviceorientation", onOrientation);
}

type PermissionRequest = { requestPermission?: () => Promise<"granted" | "denied"> };

/** Start listening to the phone's tilt. Call it from a tap (iOS asks the guest there). */
export function requestTilt() {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
  const ask = (DeviceOrientationEvent as unknown as PermissionRequest).requestPermission;
  if (typeof ask === "function") {
    ask.call(DeviceOrientationEvent)
      .then((r) => r === "granted" && listen())
      .catch(() => {});
  } else listen();
}

/** Follow the tilt; returns an unsubscribe. (Starts listening where no permission is needed.) */
export function onTilt(f: (t: Tilt) => void) {
  if (typeof window !== "undefined" && !(DeviceOrientationEvent as unknown as PermissionRequest).requestPermission) listen();
  subs.add(f);
  f(state);
  return () => {
    subs.delete(f);
  };
}
