"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import { GradientText } from "@/components/gradient-text";
import { StockLogo } from "@/components/stock-logo";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

type StockResponse = {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string | null;
  last_price: number | null;
  prev_close: number | null;
  open_price: number | null;
  change_abs: number | null;
  change_pct: number | null;
  market_cap: number | null;
  day_low: number | null;
  day_high: number | null;
  year_low: number | null;
  year_high: number | null;
  volume: number | null;
  avg_volume: number | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  pre_market_price?: number | null;
  pre_market_change?: number | null;
  pre_market_change_pct?: number | null;
  post_market_price?: number | null;
  post_market_change?: number | null;
  post_market_change_pct?: number | null;
  bid?: number | null;
  bid_size?: number | null;
  ask?: number | null;
  ask_size?: number | null;
  pe?: number | null;
  pe_trailing?: number | null;
  pe_forward?: number | null;
  eps?: number | null;
  dividend_yield?: number | null;
  enterprise_value?: number | null;
  price_to_sales_ttm?: number | null;
  price_to_book?: number | null;
  peg_ratio?: number | null;
  eps_trailing?: number | null;
  eps_forward?: number | null;
  book_value?: number | null;
  enterprise_to_ebitda?: number | null;
  beta?: number | null;
  profit_margins?: number | null;
  gross_margins?: number | null;
  operating_margins?: number | null;
  return_on_equity?: number | null;
  return_on_assets?: number | null;
  revenue_ttm?: number | null;
  gross_profit_ttm?: number | null;
  ebitda?: number | null;
  revenue_growth?: number | null;
  earnings_growth?: number | null;
  operating_cashflow?: number | null;
  free_cashflow?: number | null;
  change_52w?: number | null;
  target_mean?: number | null;
  target_high?: number | null;
  target_low?: number | null;
  analyst_count?: number | null;
  recommendation?: string | number | null;
  shares_outstanding?: number | null;
  implied_shares_outstanding?: number | null;
  float_shares?: number | null;
  held_pct_insiders?: number | null;
  held_pct_institutions?: number | null;
  short_ratio?: number | null;
  ex_div_date?: number | string | Date | null;
  dividend_date?: number | string | Date | null;
  next_earnings?: number | string | Date | null;
};

