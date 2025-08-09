import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest, {
  params,
}: { params: { symbol: string } }) {
  const { searchParams } = new URL(req.url);
  const symbol = params.symbol;

  // Base URL for logo.dev; can be overridden if needed
  const base = (process.env.LOGO_DEV_BASE || "https://logo.dev/api/stock").replace(/\/$/, "");
  const apiKey = process.env.LOGO_DEV_SECRET_KEY || process.env.LOGO_DEV_PUBLIC_KEY || "";

  const upstreamUrl = `${base}/${encodeURIComponent(symbol)}`;

  try {
    const res = await fetch(upstreamUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      // Do not cache since logos can update
      cache: "no-store",
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/png";
      const arrayBuffer = await res.arrayBuffer();
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          "content-type": contentType,
          // cache a bit on the CDN edge
          "cache-control": "public, max-age=3600, s-maxage=3600, immutable",
        },
      });
    }
  } catch (err) {
    // fall through to fallback
  }

  // Optional: try Clearbit by domain as a fallback when provided
  const website = searchParams.get("website");
  if (website) {
    try {
      const host = (() => {
        try { return new URL(website.startsWith("http") ? website : `https://${website}`).hostname; } catch { return ""; }
      })();
      if (host) {
        const cb = await fetch(`https://logo.clearbit.com/${host}`, { cache: "no-store" });
        if (cb.ok) {
          const contentType = cb.headers.get("content-type") || "image/png";
          const arrayBuffer = await cb.arrayBuffer();
          return new Response(arrayBuffer, {
            status: 200,
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=3600, s-maxage=3600, immutable",
            },
          });
        }
      }
    } catch {}
  }

  return new Response("Logo not found", { status: 404 });
}


