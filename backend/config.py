"""Central config + shared helpers (paths, color/risk mapping)."""
from pathlib import Path

# ---- Paths ----
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
_local_csv = BASE_DIR / "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
DATA_CSV = _local_csv if _local_csv.exists() else (PROJECT_DIR / "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv")
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

GRAPH_PKL = MODELS_DIR / "bengaluru_graph.pkl"
ZONE_STATS = MODELS_DIR / "zone_stats.json"

# ---- City focus ----
CITY = "Bengaluru, Karnataka, India"
LAT_RANGE = (12.7, 13.3)
LNG_RANGE = (77.3, 77.9)

# ---- Risk -> color mapping (shared by ALL endpoints; frontend never reinvents) ----
LEGEND = [
    {"label": "Severe",  "min": 75, "color": "#d7191c"},
    {"label": "High",    "min": 55, "color": "#fc8d59"},
    {"label": "Moderate","min": 35, "color": "#fdae61"},
    {"label": "Low",     "min": 20, "color": "#a6d96a"},
    {"label": "Minimal", "min": 0,  "color": "#1a9641"},
]


def color_for(risk: float) -> str:
    r = max(0, min(100, float(risk)))
    for item in LEGEND:                 # LEGEND is ordered high -> low
        if r >= item["min"]:
            return item["color"]
    return LEGEND[-1]["color"]


def radius_for(risk: float) -> int:
    return int(250 + max(0, min(100, float(risk))) * 5)
