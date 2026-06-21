import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";

/* ---------- small inline icons (stroke = currentColor) ---------- */
function Icon({ path, className = "" }: { path: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
    >
      {path}
    </svg>
  );
}
const IconRadar = (
  <>
    <path d="M12 12 19 5" stroke="currentColor" />
    <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" />
    <path d="M12 8a4 4 0 1 0 4 4" stroke="currentColor" />
  </>
);
const IconBolt = <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" />;
const IconCalendar = (
  <>
    <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="currentColor" />
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" />
    <path d="m8 14 2.5 2.5L16 11" stroke="currentColor" />
  </>
);
const IconBroadcast = (
  <>
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" />
    <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17" stroke="currentColor" />
  </>
);
const IconRoute = (
  <>
    <circle cx="6" cy="19" r="2.4" stroke="currentColor" />
    <circle cx="18" cy="5" r="2.4" stroke="currentColor" />
    <path d="M8.4 19H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.6" stroke="currentColor" />
  </>
);
const IconGauge = (
  <>
    <path d="M4 17a8 8 0 1 1 16 0" stroke="currentColor" />
    <path d="m12 13 4-4" stroke="currentColor" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </>
);
const IconCheck = <path d="m4 12 5 5L20 6" stroke="currentColor" />;

/* ---------- data ---------- */
const engines = [
  {
    tag: "Prevent",
    title: "Risk Map",
    icon: IconRadar,
    body:
      "A historical risk surface learned from 7,700+ incidents. See where congestion builds — before it happens — and pre-position resources by the hour.",
    points: ["Hourly risk by corridor", "Pre-positioning priority list", "Learned from real history"],
  },
  {
    tag: "React",
    title: "Live Feed",
    icon: IconBolt,
    body:
      "Unplanned incidents stream in real time. Each is instantly graded for severity, clearance time, and routed around with real road-network diversions.",
    points: ["Real-time incident grading", "Clearance-time prediction", "Three ranked diversions"],
  },
  {
    tag: "Prepare",
    title: "Forecast",
    icon: IconCalendar,
    body:
      "Model the traffic impact of a planned event days ahead — peak windows, affected corridors, and an optimal deployment plan.",
    points: ["Peak-window prediction", "Officer & barricade plan", "Venue diversion routing"],
  },
];

const capabilities = [
  {
    icon: IconGauge,
    title: "Severity grading",
    body: "Gradient-boosted models score every incident for severity, road-closure probability and clearance ETA the instant it lands.",
  },
  {
    icon: IconRoute,
    title: "Road-network routing",
    body: "Dijkstra, A* and Yen's K-shortest paths over a real OSMnx graph return three diversions ranked by live ETA.",
  },
  {
    icon: IconRadar,
    title: "Predictive risk surface",
    body: "An hourly congestion-risk field across the city, learned from 7,700+ historical incidents, drives pre-positioning.",
  },
  {
    icon: IconBroadcast,
    title: "Fleet quarantine broadcast",
    body: "A geo-fence JSON payload pushes severe closures to delivery fleets, pulling ~20% of volume out of the jam at the source.",
  },
];

const stack = [
  ["Gradient Boosting", "Severity & clearance prediction"],
  ["OSMnx + NetworkX", "Road graph · Dijkstra · A* · Yen's K"],
  ["FastAPI", "Real-time inference gateway"],
  ["Mappls", "MapmyIndia spatial layer"],
];

const pipeline = [
  ["Detect", "Incident streams in with location, cause and time"],
  ["Grade", "Severity · closure probability · clearance ETA"],
  ["Spread", "Nearby junctions ranked by predicted risk"],
  ["Route", "Dijkstra · A* · Yen's K around the blockage"],
  ["Broadcast", "Geo-fence quarantine pushed to delivery fleets"],
];

const metrics = [
  ["7,700+", "incidents learned"],
  ["~20%", "fleet volume removed"],
  ["3", "ranked diversions / incident"],
  ["< 1", "API call to a full plan"],
];

const fleets = ["Flipkart", "Swiggy", "Zepto", "Amazon", "Rapido", "Dunzo", "BigBasket", "Blinkit"];

