"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, DrawSVGPlugin, SplitText, ScrollTrigger);
}

export { gsap, useGSAP, DrawSVGPlugin, SplitText, ScrollTrigger };
