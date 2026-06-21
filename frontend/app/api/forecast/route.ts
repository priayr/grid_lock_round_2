import { NextRequest, NextResponse } from "next/server";

const API = process.env.ML_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const r = await fetch(`${API}/api/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return NextResponse.json(
      { error: "backend_unreachable", detail: String(e), hint: `Is FastAPI running at ${API}?` },
      { status: 502 },
    );
  }
}
