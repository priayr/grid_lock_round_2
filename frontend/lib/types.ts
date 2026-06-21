// Shared types matching the backend JSON contract (PROJECT_PLAN.md §7).

export interface ZoneLite {
  zone_id: string;
  risk_score: number;
  color: string;
  radius_m: number;
}

export interface ZoneFull extends ZoneLite {
  name: string;
  lat: number;
  lng: number;
}

export interface TimelineStep {
  datetime: string;
  overall_risk: number;
  zones: ZoneLite[];
}

export interface LegendItem {
  label: string;
  min: number;
  color: string;
}

export interface SignalNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
  offset_s: number;
  green_s: number;
  red_s: number;
}

export interface SignalPlan {
  strategy: string;
  progression_speed_kph: number;
  cycle_length_s: number;
  bandwidth_s: number;
  diverted_volume_vph: number;
  expected_delay_reduction_pct: number;
  corridor_length_m: number;
  signals: SignalNode[];
}

export interface Route {
  rank: number;
  algorithm: string;
  distance_m: number;
  eta_min: number;
  summary: string;
  polyline: [number, number][];
  signal_plan?: SignalPlan | null;
}

export interface Diversion {
  blocked_segment: string;
  src: { lat: number; lng: number };
  dst: { lat: number; lng: number };
  engine: string;
  routes: Route[];
}

export interface Junction {
  name: string;
  lat: number;
  lng: number;
  risk: number;
  color: string;
}

export interface CongestionSegment {
  polyline: [number, number][];
  color: string;
  weight: number;
}

export interface QuarantineAltRoute {
  rank: number;
  distance_m: number;
  eta_min: number;
  summary: string;
}

export interface Quarantine {
  quarantine_id: string;
  version: string;
  issued_at: string;
  expires_at: string;
  severity: string;
  status: string;
  reason: { cause: string; corridor: string; closure_probability: number };
  geofence: {
    type: string;
    center: { lat: number; lng: number };
    radius_m: number;
    polygon: [number, number][];
  };
  action: string;
  advisory: string;
  estimated_volume_removed_pct: number;
  affected_fleets: string[];
  alternate_routes: QuarantineAltRoute[];
}

export interface QuarantineResponse {
  endpoint: string;
  generated_at: string;
  next_since: string;
  count: number;
  estimated_total_volume_removed_pct: number;
  zones: Quarantine[];
}

export interface ApiKey {
  key: string;       // masked in list responses; full secret only on creation
  masked?: string;
  name: string;
  fleet: string;
  created_at: string;
  seeded?: boolean;
}

export interface ApiKeyList {
  keys: ApiKey[];
}

export interface CreatedApiKey extends ApiKey {
  created: boolean;
}

// ---- Fleet Quarantine (Innovation #1) ----

export interface FleetResponse {
  operator: string;
  operator_color: string;
  fleet_type: string;
  vehicles_in_zone: number;
  vehicles_rerouted: number;
  compliance_pct: number;
  status: "acknowledged" | "rerouting" | "completed";
  ack_time_sec: number;
}

export interface FleetQuarantine {
  zone_center: { lat: number; lng: number };
  zone_radius_m: number;
  severity_trigger: string;
  broadcast_payload: Record<string, unknown>;
  fleet_responses: FleetResponse[];
  estimated_impact: {
    total_commercial_vehicles: number;
    vehicles_diverted: number;
    volume_reduction_pct: number;
    cascading_prevention: string;
  };
  headline: string;
}

// ---- Adaptive Green Wave (Innovation #2) ----

export interface GreenWaveSignal {
  junction_name: string;
  lat: number;
  lng: number;
  signal_index: number;
  current_green_sec: number;
  recommended_green_sec: number;
  green_extension_sec: number;
  phase_offset_sec: number;
  cycle_time_sec: number;
}

export interface GreenWave {
  corridor_name: string;
  signals: GreenWaveSignal[];
  wave_speed_kmh: number;
  flush_duration_min: number;
  duration_min: number;
  optimal_cycle_sec: number;
  total_flow_vph: number;
  green_fraction: number;
  headline: string;
}

// ---- Pre-Positioning Dispatch (Innovation #3) ----

export interface DispatchResource {
  type: "tow_truck" | "ambulance" | "patrol";
  count: number;
  eta_if_incident_min: number;
}

export interface DispatchEntry {
  corridor: string;
  lat: number;
  lng: number;
  risk_score: number;
  resources: DispatchResource[];
}

export interface DispatchPlan {
  dispatch_plan: DispatchEntry[];
  total_resources: { tow_trucks: number; ambulances: number; patrols: number };
  pool_available: { tow_trucks: number; ambulances: number; patrols: number };
  coverage_score: number;
  avg_response_improvement_min: number;
  headline: string;
}

// ---- Incident (updated with innovations) ----

export interface Incident {
  id: string;
  cause: string;
  lat: number;
  lng: number;
  corridor: string;
  address: string;
  arrived_at: string;
  predicted_priority: "High" | "Low";
  closure_probability: number;
  predicted_clearance_min: number;
  clears_at: string;
  risk_score: number;
  color: string;
  radius_m: number;
  congestion_segments: CongestionSegment[];
  affected_junctions: Junction[];
  recommendation: {
    officers: number;
    barricades: { lat: number; lng: number }[];
    diversion: Diversion | null;
  };
  quarantine?: Quarantine;
  fleet_quarantine?: FleetQuarantine | null;
  green_wave?: GreenWave | null;
}

// ---- API Responses ----

export interface LiveFeedResponse {
  endpoint: string;
  sim_time: string;
  next_since: string;
  window_minutes: number;
  summary: {
    active_incidents: number;
    high_priority: number;
    avg_clearance_min: number;
    fleets_notified: number;
    volume_reduction_pct: number;
    headline: string;
  };
  new_incidents: Incident[];
  legend: LegendItem[];
}

export interface RiskMapResponse {
  endpoint: string;
  requested_datetime: string;
  day_of_week: string;
  summary: {
    overall_risk: number;
    highest_zone: { name: string; risk_score: number } | null;
    headline: string;
  };
  baseline_zones: ZoneFull[];
  risk_timeline: TimelineStep[];
  dispatch?: DispatchPlan;
  legend: LegendItem[];
}

export interface ForecastResponse {
  endpoint: string;
  request_echo: Record<string, unknown>;
  summary: {
    predicted_priority: "High" | "Low";
    road_closure_probability: number;
    peak_risk_score: number;
    peak_window: string;
    headline: string;
  };
  impact_zones: ZoneFull[];
  congestion_segments?: CongestionSegment[];
  timeline: TimelineStep[];
  recommendations: {
    zone_id: string;
    name: string;
    officers: number;
    barricades: { lat: number; lng: number }[];
    diversion: Diversion | null;
  }[];
  fleet_quarantine?: FleetQuarantine | null;
  green_wave?: GreenWave | null;
  legend: LegendItem[];
}

export interface ForecastRequest {
  event_cause: string;
  lat: number;
  lng: number;
  start_datetime: string;
  expected_crowd: number;
  forecast_days: number;
}

