"""Live-feed simulator — replays the CSV (sorted by start time) as a stream.

The frontend polls /api/live-feed?since=<iso>. We return incidents whose
start time falls in (since, since + window]. The frontend advances `since`
each tick to walk forward through the 5 months of real data.
"""
import functools
import pandas as pd

from data import load_clean, unplanned


@functools.lru_cache(maxsize=1)
def _stream() -> pd.DataFrame:
    df = unplanned(load_clean()).sort_values("start").reset_index(drop=True)
    return df


def first_time() -> pd.Timestamp:
    return _stream()["start"].iloc[0]


def incidents_between(since: pd.Timestamp, window_minutes: int = 120, limit: int = 8):
    """Return raw incident dicts that 'arrive' in the window after `since`."""
    df = _stream()
    end = since + pd.Timedelta(minutes=window_minutes)
    mask = (df["start"] > since) & (df["start"] <= end)
    rows = df[mask].head(limit)
    out = []
    for _, r in rows.iterrows():
        out.append({
            "id": r["id"],
            "event_cause": r["event_cause"],
            "corridor": r["corridor"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "address": r.get("address", ""),
            "start": r["start"].isoformat(),
        })
    return out, end
