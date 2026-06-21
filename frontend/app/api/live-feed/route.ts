import { NextRequest, NextResponse } from "next/server";

const API = process.env.ML_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const window = searchParams.get("window") ?? "120";
  const qs = new URLSearchParams({ window });
  if (since) qs.set("since", since);
  try {
    const r = await fetch(`${API}/api/live-feed?${qs.toString()}`, { cache: "no-store" });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    console.error("Live-feed fetch failed:", e);
    return NextResponse.json(
      { error: "backend_unreachable", detail: String(e), hint: `Is FastAPI running at ${API}?` },
      { status: 502 },
    );
  }
}
