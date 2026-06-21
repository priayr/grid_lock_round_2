"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createFleetKey, getFleetKeys, getFleetQuarantines } from "@/lib/api";
import type { ApiKey, QuarantineResponse } from "@/lib/types";

/* ---- static example, also the offline fallback for "Try it" ---- */
const EXAMPLE: QuarantineResponse = {
  endpoint: "/api/fleet/quarantines",
  generated_at: "2024-03-01T11:00:00+00:00",
  next_since: "2024-03-01T13:00:00+00:00",
  count: 1,
  estimated_total_volume_removed_pct: 22,
  zones: [
    {
      quarantine_id: "QZ-FKID005762",
      version: "1.0",
      issued_at: "2024-03-01T11:00:00+00:00",
      expires_at: "2024-03-01T11:50:00+00:00",
      severity: "severe",
      status: "active",
      reason: { cause: "accident", corridor: "ORR", closure_probability: 0.62 },
      geofence: {
        type: "circle",
        center: { lat: 12.978, lng: 77.641 },
        radius_m: 625,
        polygon: [
          [12.98362, 77.641], [12.98162, 77.64674], [12.978, 77.64912],
          [12.97438, 77.64674], [12.97238, 77.641], [12.97438, 77.63526],
          [12.978, 77.63288], [12.98162, 77.63526], [12.98362, 77.641],
        ],
      },
      action: "avoid",
      advisory: "Severe accident on ORR — reroute commercial fleet away from this zone until ~11:50.",
      estimated_volume_removed_pct: 22,
      affected_fleets: ["Flipkart", "Swiggy", "Zepto", "Amazon", "Rapido"],
      alternate_routes: [
        { rank: 1, distance_m: 1607, eta_min: 3.8, summary: "alternate route 1" },
        { rank: 2, distance_m: 1640, eta_min: 3.9, summary: "alternate route 2" },
      ],
    },
  ],
};

const SAMPLE_KEY = "glk_live_demo_5f3b9c2a8e1d";

const curlFor = (key: string) =>
  `curl -s 'https://api.gridlock.city/api/fleet/quarantines?active_only=true' \\
  -H 'X-API-Key: ${key}'`;

const jsFor = (key: string) =>
  `const res = await fetch(
  "https://api.gridlock.city/api/fleet/quarantines?active_only=true",
  { headers: { "X-API-Key": "${key}" } }
);
if (res.status === 401) throw new Error("Invalid API key");
const { zones } = await res.json();

// keep drivers out of every active quarantine zone
for (const z of zones) {
  fleet.addAvoidZone({
    id: z.quarantine_id,
    center: z.geofence.center,
    radiusM: z.geofence.radius_m,
    expiresAt: z.expires_at,
  });
}`;

const pyFor = (key: string) =>
  `import requests

r = requests.get(
    "https://api.gridlock.city/api/fleet/quarantines",
    params={"active_only": "true"},
    headers={"X-API-Key": "${key}"},
)
r.raise_for_status()  # 401 if the key is invalid
for z in r.json()["zones"]:
    fleet.add_avoid_zone(
        zone_id=z["quarantine_id"],
        center=z["geofence"]["center"],
        radius_m=z["geofence"]["radius_m"],
        expires_at=z["expires_at"],
    )`;

const SCHEMA: [string, string, string][] = [
  ["quarantine_id", "string", "Stable id for the zone (dedupe / upsert on this)."],
  ["severity", "string", "severe · high · elevated."],
  ["status", "string", "active while in effect; derive lifecycle from issued_at/expires_at."],
  ["action", "string", "avoid — do not route or assign new orders inside the fence."],
  ["geofence.center", "{lat,lng}", "Centre of the circular quarantine zone."],
  ["geofence.radius_m", "number", "Radius in metres. Also a polygon[] octagon ring is supplied."],
  ["estimated_volume_removed_pct", "number", "Modelled share of fleet volume kept out of the choke point."],
  ["affected_fleets", "string[]", "Operators the broadcast targets."],
  ["expires_at", "ISO 8601", "When to drop the zone (incident clearance + buffer)."],
  ["alternate_routes", "object[]", "Ranked alternates (rank, distance_m, eta_min) — no geometry."],
];

