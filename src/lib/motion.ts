/**
 * Phone shakes, from the motion sensors (DeviceMotionEvent): a jolt of the
 * phone (its acceleration without gravity) above a threshold is a "shake",
 * reported with its strength (m/s²). Used to push the Haldi swing.
 *
 * iOS asks the guest for permission, which may only happen during a tap:
 * call requestMotion() from the opening tap. Elsewhere it just starts.
 */
type ShakeListener = { f: (strength: number) => void; threshold: number; cooldown: number; last: number };

let listening = false;
let active = false;
const gravity = [0, 0, 0];
const subs = new Set<ShakeListener>();

function onMotion(e: DeviceMotionEvent) {
  let x: number;
  let y: number;
  let z: number;
  const a = e.acceleration;
  if (a && a.x != null && a.y != null && a.z != null) {
    [x, y, z] = [a.x, a.y, a.z];
  } else {
    // no gravity-free reading: take gravity out with a slow low-pass of the raw one
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null || g.y == null || g.z == null) return;
    const raw = [g.x, g.y, g.z];
    raw.forEach((v, i) => (gravity[i] = gravity[i] * 0.9 + v * 0.1));
    [x, y, z] = raw.map((v, i) => v - gravity[i]);
  }
  active = true;
  const m = Math.hypot(x, y, z);
  const now = performance.now();
  subs.forEach((s) => {
    if (m >= s.threshold && now - s.last >= s.cooldown * 1000) {
      s.last = now;
      s.f(m);
    }
  });
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("devicemotion", onMotion);
}

type PermissionRequest = { requestPermission?: () => Promise<"granted" | "denied"> };

/** Start listening to the phone's motion. Call it from a tap (iOS asks the guest there). */
export function requestMotion() {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
  const ask = (DeviceMotionEvent as unknown as PermissionRequest).requestPermission;
  if (typeof ask === "function") {
    ask.call(DeviceMotionEvent)
      .then((r) => r === "granted" && listen())
      .catch(() => {});
  } else listen();
}

/** Has any motion reading arrived (sensors present and allowed)? */
export const motionActive = () => active;

/** Call f(strength) on each shake stronger than `threshold` m/s², at most once per `cooldown` s. */
export function onShake(f: (strength: number) => void, threshold: number, cooldown: number) {
  if (typeof window !== "undefined" && "DeviceMotionEvent" in window && !(DeviceMotionEvent as unknown as PermissionRequest).requestPermission) listen();
  const s: ShakeListener = { f, threshold, cooldown, last: 0 };
  subs.add(s);
  return () => {
    subs.delete(s);
  };
}
