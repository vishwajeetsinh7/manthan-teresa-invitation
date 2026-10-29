"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

/** One HEAD request per asset, shared by every component that asks. */
const probes = new Map<string, Promise<boolean>>();
export function assetExists(src: string): Promise<boolean> {
  let p = probes.get(src);
  if (!p) {
    p = fetch(src, { method: "HEAD", cache: "force-cache" })
      .then((r) => r.ok)
      .catch(() => false);
    probes.set(src, p);
  }
  return p;
}

type Props = {
  src: string;
  alt: string;
  /** Rendered until (and unless) the real file is found. */
  fallback: ReactNode;
  sizes: string;
  fit?: "contain" | "cover";
  className?: string;
};

/**
 * Real image when the file exists in /public, otherwise the placeholder.
 * Fills its (positioned) parent.
 */
export function AssetImage({ src, alt, fallback, sizes, fit = "contain", className }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    assetExists(src).then((v) => live && setOk(v));
    return () => {
      live = false;
    };
  }, [src]);

  if (!ok) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading="eager"
      fetchPriority="high"
      draggable={false}
      className={className}
      style={{ objectFit: fit }}
      onError={() => setOk(false)}
    />
  );
}
