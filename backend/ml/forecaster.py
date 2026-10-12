"""
CFIS Module 3 — Emission Forecaster
Uses sklearn (Linear, Polynomial, Ridge Regression) + statsmodels ARIMA
for time-series emission forecasting with ensemble predictions.
"""

import numpy as np
import pandas as pd
import warnings
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sklearn.metrics import r2_score, mean_absolute_error

try:
    from statsmodels.tsa.arima.model import ARIMA
    HAS_ARIMA = True
except ImportError:
    HAS_ARIMA = False

warnings.filterwarnings("ignore")


class EmissionForecaster:
    """Trains multiple ML models and produces ensemble forecasts."""

    def __init__(self, datasets_dir=None):
        self.reference_data = None
        if datasets_dir:
            self._load_reference_data(datasets_dir)

    def _load_reference_data(self, datasets_dir):
        """Load Pakistan forecasting reference data."""
        try:
            path = f"{datasets_dir}/forecasting_ready.csv"
            df = pd.read_csv(path)
            df = df.sort_values("year").reset_index(drop=True)
            self.reference_data = df
            print(f"[Forecaster] Loaded reference data: {len(df)} rows from forecasting_ready.csv")
        except Exception as e:
            print(f"[Forecaster] Warning: Could not load reference data: {e}")

    def forecast(self, monthly_data, forecast_months=6):
        """
        Train models on monthly emission data and forecast future values.

        Args:
            monthly_data: list of {"month": "YYYY-MM", "co2": float}
            forecast_months: number of months to forecast (1-24)

        Returns:
            dict with historical, forecasts, statistics, model_performance
        """
        if len(monthly_data) < 3:
            return {"error": "Need at least 3 months of data for forecasting"}

        forecast_months = min(max(1, forecast_months), 24)

        # Prepare data
        months = [d["month"] for d in monthly_data]
        values = np.array([d["co2"] for d in monthly_data], dtype=np.float64)
        X = np.arange(len(values)).reshape(-1, 1)
        y = values

        # Train models
        models = {}
        predictions = {}

        # 1. Linear Regression
        lr = LinearRegression()
        lr.fit(X, y)
        models["linear_regression"] = lr
        predictions["linear_regression"] = {
            "train_pred": lr.predict(X),
            "r2": r2_score(y, lr.predict(X)),
            "mae": mean_absolute_error(y, lr.predict(X)),
        }

        # 2. Polynomial Regression (degree 2) — need 5+ points
        if len(values) >= 5:
            poly = make_pipeline(PolynomialFeatures(degree=2), Ridge(alpha=1.0))
            poly.fit(X, y)
            models["polynomial"] = poly
            poly_pred = poly.predict(X)
            predictions["polynomial"] = {
                "train_pred": poly_pred,
                "r2": r2_score(y, poly_pred),
                "mae": mean_absolute_error(y, poly_pred),
            }

        # 3. Ridge Regression
        ridge = Ridge(alpha=1.0)
        ridge.fit(X, y)
        models["ridge"] = ridge
        predictions["ridge"] = {
            "train_pred": ridge.predict(X),
            "r2": r2_score(y, ridge.predict(X)),
            "mae": mean_absolute_error(y, ridge.predict(X)),
        }

        # 4. ARIMA (need 10+ points)
        arima_forecasts = None
        if HAS_ARIMA and len(values) >= 10:
            try:
                arima_model = ARIMA(values, order=(1, 1, 1))
                arima_fit = arima_model.fit()
                arima_pred = arima_fit.predict(start=0, end=len(values) - 1)
                arima_fc = arima_fit.forecast(steps=forecast_months)
                arima_ci = arima_fit.get_forecast(steps=forecast_months).conf_int(alpha=0.05)

                models["arima"] = arima_fit
                predictions["arima"] = {
                    "train_pred": arima_pred,
                    "r2": max(0, r2_score(y, arima_pred)),
                    "mae": mean_absolute_error(y, arima_pred),
                }
                arima_forecasts = {
                    "values": arima_fc.tolist() if hasattr(arima_fc, 'tolist') else list(arima_fc),
                    "lower": arima_ci.iloc[:, 0].tolist() if hasattr(arima_ci, 'iloc') else arima_ci[:, 0].tolist(),
                    "upper": arima_ci.iloc[:, 1].tolist() if hasattr(arima_ci, 'iloc') else arima_ci[:, 1].tolist(),
                }
            except Exception as e:
                print(f"[Forecaster] ARIMA failed: {e}")

        # Generate future X indices
        future_X = np.arange(len(values), len(values) + forecast_months).reshape(-1, 1)

        # Get predictions from each model
        model_forecasts = {}
        weights = {}

        for name, model in models.items():
            if name == "arima":
                continue
            try:
                fc = model.predict(future_X)
                fc = np.maximum(fc, 0)  # No negative emissions
                model_forecasts[name] = fc
                # Weight by R² (better fit = higher weight)
                r2 = max(0, predictions[name]["r2"])
                weights[name] = r2 + 0.1  # Minimum weight of 0.1
            except Exception:
                pass

        # Add ARIMA forecasts if available
        if arima_forecasts:
            model_forecasts["arima"] = np.array(arima_forecasts["values"])
            r2 = max(0, predictions["arima"]["r2"])
            weights["arima"] = r2 + 0.2  # Extra weight for time-series model

        # Weighted ensemble
        total_weight = sum(weights.values())
        ensemble = np.zeros(forecast_months)
        for name, fc in model_forecasts.items():
            w = weights.get(name, 0) / total_weight
            ensemble += fc[:forecast_months] * w

        # Confidence intervals using prediction spread + residual std
        residuals = y - lr.predict(X)
        residual_std = np.std(residuals) if len(residuals) > 1 else np.std(y) * 0.2

        # Calculate spread across models for each future point
        if len(model_forecasts) > 1:
            all_fc = np.array(list(model_forecasts.values()))
            model_spread = np.std(all_fc, axis=0)
        else:
            model_spread = np.full(forecast_months, residual_std)

        # Smoothed historical values (moving average)
        window = min(3, len(values))
        smoothed = pd.Series(values).rolling(window=window, min_periods=1).mean().tolist()

        # Build forecast results
        forecasts = []
        last_month = months[-1]
        for i in range(forecast_months):
            next_month = self._add_months(last_month, i + 1)
            spread = np.sqrt(residual_std**2 + model_spread[i] ** 2) * np.sqrt(i + 1)
            confidence = max(0.3, min(0.95, 1 - (i * 0.04)))

            # Use ARIMA CI if available
            if arima_forecasts and i < len(arima_forecasts["lower"]):
                lower = max(0, arima_forecasts["lower"][i])
                upper = arima_forecasts["upper"][i]
            else:
                lower = max(0, ensemble[i] - 1.96 * spread)
                upper = ensemble[i] + 1.96 * spread

            forecasts.append({
                "month": next_month,
                "predicted": round(float(ensemble[i]), 2),
                "lowerBound": round(float(lower), 2),
                "upperBound": round(float(upper), 2),
                "confidence": round(confidence, 2),
                "method": "ensemble",
            })

        # Historical with smoothed
        historical = []
        for i, m in enumerate(months):
            historical.append({
                "month": m,
                "actual": round(float(values[i]), 2),
                "smoothed": round(float(smoothed[i]), 2),
            })

        # Statistics
        trend = "increasing" if lr.coef_[0] > 0.5 else "decreasing" if lr.coef_[0] < -0.5 else "stable"
        growth = ((values[-1] - values[0]) / max(values[0], 1) / max(len(values) - 1, 1)) * 100

        # Model performance summary
        model_performance = {}
        for name, pred in predictions.items():
            model_performance[name] = {
                "r2": round(pred["r2"], 4),
                "mae": round(pred["mae"], 2),
            }

        # Pakistan reference comparison
        reference_comparison = None
        if self.reference_data is not None:
            try:
                pk = self.reference_data
                recent = pk[pk["year"] >= 2015]
                if len(recent) > 0:
                    pk_growth = ((recent["co2"].iloc[-1] - recent["co2"].iloc[0])
                                 / max(recent["co2"].iloc[0], 1) / max(len(recent) - 1, 1)) * 100
                    reference_comparison = {
                        "pakistan_latest_co2_mt": round(float(pk["co2"].iloc[-1]), 2),
                        "pakistan_annual_growth_pct": round(float(pk_growth), 2),
                        "company_monthly_growth_pct": round(float(growth), 2),
                    }
            except Exception:
                pass

        return {
            "historical": historical,
            "forecasts": forecasts,
            "statistics": {
                "trend": trend,
                "r2": round(float(predictions["linear_regression"]["r2"]), 3),
                "slope": round(float(lr.coef_[0]), 3),
                "monthlyGrowthRate": round(float(growth), 2),
                "avgEmission": round(float(np.mean(values)), 2),
                "maxEmission": round(float(np.max(values)), 2),
                "minEmission": round(float(np.min(values)), 2),
                "totalDataPoints": len(values),
            },
            "modelPerformance": model_performance,
            "modelsUsed": list(models.keys()),
            "referenceComparison": reference_comparison,
        }

    @staticmethod
    def _add_months(month_str, n):
        """Add n months to a 'YYYY-MM' string."""
        y, m = map(int, month_str.split("-"))
        m += n
        while m > 12:
            m -= 12
            y += 1
        while m < 1:
            m += 12
            y -= 1
        return f"{y:04d}-{m:02d}"
