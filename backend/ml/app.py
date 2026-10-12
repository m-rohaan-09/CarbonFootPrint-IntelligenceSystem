"""
CFIS Module 3 — Python ML Service
Flask server exposing AI endpoints for forecasting, anomaly detection,
hotspot analysis, and smart recommendations.

Runs on port 5001, called by the Node.js backend.
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directories to path
sys.path.insert(0, os.path.dirname(__file__))

from forecaster import EmissionForecaster
from anomaly_detector import AnomalyDetector
from recommender import Recommender

app = Flask(__name__)
CORS(app)

# ─── Initialize ML components with datasets ───────────
DATASETS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "datasets")
DATASETS_DIR = os.path.abspath(DATASETS_DIR)

print(f"\n{'='*50}")
print("  CFIS ML Service — Initializing...")
print(f"  Datasets directory: {DATASETS_DIR}")
print(f"{'='*50}\n")

forecaster = EmissionForecaster(DATASETS_DIR)
detector = AnomalyDetector(DATASETS_DIR)
recommender = Recommender(DATASETS_DIR)

print(f"\n{'='*50}")
print("  All ML models loaded and ready!")
print(f"{'='*50}\n")


# ─── HEALTH CHECK ─────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "cfis-ml",
        "models": {
            "forecaster": forecaster.reference_data is not None,
            "anomaly_detector": detector.global_model is not None,
            "recommender": recommender.emission_factors is not None,
        },
    })


# ─── FORECAST ENDPOINT ────────────────────────────────

@app.route("/forecast", methods=["POST"])
def forecast():
    """
    Expects JSON body:
    {
        "monthly_data": [{"month": "2024-01", "co2": 1234.5}, ...],
        "forecast_months": 6
    }
    """
    try:
        data = request.get_json()
        if not data or "monthly_data" not in data:
            return jsonify({"error": "monthly_data is required"}), 400

        monthly_data = data["monthly_data"]
        forecast_months = data.get("forecast_months", 6)

        result = forecaster.forecast(monthly_data, forecast_months)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result)

    except Exception as e:
        print(f"[Forecast Error] {e}")
        return jsonify({"error": str(e)}), 500


# ─── ANOMALY DETECTION ENDPOINT ───────────────────────

@app.route("/anomalies", methods=["POST"])
def anomalies():
    """
    Expects JSON body:
    {
        "records": [
            {"id": 1, "month": "2024-01", "category": "electricity",
             "scope": "scope_2", "co2": 1234.5, "quantity": 100, ...},
            ...
        ],
        "threshold": 2.0
    }
    """
    try:
        data = request.get_json()
        if not data or "records" not in data:
            return jsonify({"error": "records is required"}), 400

        records = data["records"]
        threshold = data.get("threshold", 2.0)

        result = detector.detect(records, threshold)
        return jsonify(result)

    except Exception as e:
        print(f"[Anomaly Error] {e}")
        return jsonify({"error": str(e)}), 500


# ─── HOTSPOT DETECTION ENDPOINT ───────────────────────

@app.route("/hotspots", methods=["POST"])
def hotspots():
    """
    Expects JSON body:
    {
        "emission_data": [
            {"category": "electricity", "scope": "scope_2",
             "co2Equivalent": 1234.5, "departmentName": "IT", ...},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        if not data or "emission_data" not in data:
            return jsonify({"error": "emission_data is required"}), 400

        result = recommender.detect_hotspots(data["emission_data"])

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result)

    except Exception as e:
        print(f"[Hotspot Error] {e}")
        return jsonify({"error": str(e)}), 500


# ─── FULL INSIGHTS ENDPOINT ───────────────────────────

@app.route("/insights", methods=["POST"])
def insights():
    """
    Expects JSON body:
    {
        "emission_data": [...],
        "forecast": {...} or null,
        "anomalies": {...} or null,
        "hotspots": {...} or null
    }
    """
    try:
        data = request.get_json()
        if not data or "emission_data" not in data:
            return jsonify({"error": "emission_data is required"}), 400

        emission_data = data["emission_data"]
        forecast_data = data.get("forecast")
        anomaly_data = data.get("anomalies")
        hotspot_data = data.get("hotspots")

        recommendations = recommender.generate_recommendations(
            emission_data, forecast_data, anomaly_data, hotspot_data
        )
        insight_texts = recommender.generate_insights(
            emission_data, forecast_data, anomaly_data, hotspot_data
        )

        return jsonify({
            "recommendations": recommendations,
            "insights": insight_texts,
        })

    except Exception as e:
        print(f"[Insights Error] {e}")
        return jsonify({"error": str(e)}), 500


# ─── RUN ──────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"\n  CFIS ML Service running on port {port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
