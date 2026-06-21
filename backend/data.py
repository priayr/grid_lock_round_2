"""Load + clean the Astram incident CSV once, share across the app."""
import functools
import numpy as np
import pandas as pd

from config import DATA_CSV, LAT_RANGE, LNG_RANGE


@functools.lru_cache(maxsize=1)
def load_clean() -> pd.DataFrame:
    """Read the raw CSV, parse dates, filter to valid Bengaluru coords,
    derive time features + a clearance-duration proxy. Cached after first call."""
    df = pd.read_csv(DATA_CSV, low_memory=False)

    # --- datetimes ---
    df["start"] = pd.to_datetime(df["start_datetime"], errors="coerce", utc=True)
    df["modified"] = pd.to_datetime(df["modified_datetime"], errors="coerce", utc=True)
    df["resolved"] = pd.to_datetime(df["resolved_datetime"], errors="coerce", utc=True)

    # --- valid coords only ---
    lat_ok = df["latitude"].between(*LAT_RANGE)
    lng_ok = df["longitude"].between(*LNG_RANGE)
    df = df[lat_ok & lng_ok & df["start"].notna()].copy()

    # --- time features ---
    df["hour"] = df["start"].dt.hour
    df["dow"] = df["start"].dt.dayofweek          # Mon=0
    df["is_weekend"] = (df["dow"] >= 5).astype(int)
    df["month"] = df["start"].dt.month

    # --- normalize categoricals ---
    df["event_cause"] = df["event_cause"].fillna("others").str.strip().str.lower()
    df["corridor"] = df["corridor"].fillna("Non-corridor").str.strip()
    df["priority"] = df["priority"].fillna("Low").str.strip()
    df["requires_road_closure"] = (
        df["requires_road_closure"].astype(str).str.upper().eq("TRUE").astype(int)
    )

    # --- clearance proxy (minutes): prefer resolved, else modified ---
    end = df["resolved"].fillna(df["modified"])
    dur = (end - df["start"]).dt.total_seconds() / 60.0
    df["clearance_min"] = dur.where((dur > 1) & (dur < 24 * 60))  # NaN if implausible

    return df.reset_index(drop=True)


def unplanned(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["event_type"] == "unplanned"].copy()


def top_corridors(df: pd.DataFrame, n: int = 12) -> list[str]:
    cc = df[df["corridor"] != "Non-corridor"]["corridor"].value_counts()
    return cc.head(n).index.tolist()


def corridor_centroids(df: pd.DataFrame, corridors: list[str]) -> dict:
    """Mean lat/lng per corridor — used as the zone marker location."""
    out = {}
    for c in corridors:
        sub = df[df["corridor"] == c]
        out[c] = {"lat": round(float(sub["latitude"].mean()), 5),
                  "lng": round(float(sub["longitude"].mean()), 5)}
    return out
