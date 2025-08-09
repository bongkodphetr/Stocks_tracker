import { NextRequest } from "next/server";

export const runtime = "edge";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
  typeDisp?: string;
  exch?: string;
  isYahooFinance?: boolean;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`; // public endpoint
  try {
    const upstream = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!upstream.ok) throw new Error(String(upstream.status));
    const json = await upstream.json();
    const quotes: YahooQuote[] = json?.quotes || [];
    // Prefer equities, US exchanges
    let results = quotes
      .filter(q => (q.quoteType || q.typeDisp || "").toLowerCase().includes("equity"))
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exch || "",
      }));

    // Enrich with website for better logo fallback using backend API if available
    const apiBase = (process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
    if (apiBase) {
      const top = results.slice(0, 7);
      await Promise.all(
        top.map(async (r, i) => {
          try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 1200);
            const resp = await fetch(`${apiBase}/stock/${encodeURIComponent(r.symbol || "")}`, {
              cache: "no-store",
              signal: controller.signal,
            });
            clearTimeout(t);
            if (resp.ok) {
              const d = await resp.json();
              if (d?.website) {
                (top[i] as any).website = d.website;
              }
            }
          } catch {}
        })
      );
      results = [...top, ...results.slice(7)];
    }
    return new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }
}


