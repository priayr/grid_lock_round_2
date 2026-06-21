import { NextRequest, NextResponse } from "next/server";

const API = process.env.ML_API_URL ?? "http://localhost:8000";

function unreachable(e: unknown) {
  return NextResponse.json(
    { error: "backend_unreachable", detail: String(e), hint: `Is FastAPI running at ${API}?` },
    { status: 502 },
  );
}

// List the API keys issued for the Fleet Quarantine API (secrets masked).
export async function GET() {
  try {
    const r = await fetch(`${API}/api/fleet/keys`, { cache: "no-store" });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return unreachable(e);
  }
}

// Mint a new working API key.
export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    const r = await fetch(`${API}/api/fleet/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return unreachable(e);
  }
}
