"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  /** Shown only if the file is missing. */
  fallback: ReactNode;
  /** kept for call-site readability; images are pre-sized, so unused */
  sizes?: string;
  fit?: "contain" | "cover";
  className?: string;
};

/**
 * Fills its (positioned) parent with a pre-sized WebP. Served as-is
 * (unoptimized): the files are already the right size, and skipping the
 * on-demand resizer avoids slow first loads on the live site. The same URL
 * was preloaded on the tap screen, so it comes straight from cache.
 */
export function AssetImage({ src, alt, fallback, fit = "contain", className }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      loading="eager"
      decoding="async"
      draggable={false}
      className={className}
      style={{ objectFit: fit }}
      onError={() => setFailed(true)}
    />
  );
}
