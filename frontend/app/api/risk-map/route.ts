import { NextRequest, NextResponse } from "next/server";

const API = process.env.ML_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const datetime = searchParams.get("datetime");
  const qs = new URLSearchParams();
  if (datetime) qs.set("datetime", datetime);
  try {
    const r = await fetch(`${API}/api/risk-map?${qs.toString()}`, { cache: "no-store" });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    console.error("Risk-map fetch failed:", e);
    return NextResponse.json(
      { error: "backend_unreachable", detail: String(e), hint: `Is FastAPI running at ${API}?` },
      { status: 502 },
    );
  }
}
