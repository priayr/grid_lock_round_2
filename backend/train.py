"""Train the 4 models and precompute baseline risk stats.

Run:  python train.py

Produces in backend/models/:
  model_b_priority.pkl   - severity: priority High/Low
  model_b_closure.pkl    - severity: road-closure probability
  model_d_clearance.pkl  - clearance time (minutes) regressor
  zone_stats.json        - Model A baseline risk per corridor x hour x weekend
"""
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from config import MODELS_DIR, ZONE_STATS
from data import load_clean, top_corridors, corridor_centroids

CAT = ["event_cause", "corridor"]
NUM = ["hour", "dow", "is_weekend", "month"]
FEATURES = CAT + NUM


def _pipe(model):
    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), CAT)],
        remainder="passthrough",
    )
    return Pipeline([("pre", pre), ("model", model)])


def train_model_b(df):
    """Severity classifier(s): priority (High/Low) + road-closure probability."""
    X = df[FEATURES]

    # --- priority ---
    y_prio = (df["priority"].str.lower() == "high").astype(int)
    Xtr, Xte, ytr, yte = train_test_split(X, y_prio, test_size=0.2, random_state=42)
    clf_p = _pipe(GradientBoostingClassifier(random_state=42)).fit(Xtr, ytr)
    acc = accuracy_score(yte, clf_p.predict(Xte))
    joblib.dump(clf_p, MODELS_DIR / "model_b_priority.pkl")
    print(f"[Model B] priority accuracy = {acc:.3f}")

    # --- road closure ---
    y_clo = df["requires_road_closure"].astype(int)
    Xtr, Xte, ytr, yte = train_test_split(X, y_clo, test_size=0.2, random_state=42)
    clf_c = _pipe(GradientBoostingClassifier(random_state=42)).fit(Xtr, ytr)
    try:
        auc = roc_auc_score(yte, clf_c.predict_proba(Xte)[:, 1])
        print(f"[Model B] closure AUC = {auc:.3f}")
    except ValueError:
        print("[Model B] closure AUC = n/a")
    joblib.dump(clf_c, MODELS_DIR / "model_b_closure.pkl")


def train_model_d(df):
    """Clearance-time regressor (minutes-to-resolve)."""
    sub = df[df["clearance_min"].notna()]
    print(f"[Model D] training rows with clearance = {len(sub)}")
    X = sub[FEATURES]
    y = sub["clearance_min"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    reg = _pipe(GradientBoostingRegressor(random_state=42)).fit(Xtr, ytr)
    mae = mean_absolute_error(yte, reg.predict(Xte))
    print(f"[Model D] clearance MAE = {mae:.1f} min")
    joblib.dump(reg, MODELS_DIR / "model_d_clearance.pkl")


def build_zone_stats(df):
    """Model A baseline: risk score per corridor x hour x weekend.

    Risk = normalized historical event frequency for that (corridor, hour, weekend)
    bucket, scaled 0-100. This is the proactive heatmap + time-slider source.
    """
    corridors = top_corridors(df, n=12)
    cents = corridor_centroids(df, corridors)
    sub = df[df["corridor"].isin(corridors)]

    grp = sub.groupby(["corridor", "hour", "is_weekend"]).size().rename("n").reset_index()
    # scale counts -> 0..100 (95th percentile = ~95 to avoid outlier domination)
    cap = max(1.0, np.percentile(grp["n"], 95))
    grp["risk"] = (grp["n"] / cap * 90).clip(5, 98).round().astype(int)

    table = {}  # corridor -> {"weekday":[24], "weekend":[24]}
    for c in corridors:
        wk = [10] * 24
        we = [10] * 24
        cs = grp[grp["corridor"] == c]
        for _, r in cs.iterrows():
            (we if r["is_weekend"] else wk)[int(r["hour"])] = int(r["risk"])
        table[c] = {"weekday": wk, "weekend": we}

    stats = {
        "corridors": corridors,
        "centroids": cents,
        "risk_by_hour": table,
        "n_events": int(len(df)),
    }
    ZONE_STATS.write_text(json.dumps(stats, indent=2))
    print(f"[Model A] zone_stats.json written for {len(corridors)} corridors")


def main():
    df = load_clean()
    print(f"Loaded {len(df)} clean rows "
          f"({(df.event_type=='unplanned').sum()} unplanned).")
    train_model_b(df)
    train_model_d(df)
    build_zone_stats(df)
    print("Done. Artifacts in", MODELS_DIR)


if __name__ == "__main__":
    main()
