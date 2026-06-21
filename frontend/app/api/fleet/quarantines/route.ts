import { NextRequest, NextResponse } from "next/server";

const API = process.env.ML_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const k of ["since", "window", "active_only"]) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  // forward the caller's API key to the backend so auth is enforced for real
  const apiKey = req.headers.get("x-api-key");
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;
  try {
    const r = await fetch(`${API}/api/fleet/quarantines?${qs.toString()}`, {
      cache: "no-store",
      headers,
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: "backend_unreachable", detail: String(e), hint: `Is FastAPI running at ${API}?` },
      { status: 502 },
    );
  }
}
