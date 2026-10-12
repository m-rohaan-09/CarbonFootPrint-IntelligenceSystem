"""
CFIS Module 3 — Anomaly Detector
Uses sklearn IsolationForest (pre-trained on global dataset) +
statistical methods (Z-Score, IQR) for robust anomaly detection.
"""

import os
import numpy as np
import pandas as pd
import warnings
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from scipy import stats
import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")


class AnomalyDetector:
    """Anomaly detection using IsolationForest + Z-Score + IQR."""

    def __init__(self, datasets_dir=None):
        self.global_model = None
        self.global_scaler = None
        self.global_features = None
        self.reference_stats = None

        os.makedirs(MODELS_DIR, exist_ok=True)

        if datasets_dir:
            self._load_or_train_global_model(datasets_dir)

    def _load_or_train_global_model(self, datasets_dir):
        """Load pre-trained model or train from anomaly_detection_ready.csv."""
        model_path = os.path.join(MODELS_DIR, "isolation_forest_global.joblib")
        scaler_path = os.path.join(MODELS_DIR, "scaler_global.joblib")
        stats_path = os.path.join(MODELS_DIR, "reference_stats.joblib")

        # Try to load existing model
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                self.global_model = joblib.load(model_path)
                self.global_scaler = joblib.load(scaler_path)
                self.reference_stats = joblib.load(stats_path) if os.path.exists(stats_path) else None
                self.global_features = [
                    "co2", "co2_per_capita", "co2_per_gdp",
                    "coal_co2", "oil_co2", "gas_co2", "cement_co2",
                    "methane", "nitrous_oxide", "total_ghg",
                    "energy_per_capita",
                ]
                print("[AnomalyDetector] Loaded pre-trained global Isolation Forest model")
                return
            except Exception as e:
                print(f"[AnomalyDetector] Failed to load model: {e}")

        # Train new model
        self._train_global_model(datasets_dir, model_path, scaler_path, stats_path)

    def _train_global_model(self, datasets_dir, model_path, scaler_path, stats_path):
        """Train IsolationForest on global anomaly detection dataset."""
        try:
            csv_path = os.path.join(datasets_dir, "anomaly_detection_ready.csv")
            df = pd.read_csv(csv_path)
            print(f"[AnomalyDetector] Training on {len(df)} records from anomaly_detection_ready.csv")

            # Select numeric features for training
            self.global_features = [
                "co2", "co2_per_capita", "co2_per_gdp",
                "coal_co2", "oil_co2", "gas_co2", "cement_co2",
                "methane", "nitrous_oxide", "total_ghg",
                "energy_per_capita",
            ]

            # Drop rows with too many NaNs, fill remaining with median
            X = df[self.global_features].copy()
            X = X.dropna(thresh=len(self.global_features) // 2)
            X = X.fillna(X.median())

            # Scale features
            self.global_scaler = StandardScaler()
            X_scaled = self.global_scaler.fit_transform(X)

            # Train Isolation Forest
            self.global_model = IsolationForest(
                n_estimators=200,
                contamination=0.05,  # Expect ~5% anomalies
                max_samples="auto",
                random_state=42,
                n_jobs=-1,
            )
            self.global_model.fit(X_scaled)

            # Compute reference statistics (Pakistan-specific)
            pk = df[df["country"] == "Pakistan"]
            if len(pk) > 0:
                self.reference_stats = {
                    "pakistan_co2_mean": float(pk["co2"].mean()),
                    "pakistan_co2_std": float(pk["co2"].std()),
                    "pakistan_co2_per_capita_mean": float(pk["co2_per_capita"].mean()),
                    "global_co2_mean": float(df["co2"].mean()),
                    "global_co2_std": float(df["co2"].std()),
                    "global_co2_per_capita_mean": float(df["co2_per_capita"].mean()),
                }
            else:
                self.reference_stats = {}

            # Save trained model
            joblib.dump(self.global_model, model_path)
            joblib.dump(self.global_scaler, scaler_path)
            joblib.dump(self.reference_stats, stats_path)

            n_anomalies = (self.global_model.predict(X_scaled) == -1).sum()
            print(f"[AnomalyDetector] Model trained — {n_anomalies}/{len(X_scaled)} global anomalies detected")

        except Exception as e:
            print(f"[AnomalyDetector] Training failed: {e}")

    def detect(self, records, threshold=2.0):
        """
        Detect anomalies in company emission records using multiple methods.

        Args:
            records: list of dicts with keys: id, month, category, scope, co2, quantity, ...
            threshold: Z-score threshold for anomaly flagging

        Returns:
            dict with anomalies, by_category, statistics
        """
        if len(records) < 5:
            return {
                "anomalies": [],
                "byCategory": [],
                "statistics": {"message": "Need at least 5 records for anomaly detection"},
            }

        df = pd.DataFrame(records)
        co2_values = df["co2"].values.astype(float)

        # === Method 1: Z-Score ===
        z_scores = stats.zscore(co2_values) if np.std(co2_values) > 0 else np.zeros(len(co2_values))

        # === Method 2: IQR ===
        q1, q3 = np.percentile(co2_values, [25, 75])
        iqr = q3 - q1
        lower_fence = q1 - 1.5 * iqr
        upper_fence = q3 + 1.5 * iqr

        # === Method 3: Isolation Forest on company data ===
        company_if_labels = self._train_company_isolation_forest(df)

        # === Combine methods ===
        mean_val = float(np.mean(co2_values))
        std_val = float(np.std(co2_values))
        anomalies = []

        for i, record in enumerate(records):
            z = float(z_scores[i])
            is_z_anomaly = abs(z) > threshold
            is_iqr_anomaly = co2_values[i] < lower_fence or co2_values[i] > upper_fence
            is_if_anomaly = company_if_labels[i] == -1

            # Anomaly score: count of methods that flagged it
            anomaly_votes = int(is_z_anomaly) + int(is_iqr_anomaly) + int(is_if_anomaly)

            if anomaly_votes >= 1:  # At least one method flags it
                severity = self._compute_severity(z, co2_values[i], upper_fence, iqr, anomaly_votes)
                direction = "spike" if co2_values[i] > mean_val else "drop"
                deviation = ((co2_values[i] - mean_val) / max(mean_val, 1)) * 100

                anomalies.append({
                    **record,
                    "zScore": round(z, 2),
                    "severity": severity,
                    "direction": direction,
                    "deviation": round(deviation, 1),
                    "detectedBy": {
                        "zScore": bool(is_z_anomaly),
                        "iqr": bool(is_iqr_anomaly),
                        "isolationForest": bool(is_if_anomaly),
                    },
                    "anomalyVotes": int(anomaly_votes),
                    "explanation": self._explain(record, mean_val, z, direction, severity),
                })

        # Sort by severity
        sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        anomalies.sort(key=lambda a: (sev_order.get(a["severity"], 4), -abs(a["zScore"])))

        # Category-level anomalies
        by_category = self._detect_category_anomalies(records)

        return {
            "anomalies": anomalies,
            "byCategory": by_category,
            "statistics": {
                "mean": round(mean_val, 2),
                "stdDev": round(std_val, 2),
                "q1": round(float(q1), 2),
                "q3": round(float(q3), 2),
                "iqr": round(float(iqr), 2),
                "lowerFence": round(float(lower_fence), 2),
                "upperFence": round(float(upper_fence), 2),
                "totalRecords": len(records),
                "anomalyCount": len(anomalies),
                "anomalyRate": round(len(anomalies) / len(records) * 100, 1),
                "methodsUsed": ["z_score", "iqr", "isolation_forest"],
            },
            "referenceStats": self.reference_stats,
        }

    def _train_company_isolation_forest(self, df):
        """Train IsolationForest on company-specific data."""
        try:
            # Encode category
            le = LabelEncoder()
            cat_encoded = le.fit_transform(df["category"].fillna("unknown"))

            # Build feature matrix
            features = np.column_stack([
                df["co2"].values.astype(float),
                df["quantity"].values.astype(float) if "quantity" in df.columns else np.zeros(len(df)),
                cat_encoded,
            ])

            # Handle NaN
            features = np.nan_to_num(features, nan=0.0)

            if len(features) < 10:
                # Not enough data for IF — fallback to all normal
                return np.ones(len(features))

            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)

            model = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42,
            )
            model.fit(features_scaled)
            return model.predict(features_scaled)
        except Exception:
            return np.ones(len(df))

    def _detect_category_anomalies(self, records):
        """Detect anomalies within each emission category."""
        by_cat = {}
        for r in records:
            cat = r.get("category", "unknown")
            if cat not in by_cat:
                by_cat[cat] = []
            by_cat[cat].append(r)

        results = []
        for cat, cat_records in by_cat.items():
            if len(cat_records) < 3:
                continue

            co2_vals = np.array([r["co2"] for r in cat_records], dtype=float)
            mean_val = float(np.mean(co2_vals))
            std_val = float(np.std(co2_vals))
            if std_val == 0:
                continue

            for r in cat_records:
                z = (r["co2"] - mean_val) / std_val
                if abs(z) > 1.8:
                    results.append({
                        **r,
                        "category": cat,
                        "zScore": round(z, 2),
                        "categoryMean": round(mean_val, 2),
                        "severity": "critical" if abs(z) > 3 else "high" if abs(z) > 2.5 else "medium",
                        "direction": "spike" if r["co2"] > mean_val else "drop",
                    })

        return results

    @staticmethod
    def _compute_severity(z_score, value, upper_fence, iqr, votes):
        if votes >= 3 or abs(z_score) > 3:
            return "critical"
        if votes >= 2 or abs(z_score) > 2.5 or value > upper_fence + iqr:
            return "high"
        if abs(z_score) > 2 or value > upper_fence + 0.5 * iqr:
            return "medium"
        return "low"

    @staticmethod
    def _explain(record, mean, z_score, direction, severity):
        cat = (record.get("category") or "unknown").replace("_", " ").title()
        co2 = record.get("co2", 0)
        pct = abs(round(((co2 - mean) / max(mean, 1)) * 100))
        month = record.get("month", "this period")

        if direction == "spike":
            return (
                f"{cat} emission of {round(co2, 2)} kgCO₂e is {pct}% above average — "
                f"a {severity} severity spike (Z-Score: {round(z_score, 2)}). "
                f"Check for unusual activity or meter errors in {month}."
            )
        return (
            f"{cat} emission of {round(co2, 2)} kgCO₂e is {pct}% below average — "
            f"a {severity} severity drop (Z-Score: {round(z_score, 2)}). "
            f"Verify if operations were reduced or data is missing for {month}."
        )