function formatCurrency(value: number | null | undefined, currency?: string | null) {
  if (value == null || Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

function humanizeNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function percent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatDate(value: number | string | Date | null | undefined) {
  if (value == null) return "-";
  try {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number") {
      const seconds = value > 1e11 ? value / 1000 : value;
      return new Date(seconds * 1000).toISOString().slice(0, 10);
    }
    if (typeof value === "string") return value.slice(0, 10);
  } catch {
  }
  return "-";
}

export default function HomePage() {
  type Suggestion = { symbol: string; name: string; exchange: string; website?: string };

  const DEFAULT_SUGGESTIONS: Suggestion[] = [
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", website: "apple.com" },
    { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", website: "microsoft.com" },
    { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", exchange: "NASDAQ", website: "abc.xyz" },
    { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", website: "amazon.com" },
    { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", website: "meta.com" },
    { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", website: "nvidia.com" },
    { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", website: "tesla.com" },
  ];

  const [symbol, setSymbol] = useState("NVDA");
  const [query, setQuery] = useState("NVDA");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trendIcon = useMemo(() => {
    const up = (data?.change_abs ?? 0) >= 0;
    return up ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />;
  }, [data?.change_abs]);

  function signedChange(abs?: number | null, pct?: number | null) {
    if (abs == null || pct == null) return "";
    const sign = abs >= 0 ? "+" : "";
    return `${sign}${abs.toFixed(2)} (${sign}${(pct * 100).toFixed(2)}%)`;
  }

  async function fetchStock(sym: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as StockResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Fetch error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAndFetch(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    await fetchStock(trimmed.toUpperCase());

    if (!data && !error) {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const s = await r.json();
        const first = (s?.results || [])[0];
        if (first?.symbol) {
          await fetchStock(first.symbol);
          setQuery(first.symbol);
          setSymbol(first.symbol);
        } else {
          setError(`ไม่พบผลลัพธ์สำหรับ "${trimmed}"`);
        }
      } catch {
        setError(`ไม่พบผลลัพธ์สำหรับ "${trimmed}"`);
      }
    }
  }


  useEffect(() => {
    const input = query;
    if (!input || input.length < 2) { setSuggestions(DEFAULT_SUGGESTIONS); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(input)}`);
        const s = await r.json();
        setSuggestions(((s?.results || []) as Suggestion[]).slice(0, 7));
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    fetchStock(symbol);
  }, []);


  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      setSuggestions([]);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <main className="container py-10">
      <section className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <GradientText className="text-3xl font-extrabold tracking-tight">US Stock Tracker</GradientText>
            </CardTitle>
            <CardDescription>ค้นหาและดูรายละเอียดราคาหุ้นแบบเรียลไทม์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="ชื่อบริษัท หรือ ชื่อย่อหุ้น (เช่น Apple หรือ AAPL)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => { if (query.length < 2) setSuggestions(DEFAULT_SUGGESTIONS); }}
                  onKeyDown={(e) => e.key === "Enter" && resolveAndFetch(query)}
                />
                {suggestions.length > 0 && (
                  <div
                    className="absolute z-10 mt-1 w-full rounded-md border bg-background p-1 shadow"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.symbol}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted"
                        onClick={() => {
                          setQuery(`${s.name} (${s.symbol})`);
                          setSymbol(s.symbol);
                          setSuggestions([]);
                          fetchStock(s.symbol);
                        }}
                      >
                        <StockLogo symbol={s.symbol} website={s.website} size={20} className="rounded min-w-5" />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">  ·  {s.symbol}  ·  {s.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={() => resolveAndFetch(query)} className="gap-2">
                <Search className="h-4 w-4" /> ค้นหา
              </Button>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : error ? (
                <div className="text-red-600">{error}</div>
              ) : data ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StockLogo symbol={data.symbol} website={data.website} size={36} className="rounded" />
                      <h2 className="text-2xl font-bold">
                        {data.name} ({data.symbol})
                      </h2>
                      <p className="text-sm text-muted-foreground">{data.exchange || "-"}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-2xl font-semibold">
                        {formatCurrency(data.last_price, data.currency)} {trendIcon}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        เปิด {formatCurrency(data.open_price, data.currency)} • ปิดก่อนหน้า {formatCurrency(data.prev_close, data.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Stat label="มูลค่าตลาด" value={humanizeNumber(data.market_cap || 0)} />
                    <Stat label="ช่วงวัน" value={`${formatCurrency(data.day_low, data.currency)} - ${formatCurrency(data.day_high, data.currency)}`} />
                    <Stat label="ช่วง 52W" value={`${formatCurrency(data.year_low, data.currency)} - ${formatCurrency(data.year_high, data.currency)}`} />
                    <Stat label="ปริมาณซื้อขาย" value={humanizeNumber(data.volume || 0)} />
                    <Stat label="เฉลี่ย 3M" value={humanizeNumber(data.avg_volume || 0)} />
                    <Stat label="หมวดธุรกิจ" value={data.sector || "-"} />
                    <Stat label="อุตสาหกรรม" value={data.industry || "-"} />
                    <Stat
                      label="เว็บไซต์"
                      value={data.website ? (
                        <a className="text-primary underline" href={data.website} target="_blank" rel="noreferrer">
                          {data.website}
                        </a>
                      ) : (
                        "-"
                      )}
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Extra Prices */}
                  <Section title="ราคาเพิ่มเติม">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="ราคาเปิด" value={formatCurrency(data.open_price, data.currency)} />
                      <Stat label="ปิดก่อนหน้า" value={formatCurrency(data.prev_close, data.currency)} />
                      <Stat
                        label="ก่อนเปิด (Pre-Market)"
                        value={
                          data.pre_market_price != null
                            ? `${formatCurrency(data.pre_market_price, data.currency)} ${signedChange(
                                data.pre_market_change,
                                data.pre_market_change_pct
                              )}`
                            : "-"
                        }
                      />
                      <Stat
                        label="หลังปิด (After-Hours)"
                        value={
                          data.post_market_price != null
                            ? `${formatCurrency(data.post_market_price, data.currency)} ${signedChange(
                                data.post_market_change,
                                data.post_market_change_pct
                              )}`
                            : "-"
                        }
                      />
                      <Stat
                        label="Bid / Ask"
                        value={`${formatCurrency(data.bid ?? null, data.currency)} / ${formatCurrency(
                          data.ask ?? null,
                          data.currency
                        )}`}
                      />
                    </div>
                  </Section>
                  <Separator className="my-6" />

                  {/* Valuation */}
                  <Section title="การประเมินมูลค่า (Valuation)">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="EV" value={humanizeNumber(data.enterprise_value ?? 0)} />
                      <Stat label="P/E (Trailing)" value={num(data.pe_trailing)} />
                      <Stat label="P/E (Forward)" value={num(data.pe_forward)} />
                      <Stat label="PEG" value={num(data.peg_ratio)} />
                      <Stat label="P/S (TTM)" value={num(data.price_to_sales_ttm)} />
                      <Stat label="P/B" value={num(data.price_to_book)} />
                      <Stat label="EV/EBITDA" value={num(data.enterprise_to_ebitda)} />
                      <Stat label="EPS (TTM)" value={num(data.eps_trailing)} />
                      <Stat label="EPS (Forward)" value={num(data.eps_forward)} />
                      <Stat label="Book Value/Share" value={num(data.book_value)} />
                      <Stat label="Dividend Yield" value={percent(data.dividend_yield ?? null)} />
                    </div>
                  </Section>

                  <Separator className="my-6" />

                  {/* Performance & Margins */}
                  <Section title="ประสิทธิภาพและอัตรากำไร (Performance & Margins)">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="Beta" value={num(data.beta)} />
                      <Stat label="กำไรสุทธิ/ยอดขาย" value={percent(data.profit_margins ?? null)} />
                      <Stat label="กำไรขั้นต้น" value={percent(data.gross_margins ?? null)} />
                      <Stat label="กำไรจากการดำเนินงาน" value={percent(data.operating_margins ?? null)} />
                      <Stat label="ROE" value={percent(data.return_on_equity ?? null)} />
                      <Stat label="ROA" value={percent(data.return_on_assets ?? null)} />
                      <Stat label="รายได้ (TTM)" value={humanizeNumber(data.revenue_ttm ?? 0)} />
                      <Stat label="กำไรขั้นต้น (TTM)" value={humanizeNumber(data.gross_profit_ttm ?? 0)} />
                      <Stat label="EBITDA" value={humanizeNumber(data.ebitda ?? 0)} />
                      <Stat label="การเติบโตของรายได้" value={percent(data.revenue_growth ?? null)} />
                      <Stat label="การเติบโตของกำไร" value={percent(data.earnings_growth ?? null)} />
                      <Stat label="Operating Cash Flow" value={humanizeNumber(data.operating_cashflow ?? 0)} />
                      <Stat label="Free Cash Flow" value={humanizeNumber(data.free_cashflow ?? 0)} />
                      <Stat label="การเปลี่ยนแปลง 52W" value={percent(data.change_52w ?? null)} />
                    </div>
                  </Section>

                  <Separator className="my-6" />

                  {/* Analyst Targets */}
                  <Section title="นักวิเคราะห์ (Analyst Targets)">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="คำแนะนำ" value={String(data.recommendation ?? "-")} />
                      <Stat label="จำนวนความเห็น" value={numInt(data.analyst_count)} />
                      <Stat label="เป้าหมายเฉลี่ย" value={formatCurrency(data.target_mean ?? null, data.currency)} />
                      <Stat label="เป้าหมายสูงสุด" value={formatCurrency(data.target_high ?? null, data.currency)} />
                      <Stat label="เป้าหมายต่ำสุด" value={formatCurrency(data.target_low ?? null, data.currency)} />
                    </div>
                  </Section>

                  <Separator className="my-6" />

                  {/* Shares & Ownership */}
                  <Section title="สถิติหุ้นและโครงสร้างผู้ถือหุ้น">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="หุ้นที่ออกจำหน่าย" value={humanizeNumber(data.shares_outstanding ?? 0)} />
                      <Stat label="หุ้นที่มีนัยในตลาด" value={humanizeNumber(data.implied_shares_outstanding ?? 0)} />
                      <Stat label="หุ้นหมุนเวียน (Float)" value={humanizeNumber(data.float_shares ?? 0)} />
                      <Stat label="ผู้บริหารถือ (%)" value={percent(data.held_pct_insiders ?? null)} />
                      <Stat label="สถาบันถือ (%)" value={percent(data.held_pct_institutions ?? null)} />
                      <Stat label="อัตรา Short" value={num(data.short_ratio)} />
                    </div>
                  </Section>

                  <Separator className="my-6" />

                  {/* Calendar */}
                  <Section title="ปฏิทิน">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Stat label="วัน XD" value={formatDate(data.ex_div_date)} />
                      <Stat label="วันจ่ายปันผล" value={formatDate(data.dividend_date)} />
                      <Stat label="วันประกาศงบถัดไป" value={formatDate(data.next_earnings)} />
                    </div>
                  </Section>
                </div>
              ) : (
                <div className="text-muted-foreground">ใส่สัญลักษณ์หุ้นเพื่อเริ่มค้นหา</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function num(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return Number(value).toFixed(2);
}

function numInt(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return String(Math.round(Number(value)));
}


