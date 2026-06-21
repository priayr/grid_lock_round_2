// Client API helpers — always hit the real backend through the Next.js gateway
// routes (/api/*), which proxy to the FastAPI server (ML_API_URL).
import type {
  ApiKeyList,
  CreatedApiKey,
  ForecastRequest,
  ForecastResponse,
  LiveFeedResponse,
  QuarantineResponse,
  RiskMapResponse,
} from "./types";

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export function getLiveFeed(since?: string, window = 120): Promise<LiveFeedResponse> {
  const qs = new URLSearchParams();
  if (since) qs.set("since", since);
  qs.set("window", String(window));
  return getJSON<LiveFeedResponse>(`/api/live-feed?${qs.toString()}`);
}

export function getRiskMap(datetime?: string): Promise<RiskMapResponse> {
  const qs = new URLSearchParams();
  if (datetime) qs.set("datetime", datetime);
  return getJSON<RiskMapResponse>(`/api/risk-map?${qs.toString()}`);
}

export function getFleetQuarantines(opts?: {
  since?: string;
  window?: number;
  activeOnly?: boolean;
  apiKey?: string;
}): Promise<QuarantineResponse> {
  const qs = new URLSearchParams();
  if (opts?.since) qs.set("since", opts.since);
  qs.set("window", String(opts?.window ?? 240));
  qs.set("active_only", String(opts?.activeOnly ?? true));
  const headers: Record<string, string> = {};
  if (opts?.apiKey) headers["X-API-Key"] = opts.apiKey;
  return getJSON<QuarantineResponse>(`/api/fleet/quarantines?${qs.toString()}`, { headers });
}

export function getFleetKeys(): Promise<ApiKeyList> {
  return getJSON<ApiKeyList>(`/api/fleet/keys`);
}

export function createFleetKey(name: string, fleet: string): Promise<CreatedApiKey> {
  return getJSON<CreatedApiKey>(`/api/fleet/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, fleet }),
  });
}

export async function postForecast(body: ForecastRequest): Promise<ForecastResponse> {
  const res = await fetch(`/api/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`/api/forecast -> ${res.status}`);
  return res.json();
}

export function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function fmtHour(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