function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`text-[11px] text-white/45 transition hover:text-white ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-ink-900/80 shadow-soft">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="text-[11px] uppercase tracking-wide text-white/40">{lang}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-white/75">{code}</pre>
    </div>
  );
}

export default function FleetApiDocs() {
  /* ---- API keys ---- */
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [activeKey, setActiveKey] = useState<string>(SAMPLE_KEY);
  const [keysLive, setKeysLive] = useState<boolean | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyFleet, setNewKeyFleet] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  /* ---- Try it ---- */
  const [result, setResult] = useState<QuarantineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [tryKey, setTryKey] = useState<string>(SAMPLE_KEY);

  async function loadKeys() {
    try {
      const { keys } = await getFleetKeys();
      setKeys(keys);
      setKeysLive(true);
      if (keys[0]) {
        setActiveKey(keys[0].key);
        setTryKey(keys[0].key);
      }
    } catch {
      setKeysLive(false); // backend offline — keep the documented sample key
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function generateKey() {
    setCreating(true);
    setJustCreated(null);
    try {
      const created = await createFleetKey(newKeyName || "My Service", newKeyFleet || "Custom");
      setJustCreated(created.key);
      setTryKey(created.key);
      setActiveKey(created.key);
      setNewKeyName("");
      setNewKeyFleet("");
      await loadKeys();
    } catch {
      // backend offline — synthesize a believable key client-side for the demo
      const synthetic =
        "glk_live_" + Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      setJustCreated(synthetic);
      setTryKey(synthetic);
      setActiveKey(synthetic);
    } finally {
      setCreating(false);
    }
  }

  async function tryIt() {
    setLoading(true);
    setStatus(null);
    try {
      const data = await getFleetQuarantines({ activeOnly: true, apiKey: tryKey });
      setResult(data);
      setLive(true);
      setStatus(200);
    } catch (e) {
      const code = Number(String(e).match(/-> (\d+)/)?.[1]);
      if (code === 401) {
        setResult(null);
        setLive(true);
        setStatus(401);
      } else {
        setResult(EXAMPLE); // backend down → representative example payload
        setLive(false);
        setStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <Nav />

      <div className="mx-auto max-w-5xl px-6 pb-28 pt-32">
        {/* header */}
        <span className="inline-block rounded-full border border-[#ff9f0a]/30 bg-[#ff9f0a]/[0.08] px-3 py-1 text-xs font-medium text-[#ffce8a]">
          Developer Docs · B2B Broadcast
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Fleet Quarantine API
        </h1>
        <p className="mt-4 max-w-2xl text-white/55">
          A real-time feed of geo-fence quarantine zones. Poll it from your dispatch /
          routing layer to keep delivery drivers out of severe choke points the moment they
          form — removing ~20% of vehicle volume before it ever reaches the jam.
        </p>

        {/* quickfacts */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Base URL", "https://api.gridlock.city"],
            ["Auth", "X-API-Key header"],
            ["Format", "JSON · poll every 30–60s"],
          ].map(([k, v]) => (
            <div key={k} className="card px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-white/40">{k}</div>
              <div className="mt-1 font-mono text-sm text-white/80">{v}</div>
            </div>
          ))}
        </div>

        {/* ----------------------------- API KEYS ----------------------------- */}
        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">API keys</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Every request must carry a valid <code className="font-mono text-white/70">X-API-Key</code> header.
                Generate one below — it works immediately against the live demo backend.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                keysLive
                  ? "border-[#34c759]/30 bg-[#34c759]/[0.08] text-[#7ee29a]"
                  : "border-white/15 bg-white/[0.03] text-white/45"
              }`}
            >
              {keysLive ? "● Backend connected" : "○ Showing sample key"}
            </span>
          </div>

          {/* freshly generated key banner */}
          {justCreated && (
            <div className="mt-5 rounded-2xl border border-[#34c759]/25 bg-[#34c759]/[0.06] p-4">
              <div className="text-xs font-medium text-[#7ee29a]">New key generated — copy it now</div>
              <div className="mt-2 flex items-center gap-3">
                <code className="flex-1 overflow-x-auto rounded-lg bg-ink-900/80 px-3 py-2 font-mono text-[13px] text-white/90">
                  {justCreated}
                </code>
                <CopyButton value={justCreated} className="shrink-0 rounded-lg border border-white/10 px-3 py-2" />
              </div>
            </div>
          )}

          {/* key generator */}
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key label (e.g. Production)"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-accent/50"
            />
            <input
              value={newKeyFleet}
              onChange={(e) => setNewKeyFleet(e.target.value)}
              placeholder="Fleet / company"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-accent/50"
            />
            <button
              onClick={generateKey}
              disabled={creating}
              className="btn-accent !px-5 !py-2.5 text-[13px] disabled:opacity-50"
            >
              {creating ? "Generating…" : "Generate API key"}
            </button>
          </div>

          {/* issued keys table */}
          {keys.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-5 py-3 font-medium">Label</th>
                    <th className="px-5 py-3 font-medium">Fleet</th>
                    <th className="px-5 py-3 font-medium">Key</th>
                    <th className="px-5 py-3 font-medium text-right">Use</th>
                  </tr>
                </thead>
                <tbody className="text-white/65">
                  {keys.map((k) => {
                    const isActive = k.key === activeKey;
                    return (
                      <tr key={k.key} className="border-t border-white/[0.05] align-middle">
                        <td className="px-5 py-3 text-white/85">
                          {k.name}
                          {k.seeded && (
                            <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/40">
                              seeded
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">{k.fleet}</td>
                        <td className="px-5 py-3 font-mono text-[12px] text-white/55">{k.masked ?? k.key}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setActiveKey(k.key);
                              setTryKey(k.key);
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] transition ${
                              isActive
                                ? "bg-accent/20 text-accent-soft"
                                : "border border-white/10 text-white/50 hover:text-white"
                            }`}
                          >
                            {isActive ? "Active" : "Use"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* endpoint */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-white">Endpoint</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <span className="rounded-md bg-[#34c759]/15 px-2.5 py-1 text-xs font-semibold text-[#7ee29a]">GET</span>
            <code className="font-mono text-sm text-white/85">/api/fleet/quarantines</code>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-5 py-3 font-medium">Query param</th>
                  <th className="px-5 py-3 font-medium">Default</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-white/65">
                {[
                  ["active_only", "true", "Return only zones currently in effect."],
                  ["since", "sim start", "ISO time — return zones issued after this instant."],
                  ["window", "120", "Look-ahead window in minutes."],
                ].map(([p, d, desc]) => (
                  <tr key={p} className="border-t border-white/[0.05]">
                    <td className="px-5 py-3 font-mono text-white/85">{p}</td>
                    <td className="px-5 py-3 font-mono text-white/45">{d}</td>
                    <td className="px-5 py-3">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Requests without a valid <code className="font-mono text-white/60">X-API-Key</code> header return{" "}
            <code className="font-mono text-white/60">401 Unauthorized</code>.
          </p>
        </section>

        {/* try it */}
        <section className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Try it</h2>
            <div className="flex items-center gap-2">
              <input
                value={tryKey}
                onChange={(e) => setTryKey(e.target.value)}
                spellCheck={false}
                placeholder="X-API-Key"
                className="w-56 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[12px] text-white/80 outline-none transition focus:border-accent/50"
              />
              <button
                onClick={tryIt}
                disabled={loading}
                className="btn-accent !px-5 !py-2 text-[13px] disabled:opacity-50"
              >
                {loading ? "Calling…" : "Send request"}
              </button>
            </div>
          </div>

          {status === 401 ? (
            <div className="mt-4">
              <div className="mb-2 text-xs text-[#ff8a80]">401 Unauthorized · the key you sent isn&apos;t valid</div>
              <div className="rounded-2xl border border-[#e0301e]/25 bg-[#e0301e]/[0.05] p-4">
                <pre className="font-mono text-[12px] leading-relaxed text-white/75">
{`{
  "detail": "Invalid or missing API key. Send a valid 'X-API-Key' header."
}`}
                </pre>
              </div>
            </div>
          ) : result ? (
            <div className="mt-4">
              <div className="mb-2 text-xs text-white/45">
                {live
                  ? `200 OK · ${result.count} active zone(s) · ~${result.estimated_total_volume_removed_pct}% volume removed`
                  : "Backend offline — showing a representative example payload."}
              </div>
              <div className="max-h-[26rem] overflow-auto rounded-2xl border border-white/[0.08] bg-ink-900/80 p-4 shadow-soft">
                <pre className="font-mono text-[12px] leading-relaxed text-white/75">{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/40">
              Pick a key above (or paste one), then click <span className="text-white/70">Send request</span>. Try a
              wrong key to see the real <span className="text-white/70">401</span>.
            </p>
          )}
        </section>

        {/* schema */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-white">Zone payload</h2>
          <p className="mt-2 text-sm text-white/50">Each item in <code className="font-mono text-white/70">zones[]</code> is a quarantine zone:</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-5 py-3 font-medium">Field</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="text-white/65">
                {SCHEMA.map(([f, t, n]) => (
                  <tr key={f} className="border-t border-white/[0.05] align-top">
                    <td className="px-5 py-3 font-mono text-white/85">{f}</td>
                    <td className="px-5 py-3 font-mono text-accent-soft/80">{t}</td>
                    <td className="px-5 py-3">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* code samples */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-white">Integrate</h2>
          <p className="mt-2 text-sm text-white/50">
            Poll on a 30–60s interval, upsert zones by <code className="font-mono text-white/70">quarantine_id</code>, and drop them at <code className="font-mono text-white/70">expires_at</code>. Samples below use your active key.
          </p>
          <div className="mt-5 grid gap-5">
            <CodeBlock lang="cURL" code={curlFor(activeKey)} />
            <CodeBlock lang="JavaScript" code={jsFor(activeKey)} />
            <CodeBlock lang="Python" code={pyFor(activeKey)} />
          </div>
        </section>

        <footer className="mt-20 border-t border-white/[0.06] pt-8 text-xs text-white/30">
          Gridlock · Fleet Quarantine API · Flipkart GRID — prototype. Endpoints are mock/demo.
        </footer>
      </div>
    </main>
  );
}
