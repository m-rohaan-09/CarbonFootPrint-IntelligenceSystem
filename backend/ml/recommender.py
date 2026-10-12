"""
CFIS Module 3 — Recommender & Insight Generator
Hotspot detection, AI recommendations, and NLP-style sustainability insights.
Uses emission_factors_defra.csv for informed recommendations.
"""

import os
import numpy as np
import pandas as pd


class Recommender:
    """Generates hotspot analysis, recommendations, and sustainability insights."""

    def __init__(self, datasets_dir=None):
        self.emission_factors = None
        self.reference_data = None
        if datasets_dir:
            self._load_data(datasets_dir)

    def _load_data(self, datasets_dir):
        """Load emission factors and reference datasets."""
        try:
            path = os.path.join(datasets_dir, "emission_factors_defra.csv")
            self.emission_factors = pd.read_csv(path)
            print(f"[Recommender] Loaded {len(self.emission_factors)} emission factors from DEFRA")
        except Exception as e:
            print(f"[Recommender] Warning: Could not load emission factors: {e}")

        try:
            path = os.path.join(datasets_dir, "forecasting_ready.csv")
            self.reference_data = pd.read_csv(path)
            print(f"[Recommender] Loaded Pakistan reference data")
        except Exception:
            pass

    # ─── HOTSPOT DETECTION ─────────────────────────────

    def detect_hotspots(self, emission_data):
        """
        Identify emission hotspots by category, department, and scope.

        Args:
            emission_data: list of dicts with category, scope, co2Equivalent, departmentName

        Returns:
            dict with categoryHotspots, departmentHotspots, scopeBreakdown
        """
        if not emission_data:
            return {"error": "No emission data provided"}

        df = pd.DataFrame(emission_data)
        total = df["co2Equivalent"].sum()
        if total == 0:
            return {"error": "Total emissions are zero"}

        # Category hotspots
        cat_group = df.groupby("category").agg(
            totalCO2e=("co2Equivalent", "sum"),
            recordCount=("co2Equivalent", "count"),
            avgPerRecord=("co2Equivalent", "mean"),
        ).reset_index()
        cat_group["percentage"] = (cat_group["totalCO2e"] / total * 100).round(1)
        cat_group["isHotspot"] = cat_group["percentage"] > 25
        cat_group["intensity"] = cat_group["percentage"].apply(
            lambda p: "critical" if p > 40 else "high" if p > 25 else "medium" if p > 15 else "low"
        )
        cat_group = cat_group.sort_values("totalCO2e", ascending=False)
        category_hotspots = cat_group.to_dict("records")
        for h in category_hotspots:
            h["name"] = h.pop("category")
            for k in ["totalCO2e", "avgPerRecord"]:
                h[k] = round(h[k], 2)

        # Department hotspots
        dept_group = df.groupby("departmentName").agg(
            totalCO2e=("co2Equivalent", "sum"),
            recordCount=("co2Equivalent", "count"),
        ).reset_index()
        dept_group["percentage"] = (dept_group["totalCO2e"] / total * 100).round(1)
        dept_group["isHotspot"] = dept_group["percentage"] > 30
        dept_group = dept_group.sort_values("totalCO2e", ascending=False)
        department_hotspots = dept_group.to_dict("records")
        for h in department_hotspots:
            h["name"] = h.pop("departmentName")
            h["totalCO2e"] = round(h["totalCO2e"], 2)

        # Scope breakdown
        scope_group = df.groupby("scope").agg(
            totalCO2e=("co2Equivalent", "sum"),
        ).reset_index()
        scope_group["percentage"] = (scope_group["totalCO2e"] / total * 100).round(1)
        scope_group = scope_group.sort_values("totalCO2e", ascending=False)
        scope_breakdown = scope_group.to_dict("records")
        for s in scope_breakdown:
            s["name"] = s.pop("scope")
            s["totalCO2e"] = round(s["totalCO2e"], 2)

        top = category_hotspots[0] if category_hotspots else None

        return {
            "totalEmissions": round(total, 2),
            "categoryHotspots": category_hotspots,
            "departmentHotspots": department_hotspots,
            "scopeBreakdown": scope_breakdown,
            "topHotspot": top,
        }

    # ─── RECOMMENDATIONS ───────────────────────────────

    def generate_recommendations(self, emission_data, forecast, anomalies, hotspots):
        """
        Generate context-aware AI recommendations.

        Uses DEFRA emission factors for informed suggestions.
        """
        recs = []
        priority = 1

        # 1. Hotspot-based
        if hotspots and "categoryHotspots" in hotspots:
            for hs in hotspots["categoryHotspots"]:
                if not hs.get("isHotspot"):
                    continue
                cat = hs["name"]
                strategy = self._get_reduction_strategy(cat)
                alt_factors = self._get_alternative_factors(cat)

                rec = {
                    "id": priority,
                    "priority": priority,
                    "category": "hotspot",
                    "severity": hs.get("intensity", "medium"),
                    "title": f"Reduce {self._fmt(cat)} emissions",
                    "description": (
                        f"{self._fmt(cat)} accounts for {hs['percentage']}% of total emissions "
                        f"({hs['totalCO2e']} kgCO₂e). {strategy}"
                    ),
                    "potentialReduction": round(hs["totalCO2e"] * 0.15, 2),
                    "icon": "local_fire_department",
                    "actionItems": self._get_action_items(cat),
                }
                if alt_factors:
                    rec["alternativeFactors"] = alt_factors
                recs.append(rec)
                priority += 1

        # 2. Trend-based
        if forecast and "statistics" in forecast:
            stat = forecast["statistics"]
            trend = stat.get("trend", "stable")
            growth = stat.get("monthlyGrowthRate", 0)

            if trend == "increasing" and growth > 2:
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "trend",
                    "severity": "critical" if growth > 5 else "high",
                    "title": "Emissions are rising significantly",
                    "description": (
                        f"Emissions are growing at {growth}% per month. "
                        "Immediate intervention is recommended."
                    ),
                    "potentialReduction": None,
                    "icon": "trending_up",
                    "actionItems": [
                        "Conduct an energy efficiency audit",
                        "Set monthly reduction targets",
                        "Implement real-time monitoring for high-emission activities",
                    ],
                })
                priority += 1
            elif trend == "decreasing":
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "trend",
                    "severity": "low",
                    "title": "Good progress — emissions declining",
                    "description": (
                        f"Emissions are decreasing at {abs(growth)}% per month. "
                        "Continue current practices and look for further optimization."
                    ),
                    "potentialReduction": None,
                    "icon": "trending_down",
                    "actionItems": [
                        "Document current successful strategies",
                        "Share best practices across departments",
                        "Set more ambitious reduction targets",
                    ],
                })
                priority += 1

        # 3. Anomaly-based
        if anomalies:
            anom_list = anomalies.get("anomalies", [])
            critical = [a for a in anom_list if a.get("severity") in ("critical", "high")]
            if critical:
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "anomaly",
                    "severity": "high",
                    "title": f"{len(critical)} critical emission anomalies detected",
                    "description": (
                        "Unusual spikes or drops detected by Isolation Forest and statistical analysis. "
                        "Investigate these for equipment malfunction or data entry errors."
                    ),
                    "potentialReduction": None,
                    "icon": "warning",
                    "actionItems": [
                        "Review flagged records for data entry errors",
                        "Check equipment maintenance logs for anomaly periods",
                        "Verify meter readings and billing statements",
                    ],
                })
                priority += 1

        # 4. Scope-based
        if hotspots and "scopeBreakdown" in hotspots:
            scopes = {s["name"]: s for s in hotspots["scopeBreakdown"]}
            s2 = scopes.get("scope_2")
            s1 = scopes.get("scope_1")
            s3 = scopes.get("scope_3")

            if s2 and s2["percentage"] > 40:
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "scope", "severity": "medium",
                    "title": "High Scope 2 (indirect) emissions",
                    "description": (
                        f"Scope 2 emissions represent {s2['percentage']}% of total. "
                        "Consider renewable energy procurement or on-site solar."
                    ),
                    "potentialReduction": round(s2["totalCO2e"] * 0.2, 2),
                    "icon": "bolt",
                    "actionItems": [
                        "Evaluate on-site solar or wind installation",
                        "Explore green energy tariffs from utility providers",
                        "Invest in energy-efficient equipment (LED, HVAC upgrades)",
                    ],
                })
                priority += 1

            if s1 and s1["percentage"] > 30:
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "scope", "severity": "medium",
                    "title": "Significant Scope 1 (direct) emissions",
                    "description": (
                        f"Scope 1 emissions represent {s1['percentage']}% of total. "
                        "Focus on fuel switching and fleet electrification."
                    ),
                    "potentialReduction": round(s1["totalCO2e"] * 0.15, 2),
                    "icon": "local_gas_station",
                    "actionItems": [
                        "Switch to lower-carbon fuels where possible",
                        "Electrify company fleet vehicles",
                        "Optimize heating and cooling systems",
                    ],
                })
                priority += 1

            if s3 and s3["percentage"] > 20:
                recs.append({
                    "id": priority, "priority": priority,
                    "category": "scope", "severity": "low",
                    "title": "Supply chain (Scope 3) emissions to watch",
                    "description": (
                        f"Scope 3 emissions represent {s3['percentage']}% of total. "
                        "Engage suppliers and reduce waste."
                    ),
                    "potentialReduction": round(s3["totalCO2e"] * 0.1, 2),
                    "icon": "local_shipping",
                    "actionItems": [
                        "Map supply chain emission sources",
                        "Engage key suppliers on carbon reduction",
                        "Implement waste reduction programs",
                    ],
                })
                priority += 1

        # 5. General
        recs.append({
            "id": priority, "priority": priority,
            "category": "general", "severity": "info",
            "title": "Set science-based reduction targets",
            "description": (
                "Align emission reduction goals with the Paris Agreement. "
                "Aim for at least 4.2% annual reduction to stay on a 1.5°C pathway."
            ),
            "potentialReduction": None,
            "icon": "science",
            "actionItems": [
                "Define a base year for target-setting",
                "Set short-term (2030) and long-term (2050) targets",
                "Report progress publicly for accountability",
            ],
        })

        return recs

    # ─── INSIGHTS ──────────────────────────────────────

    def generate_insights(self, emission_data, forecast, anomalies, hotspots):
        """Generate NLP-style sustainability insights."""
        insights = []
        total_co2 = sum(r.get("co2Equivalent", 0) for r in emission_data)
        total_tonnes = total_co2 / 1000

        # Overview
        insights.append({
            "type": "overview",
            "icon": "eco",
            "title": "Carbon Footprint Summary",
            "text": (
                f"Your total recorded emissions are {round(total_tonnes, 2)} tonnes CO₂e "
                f"across {len(emission_data)} records. "
                + self._equivalent_comparison(total_tonnes)
            ),
        })

        # Forecast insight
        if forecast and "forecasts" in forecast and forecast["forecasts"]:
            last_fc = forecast["forecasts"][-1]
            trend = forecast.get("statistics", {}).get("trend", "stable")
            models_used = forecast.get("modelsUsed", [])
            insights.append({
                "type": "forecast",
                "icon": "auto_graph",
                "title": "AI Emission Trajectory",
                "text": (
                    f"ML models ({', '.join(models_used)}) project emissions of "
                    f"{last_fc['predicted']} kgCO₂e/month in {len(forecast['forecasts'])} months. "
                    f"The overall trend is {trend}. "
                    + ("Consider accelerating reduction measures." if trend == "increasing"
                       else "Your reduction efforts are showing results." if trend == "decreasing"
                       else "Emissions are relatively stable.")
                ),
            })

        # Anomaly insight
        if anomalies and anomalies.get("anomalies"):
            anom = anomalies["anomalies"]
            crit = len([a for a in anom if a.get("severity") == "critical"])
            high = len([a for a in anom if a.get("severity") == "high"])
            methods = anomalies.get("statistics", {}).get("methodsUsed", [])
            insights.append({
                "type": "anomaly",
                "icon": "notification_important",
                "title": "Anomaly Detection Summary",
                "text": (
                    f"{len(anom)} anomalies detected using {', '.join(methods)}"
                    + (f" ({crit} critical, {high} high severity)" if crit + high > 0 else "")
                    + ". These patterns warrant investigation for operational issues or data quality."
                ),
            })

        # Hotspot insight
        if hotspots and hotspots.get("topHotspot"):
            top = hotspots["topHotspot"]
            insights.append({
                "type": "hotspot",
                "icon": "whatshot",
                "title": "Biggest Emission Source",
                "text": (
                    f"{self._fmt(top['name'])} is your largest source at {top['percentage']}% "
                    f"of total emissions. Targeting a 15% reduction could save "
                    f"~{round(top['totalCO2e'] * 0.15)} kgCO₂e."
                ),
            })

        # Pakistan context with reference data
        pk_context = self._get_pakistan_context()
        insights.append({
            "type": "context",
            "icon": "public",
            "title": "Pakistan Climate Context",
            "text": pk_context,
        })

        # DEFRA factor insight
        if self.emission_factors is not None:
            insights.append({
                "type": "methodology",
                "icon": "verified",
                "title": "Emission Factor Methodology",
                "text": (
                    f"Analysis uses {len(self.emission_factors)} verified emission factors from "
                    "UK DEFRA 2023, IPCC AR5, and EPA WARM v16. Factors cover Scope 1/2/3 "
                    "across fuels, vehicles, flights, electricity grids, waste, and refrigerants."
                ),
            })

        return insights

    # ─── PRIVATE HELPERS ───────────────────────────────

    def _get_alternative_factors(self, category):
        """Get alternative emission factors from DEFRA dataset for a category."""
        if self.emission_factors is None:
            return None

        mapping = {
            "electricity": "Electricity",
            "natural_gas": "Natural gas",
            "fuel": "Diesel",
            "transport": "Average car",
            "waste": "Waste",
        }
        keyword = mapping.get(category)
        if not keyword:
            return None

        try:
            matches = self.emission_factors[
                self.emission_factors["activity"].str.contains(keyword, case=False, na=False)
            ].head(3)
            if matches.empty:
                return None
            return matches[["activity", "unit", "kg_co2e_per_unit", "source"]].to_dict("records")
        except Exception:
            return None

    def _get_pakistan_context(self):
        """Build Pakistan climate context using reference data."""
        base = (
            "Pakistan contributes less than 1% of global emissions but ranks among "
            "the top 10 most climate-vulnerable nations. "
        )
        if self.reference_data is not None:
            try:
                pk = self.reference_data
                latest = pk.iloc[-1]
                co2 = latest.get("co2", 0)
                ghg = latest.get("total_ghg", 0)
                per_cap = latest.get("co2_per_capita", 0)
                year = int(latest.get("year", 0))
                base += (
                    f"As of {year}, Pakistan's total CO₂ emissions were {round(co2, 1)} Mt "
                    f"(total GHG: {round(ghg, 1)} Mt), with per-capita emissions of "
                    f"{round(per_cap, 2)} tonnes — well below the global average of ~4.7 tonnes. "
                )
            except Exception:
                pass
        base += "Corporate emission tracking is critical for national climate resilience and ESG compliance."
        return base

    @staticmethod
    def _fmt(cat):
        return (cat or "").replace("_", " ").title()

    @staticmethod
    def _equivalent_comparison(tonnes):
        if tonnes < 1:
            return f"Equivalent to ~{round(tonnes * 2481)} km driven by car."
        if tonnes < 10:
            return f"Equivalent to ~{round(tonnes * 2.3)} return flights Karachi–Islamabad."
        return f"Equivalent to ~{round(tonnes / 4.6)} Pakistani households' annual electricity."

    @staticmethod
    def _get_reduction_strategy(category):
        strategies = {
            "electricity": "Switch to LED lighting, install smart meters, optimize HVAC schedules, and consider solar.",
            "natural_gas": "Improve boiler efficiency, insulate heating systems, explore electrification.",
            "fuel": "Optimize fleet routes, transition to EVs, implement anti-idling policies.",
            "water": "Fix leaks, install low-flow fixtures, recycle process water.",
            "waste": "Implement zero-waste targets, improve recycling, compost organic waste.",
            "transport": "Encourage carpooling, provide cycling infrastructure, promote remote work.",
            "refrigerants": "Switch to low-GWP refrigerants, improve leak detection.",
            "other": "Conduct a detailed audit to identify specific reduction opportunities.",
        }
        return strategies.get(category, strategies["other"])

    @staticmethod
    def _get_action_items(category):
        actions = {
            "electricity": [
                "Conduct an energy audit of all facilities",
                "Replace lighting with LED fixtures",
                "Install programmable thermostats and smart building controls",
                "Evaluate rooftop solar potential",
            ],
            "natural_gas": [
                "Schedule boiler efficiency inspections",
                "Improve insulation in heated areas",
                "Explore heat pump alternatives",
            ],
            "fuel": [
                "Track fleet fuel consumption per vehicle",
                "Optimize delivery routes with routing software",
                "Evaluate electric vehicle feasibility",
            ],
            "water": [
                "Conduct a water audit to identify leaks",
                "Install water-efficient fixtures",
                "Implement water recycling in processes",
            ],
            "waste": [
                "Conduct a waste audit by type",
                "Set up separated recycling stations",
                "Partner with waste-to-energy providers",
            ],
            "transport": [
                "Survey employee commute patterns",
                "Offer remote work days to reduce commuting",
                "Install bicycle parking and shower facilities",
            ],
            "refrigerants": [
                "Inventory all refrigerant types and quantities",
                "Schedule regular leak detection inspections",
                "Plan transition to low-GWP alternatives (R-32, R-290)",
            ],
            "other": [
                "Identify and categorize 'other' emission sources",
                "Set up measurement and tracking systems",
            ],
        }
        return actions.get(category, actions["other"])