export default function Home() {
  return (
    <main className="lp-grain relative overflow-hidden">
      <Nav />

      {/* ============================ HERO ============================ */}
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <div className="grid-overlay pointer-events-none absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.10] blur-[130px]" />

        <div className="animate-fade-in mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/60 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Flipkart GRID · Theme 2 · Event-Driven Congestion
        </div>

        <h1 className="animate-fade-up max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-tightest text-white sm:text-7xl md:text-[5.25rem]">
          The city&apos;s nervous system
          <br />
          <span className="text-gradient">for traffic that hasn&apos;t happened yet.</span>
        </h1>

        <p className="animate-fade-up mt-7 max-w-xl text-pretty text-base leading-relaxed text-white/55 sm:text-lg [animation-delay:120ms]">
          The instant an incident occurs, Gridlock predicts how severe it is, how long until it
          clears, and the fastest way around it — then broadcasts a quarantine to delivery fleets so
          20% of the volume never arrives.
        </p>

        <div className="animate-fade-up mt-9 flex flex-col items-center gap-3 sm:flex-row [animation-delay:240ms]">
          <Link href="/dashboard" className="btn-accent">
            Launch the Console
          </Link>
          <Link href="/fleet-api" className="btn-ghost">
            Read the API docs
          </Link>
        </div>

        {/* product console preview */}
        <div className="animate-fade-up relative mt-16 w-full max-w-5xl [animation-delay:360ms]">
          <div className="pointer-events-none absolute -inset-x-10 -top-6 bottom-0 -z-10 rounded-[2.5rem] bg-gradient-to-b from-accent/[0.12] to-transparent blur-2xl" />
          <ConsolePreview />
        </div>

        {/* fleet trust strip */}
        <div className="animate-fade-up mt-16 w-full [animation-delay:480ms]">
          <p className="text-xs uppercase tracking-[0.2em] text-white/30">
            Built for the fleets that move the city
          </p>
          <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="marquee-track flex w-max gap-12">
              {[...fleets, ...fleets].map((f, i) => (
                <span key={i} className="text-lg font-semibold tracking-tight text-white/35">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= METRICS BAND ========================= */}
      <section className="relative mx-auto max-w-6xl px-6">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] lg:grid-cols-4">
          {metrics.map(([k, v]) => (
            <div key={v} className="bg-ink-950/40 px-6 py-8 text-center sm:text-left">
              <div className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{k}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-white/40">{v}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ========================== ENGINES ========================== */}
      <section id="engines" className="relative mx-auto max-w-6xl px-6 py-28">
        <Reveal className="mb-14 max-w-2xl">
          <p className="lp-index mb-5">01 — Three engines</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.1]">
            Prevent. React. Prepare.
          </h2>
          <p className="mt-4 text-white/50">
            A system that only reacts is half a solution. Gridlock layers a proactive risk surface
            beneath a live response engine — and an event forecaster on top.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {engines.map((e, i) => (
            <Reveal key={e.title} delay={i * 110}>
              <div className="lp-tile group h-full p-7">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/[0.10] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-accent-soft">
                    <Icon path={e.icon} />
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/55">
                    {e.tag}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">{e.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{e.body}</p>
                <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
                  {e.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[13px] text-white/60">
                      <Icon path={IconCheck} className="h-3.5 w-3.5 text-accent-soft" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ======================== CAPABILITIES ======================== */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-28">
            <p className="lp-index mb-5">02 — Capabilities</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.1]">
              Everything in one decision layer.
            </h2>
            <p className="mt-4 text-white/50">
              From raw incident to a deployable plan — grading, routing, risk and broadcast in a
              single coordinated pass.
            </p>
            <Link href="/dashboard" className="btn-ghost mt-8">
              See it live
            </Link>
          </Reveal>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-white/[0.07] sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <Reveal key={c.title} delay={i * 90}>
                <div className="group h-full bg-ink-950/40 p-7 transition-colors duration-500 hover:bg-white/[0.03]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-accent-soft transition-colors group-hover:border-accent/25">
                    <Icon path={c.icon} />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== HOW =========================== */}
      <section id="how" className="relative mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="card overflow-hidden p-10 sm:p-14">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <p className="lp-index mb-5">03 — The pipeline</p>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.4rem] sm:leading-[1.1]">
                  From a single incident to an action plan — in one call.
                </h2>
                <p className="mt-4 text-white/50">
                  Each incident is enriched the instant it arrives: severity and closure
                  probability, predicted clearance time, the junctions it will choke, three real
                  road-network diversions, and a fleet broadcast.
                </p>
              </div>
              <ol className="relative space-y-1 before:absolute before:left-[1.4rem] before:top-4 before:bottom-4 before:w-px before:bg-gradient-to-b before:from-accent/40 before:via-white/10 before:to-transparent">
                {pipeline.map(([k, v], i) => (
                  <li
                    key={k}
                    className="relative flex items-start gap-4 rounded-2xl px-4 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-ink-900 text-xs font-medium text-accent-soft">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white">{k}</div>
                      <div className="text-sm text-white/45">{v}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===================== FLEET QUARANTINE API ===================== */}
      <section id="fleet" className="relative mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="card overflow-hidden p-10 sm:p-14">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <p className="lp-index mb-5">04 — Fleet API</p>
                <span className="inline-block rounded-full border border-[#ff9f0a]/30 bg-[#ff9f0a]/[0.08] px-3 py-1 text-xs font-medium text-[#ffce8a]">
                  B2B Broadcast API
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Quarantine the choke point — before fleets drive into it.
                </h2>
                <p className="mt-4 text-white/50">
                  20–30% of city traffic is delivery fleets. The instant Gridlock detects a severe
                  closure, it broadcasts a{" "}
                  <span className="text-white/75">Geo-Fence Quarantine</span> to commercial
                  operators — so Flipkart, Swiggy, Zepto, Amazon and Rapido route their drivers away
                  automatically, pulling ~20% of volume out of the jam at the source.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/fleet-api" className="btn-accent">
                    Read the API docs
                  </Link>
                  <Link href="/dashboard" className="btn-ghost">
                    See it in the console
                  </Link>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.06]">
                  {[
                    ["~20%", "volume removed"],
                    ["5", "fleet partners"],
                    ["Geo-fence", "JSON payload"],
                  ].map(([k, v]) => (
                    <div key={v} className="bg-white/[0.02] px-4 py-5">
                      <div className="text-xl font-semibold tracking-tight text-white">{k}</div>
                      <div className="mt-1 text-[11px] text-white/45">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* payload preview */}
              <div className="rounded-2xl border border-white/[0.08] bg-ink-900/80 p-5 font-mono text-[11px] leading-relaxed shadow-soft">
                <div className="mb-3 flex items-center gap-2 text-white/40">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f0a]" />
                  GET broadcast · /api/fleet/quarantines
                  <span className="ml-auto rounded bg-[#34c759]/15 px-1.5 py-0.5 text-[10px] text-[#7ee29a]">
                    200 OK
                  </span>
                </div>
                <pre className="overflow-x-auto text-white/70">
{`{
  "quarantine_id": "QZ-FKID005762",
  "severity": "severe",
  "status": "active",
  "action": "avoid",
  "geofence": {
    "type": "circle",
    "center": { "lat": 12.978, "lng": 77.641 },
    "radius_m": 625
  },
  "estimated_volume_removed_pct": 22,
  "affected_fleets": [
    "Flipkart", "Swiggy", "Zepto", "Amazon", "Rapido"
  ],
  "expires_at": "2024-03-01T11:50:00+00:00"
}`}
                </pre>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* =========================== STACK =========================== */}
      <section id="stack" className="relative mx-auto max-w-6xl px-6 py-20">
        <Reveal className="mb-12 max-w-2xl">
          <p className="lp-index mb-5">05 — Under the hood</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built on a serious stack.
          </h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stack.map(([k, v], i) => (
            <Reveal key={k} delay={i * 80}>
              <div className="lp-tile h-full p-6">
                <div className="text-base font-medium text-white">{k}</div>
                <div className="mt-2 text-xs leading-relaxed text-white/45">{v}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="relative mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-4xl border border-white/[0.07] bg-white/[0.02] px-8 py-20 text-center">
            <div className="grid-overlay pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/[0.12] blur-[100px]" />
            <h2 className="relative mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              See the city think.
            </h2>
            <p className="relative mx-auto mt-5 max-w-md text-white/50">
              Open the live operations console and watch real Bengaluru incidents resolve in real
              time.
            </p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-accent">
                Launch Console
              </Link>
              <Link href="/fleet-api" className="btn-ghost">
                Explore the Fleet API
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* =========================== FOOTER =========================== */}
      <footer className="relative mx-auto max-w-6xl px-6 pb-12">
        <div className="lp-rule mb-12" />
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-sm font-semibold tracking-tight text-white">Gridlock</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/40">
              Event-driven congestion intelligence — predicting, preventing and routing around
              traffic before it forms.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              ["Live Console", "/dashboard"],
              ["Fleet API", "/fleet-api"],
              ["Risk Map", "/dashboard"],
              ["Forecast", "/dashboard"],
            ]}
          />
          <FooterCol
            title="Platform"
            links={[
              ["Engines", "#engines"],
              ["How it works", "#how"],
              ["Stack", "#stack"],
            ]}
          />
          <FooterCol
            title="Project"
            links={[
              ["Flipkart GRID", "#"],
              ["Theme 2", "#"],
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/30 sm:flex-row">
          <span>© {2024} Gridlock · Event-Driven Congestion Intelligence</span>
          <span>Built for Flipkart GRID · Theme 2</span>
        </div>
      </footer>
    </main>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label + href}>
            <Link href={href} className="text-sm text-white/55 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stylized, static preview of the operations console (decorative)    */
/* ------------------------------------------------------------------ */
function ConsolePreview() {
  const incidents = [
    ["Accident", "Outer Ring Road", "Severe", "#e0301e"],
    ["Waterlogging", "Silk Board", "High", "#ff9f0a"],
    ["Pot holes", "Thanisandra Rd", "High", "#ff9f0a"],
    ["Stalled truck", "Marathahalli", "Elevated", "#4f8bff"],
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-ink-900/70 shadow-glass backdrop-blur-xl">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
        <span className="ml-3 text-[11px] text-white/40">Gridlock · Live Operations Console</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#34c759]/25 bg-[#34c759]/[0.08] px-2.5 py-1 text-[10px] font-medium text-[#7ee29a]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" /> LIVE
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_1.6fr] text-left">
        {/* incident list */}
        <div className="border-r border-white/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/55">Incoming incidents</span>
            <span className="text-[10px] text-white/30">live feed</span>
          </div>
          <div className="space-y-2">
            {incidents.map(([cause, road, sev, color]) => (
              <div key={road} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-white/85">{cause}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={{ background: `${color}22`, color }}
                  >
                    {sev}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">{road}</div>
              </div>
            ))}
          </div>
        </div>

        {/* faux map — reads as a real map: blocked road + alternate route */}
        <div className="relative min-h-[21rem] overflow-hidden bg-[#0b1220]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4f8bff" />
                <stop offset="1" stopColor="#34c759" />
              </linearGradient>
              <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* map background: city land + a river + a park block for realism */}
            <rect width="400" height="320" fill="#0b1220" />
            <path d="M-20 40 C 80 70, 120 30, 220 60 S 360 30, 430 70 L 430 -20 -20 -20 Z" fill="#10203a" opacity="0.55" />
            <rect x="250" y="190" width="120" height="95" rx="10" fill="#13301f" opacity="0.5" />
            {/* river */}
            <path d="M-10 300 C 90 250, 110 210, 210 215 S 360 250, 410 235" stroke="#1c3b63" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.7" />

            {/* city block fills */}
            <g fill="#ffffff" opacity="0.03">
              <rect x="20" y="30" width="120" height="80" rx="6" />
              <rect x="160" y="30" width="120" height="80" rx="6" />
              <rect x="20" y="170" width="90" height="90" rx="6" />
            </g>

            {/* road network — casing then surface (Google-maps style) */}
            <g stroke="#0b1220" strokeWidth="11" strokeLinecap="round" fill="none">
              <path d="M0 110 H400 M0 240 H400 M150 0 V320 M300 0 V320" />
            </g>
            <g stroke="#33405c" strokeWidth="7" strokeLinecap="round" fill="none">
              <path d="M0 110 H400 M0 240 H400 M150 0 V320 M300 0 V320" />
            </g>
            {/* minor roads */}
            <g stroke="#2a3550" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8">
              <path d="M0 60 H400 M0 290 H400 M70 0 V320 M225 0 V320 M365 0 V320" />
            </g>

            {/* CONGESTED / BLOCKED corridor — red, dashed, the road that's shut */}
            <path d="M150 240 L 150 110 L 300 110" stroke="#e0301e" strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="2 9" opacity="0.95" />

            {/* DIVERSION route A → B — animated, glowing, goes around the block */}
            <path d="M150 240 L 225 240 L 225 175 L 300 175 L 300 110" stroke="url(#routeGrad)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#routeGlow)" opacity="0.55" />
            <path
              d="M150 240 L 225 240 L 225 175 L 300 175 L 300 110"
              stroke="url(#routeGrad)"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="11 9"
              className="dash-flow"
            />
          </svg>

          {/* incident risk halo + blockage marker (✕) */}
          <span className="absolute left-[37.5%] top-[34.5%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0301e]/25 blur-md" />
          <div className="absolute left-[37.5%] top-[34.5%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0b1220] bg-[#e0301e] text-[11px] font-bold text-white shadow-[0_0_14px_#e0301e]">
              ✕
            </span>
            <span className="mt-1 rounded-md bg-ink-900/90 px-1.5 py-0.5 text-[8.5px] font-medium text-[#ff9b8f] backdrop-blur">
              Road blocked
            </span>
          </div>

          {/* A pin (origin) */}
          <div className="absolute left-[37.5%] top-[75%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0b1220] bg-[#34c759] text-[9px] font-bold text-white shadow-[0_0_10px_#34c759]">
              A
            </span>
          </div>
          {/* B pin (destination) */}
          <div className="absolute left-[75%] top-[34.5%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0b1220] bg-[#4f8bff] text-[9px] font-bold text-white shadow-[0_0_10px_#4f8bff]">
              B
            </span>
          </div>

          {/* ETA pill on the diversion */}
          <div className="absolute left-[56%] top-[55%] -translate-x-1/2 rounded-full border border-white/15 bg-ink-900/90 px-2 py-0.5 text-[9px] font-semibold text-white shadow-soft backdrop-blur">
            Reroute · 6 min
          </div>

          {/* fleet quarantine chip */}
          <div className="absolute right-4 top-4 rounded-xl border border-[#ff9f0a]/30 bg-ink-900/85 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#ffce8a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f0a]" /> Fleet quarantine active
            </div>
            <div className="mt-0.5 text-[9px] text-white/45">~22% volume removed</div>
          </div>

          {/* legend — makes the map self-explanatory */}
          <div className="absolute left-4 top-4 space-y-1.5 rounded-xl border border-white/[0.08] bg-ink-900/85 px-3 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2 text-[9px] text-white/65">
              <span className="h-0.5 w-4 rounded-full bg-[#e0301e]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#e0301e 0 3px,transparent 3px 6px)" }} />
              Blocked road
            </div>
            <div className="flex items-center gap-2 text-[9px] text-white/65">
              <span className="h-0.5 w-4 rounded-full" style={{ background: "linear-gradient(90deg,#4f8bff,#34c759)" }} />
              Diversion route
            </div>
          </div>

          {/* stat chips */}
          <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-2">
            {[
              ["4", "active"],
              ["2", "high priority"],
              ["3.8m", "median reroute"],
            ].map(([k, v]) => (
              <div key={v} className="rounded-xl border border-white/[0.06] bg-ink-900/80 px-3 py-2 backdrop-blur">
                <div className="text-[13px] font-semibold text-white">{k}</div>
                <div className="text-[9px] text-white/40">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
