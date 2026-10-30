"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, DrawSVGPlugin, SplitText, ScrollTrigger, Observer);
  // dev only: inspect / fast-forward animations from the browser console
  if (process.env.NODE_ENV !== "production") Object.assign(window, { gsap, ScrollTrigger });
}

export { gsap, useGSAP, DrawSVGPlugin, SplitText, ScrollTrigger, Observer };
