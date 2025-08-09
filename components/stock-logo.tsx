"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";

type StockLogoProps = {
  symbol: string;
  website?: string | null;
  size?: number;
  className?: string;
};

function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return null;
  }
}

export function StockLogo({ symbol, website, size = 48, className }: StockLogoProps) {
  const logoApiBase = "/api/logo";

  // Primary: logo.dev by symbol; Fallback: clearbit by domain
  const clearbitDomain = useMemo(() => extractDomain(website), [website]);

  const params = clearbitDomain ? `?website=${encodeURIComponent(clearbitDomain)}` : "";
  const primary = `${logoApiBase}/${encodeURIComponent(symbol)}${params}`;
  const fallback = clearbitDomain ? `https://logo.clearbit.com/${clearbitDomain}` : "";

  const [src, setSrc] = useState<string>(primary);
  const [failed, setFailed] = useState<boolean>(false);

  if (failed && !fallback) {
    return (
      <div aria-label={`${symbol} logo placeholder`} className={className} style={{ width: size, height: size }}>
        <div className="grid h-full w-full place-items-center rounded bg-muted text-xs font-semibold text-muted-foreground">
          {symbol?.[0] || "?"}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={className}
      onError={() => {
        if (fallback && src !== fallback) {
          setSrc(fallback);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}


