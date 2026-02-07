import joblib
import json
import os
import numpy as np
from typing import Dict, Any, List, Tuple

from config import config
from ml.feature_mapper import FeatureMapper, PredictionRequest
from utils.helpers import get_logger, get_timestamp, safe_round

logger = get_logger(__name__)

# ---------------------------
# Thresholds (tune later)
# ---------------------------
LOW_CONF_CROP = 0.35
LOW_CONF_FERT = 0.40
STRONG_RULE_ADVANTAGE = 0.15  # if rules beat model strongly, override label

# ---------------------------
# Crop metadata (UI enrichment)
# ---------------------------
CROP_METADATA = {
    'Rice': {
        'icon': '🌾',
        'expectedYieldMin': 2500,
        'expectedYieldMax': 3500,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'stable',
        'growingSeasonStart': 'October',
        'growingSeasonEnd': 'February'
    },
    'Wheat': {
        'icon': '🌾',
        'expectedYieldMin': 2000,
        'expectedYieldMax': 3000,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'increasing',
        'growingSeasonStart': 'November',
        'growingSeasonEnd': 'April'
    },
    'Maize': {
        'icon': '🌽',
        'expectedYieldMin': 3000,
        'expectedYieldMax': 4500,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'stable',
        'growingSeasonStart': 'March',
        'growingSeasonEnd': 'July'
    },
    'Papaya': {
        'icon': '🍈',
        'expectedYieldMin': 15000,
        'expectedYieldMax': 25000,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'increasing',
        'growingSeasonStart': 'Year-round',
        'growingSeasonEnd': 'Year-round'
    },
    'Tomato': {
        'icon': '🍅',
        'expectedYieldMin': 8000,
        'expectedYieldMax': 12000,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'volatile',
        'growingSeasonStart': 'February',
        'growingSeasonEnd': 'May'
    },
    'Cotton': {
        'icon': '☁️',
        'expectedYieldMin': 800,
        'expectedYieldMax': 1200,
        'yieldUnit': 'kg/acre',
        'marketPriceTrend': 'stable',
        'growingSeasonStart': 'April',
        'growingSeasonEnd': 'October'
    },
}

# ---------------------------
# Fertilizer metadata (UI enrichment)
# ---------------------------
FERTILIZER_METADATA = {
    'NPK': {
        'components': ['Nitrogen (15%)', 'Phosphorus (15%)', 'Potassium (15%)'],
        'baseRatePerAcre': 100,
        'pricePerKg': 85,
        'environmentalImpact': 'moderate'
    },
    'Urea': {
        'components': ['Nitrogen (46%)'],
        'baseRatePerAcre': 80,
        'pricePerKg': 45,
        'environmentalImpact': 'high'
    },
    'DAP': {
        'components': ['Nitrogen (18%)', 'Phosphorus (46%)'],
        'baseRatePerAcre': 90,
        'pricePerKg': 70,
        'environmentalImpact': 'moderate'
    },
    'MOP': {
        'components': ['Potassium (60%)'],
        'baseRatePerAcre': 70,
        'pricePerKg': 50,
        'environmentalImpact': 'low'
    },
    'General Purpose Fertilizer': {
        'components': ['Nitrogen (15%)', 'Phosphorus (15%)', 'Potassium (15%)', 'Micronutrients'],
        'baseRatePerAcre': 120,
        'pricePerKg': 100,
        'environmentalImpact': 'low'
    },
}

# ---------------------------
# Rule ranges for TRUE Suitability
# (Start small; expand later)
# ---------------------------
# Expanded Crop Rules based on Enhanced Dataset Signatures
CROP_RULES = {
    # Grains & Cereals
    "rice":         {"ph": (5.0, 7.5), "rain": (150, 450), "temp": (20, 35), "moist": (60, 100), "hum": (75, 95)},
    "maize":        {"ph": (5.5, 7.5), "rain": (60, 200),  "temp": (18, 32), "moist": (40, 80),  "hum": (50, 75)},
    "wheat":        {"ph": (5.5, 7.5), "rain": (40, 150),  "temp": (10, 28), "moist": (30, 70),  "hum": (30, 65)},
    "millet":       {"ph": (5.0, 8.0), "rain": (30, 100),  "temp": (20, 38), "moist": (25, 60),  "hum": (30, 60)},
    "Jute":         {"ph": (6.0, 7.5), "rain": (150, 400), "temp": (24, 38), "moist": (70, 100), "hum": (70, 90)},

    # Beans & Legumes
    "Adzuki Beans": {"ph": (5.5, 7.5), "rain": (60, 150),  "temp": (15, 30), "moist": (40, 75),  "hum": (40, 70)},
    "Black gram":   {"ph": (5.0, 7.5), "rain": (50, 120),  "temp": (20, 35), "moist": (35, 70),  "hum": (40, 70)},
    "Chickpea":     {"ph": (6.0, 8.5), "rain": (40, 100),  "temp": (15, 30), "moist": (30, 65),  "hum": (35, 65)},
    "Kidney Beans": {"ph": (5.5, 7.0), "rain": (60, 150),  "temp": (15, 28), "moist": (40, 75),  "hum": (45, 75)},
    "Lentil":       {"ph": (5.5, 7.5), "rain": (40, 100),  "temp": (15, 28), "moist": (30, 65),  "hum": (40, 70)},
    "Moth Beans":   {"ph": (5.5, 8.0), "rain": (30, 80),   "temp": (25, 40), "moist": (20, 55),  "hum": (30, 65)},
    "Mung Bean":    {"ph": (5.5, 7.5), "rain": (50, 120),  "temp": (20, 35), "moist": (35, 70),  "hum": (40, 75)},
    "Pigeon Peas":  {"ph": (5.0, 7.5), "rain": (50, 150),  "temp": (18, 35), "moist": (35, 75),  "hum": (45, 75)},

    # Fruits & Commercial
    "apple":        {"ph": (5.5, 7.0), "rain": (60, 150),  "temp": (10, 25), "moist": (40, 75),  "hum": (45, 75)},
    "banana":       {"ph": (5.5, 8.0), "rain": (100, 300), "temp": (20, 35), "moist": (60, 95),  "hum": (70, 90)},
    "coconut":      {"ph": (5.0, 8.0), "rain": (120, 350), "temp": (22, 32), "moist": (60, 100), "hum": (75, 95)},
    "Coffee":       {"ph": (5.0, 7.0), "rain": (120, 250), "temp": (15, 28), "moist": (50, 85),  "hum": (60, 80)},
    "Cotton":       {"ph": (5.5, 8.0), "rain": (50, 150),  "temp": (20, 35), "moist": (40, 80),  "hum": (50, 75)},
    "grapes":       {"ph": (5.5, 7.5), "rain": (40, 120),  "temp": (15, 32), "moist": (35, 70),  "hum": (40, 70)},
    "mango":        {"ph": (5.0, 7.5), "rain": (75, 200),  "temp": (24, 35), "moist": (45, 80),  "hum": (45, 75)},
    "muskmelon":    {"ph": (6.0, 7.5), "rain": (40, 100),  "temp": (20, 35), "moist": (35, 65),  "hum": (40, 70)},
    "orange":       {"ph": (5.5, 7.5), "rain": (60, 180),  "temp": (15, 32), "moist": (40, 75),  "hum": (45, 75)},
    "papaya":       {"ph": (5.5, 7.0), "rain": (80, 250),  "temp": (22, 35), "moist": (50, 85),  "hum": (65, 85)},
    "pomegranate":  {"ph": (5.5, 7.5), "rain": (40, 120),  "temp": (18, 35), "moist": (35, 70),  "hum": (40, 70)},
    "watermelon":   {"ph": (5.5, 7.5), "rain": (40, 100),  "temp": (22, 38), "moist": (35, 65),  "hum": (40, 70)},
    
    # Others
    "Tea":          {"ph": (4.5, 6.0), "rain": (150, 400), "temp": (15, 30), "moist": (60, 95),  "hum": (70, 90)},
    "Rubber":       {"ph": (4.5, 6.5), "rain": (180, 450), "temp": (22, 35), "moist": (65, 100), "hum": (75, 95)},
    "Tobacco":      {"ph": (5.5, 7.5), "rain": (60, 150),  "temp": (18, 32), "moist": (40, 75),  "hum": (45, 75)},
    "Ground Nut":   {"ph": (5.5, 7.0), "rain": (50, 125),  "temp": (22, 32), "moist": (40, 75),  "hum": (50, 75)},
}

class Predictor:
    def __init__(self):
        self.crop_model = None
        self.fertilizer_model = None
        self.remark_map = None
        self.metadata = None
        self.models_loaded = False

    # ---------------------------
    # Utilities
    # ---------------------------
    def _get_classes(self, model):
        """Works for estimator OR sklearn Pipeline."""
        if hasattr(model, "classes_"):
            return model.classes_
        if hasattr(model, "named_steps") and "classifier" in model.named_steps:
            return model.named_steps["classifier"].classes_
        raise RuntimeError("Unable to access model classes_")

    def _safe_predict_proba(self, model, features_df):
        """Predict proba for estimator or pipeline."""
        if hasattr(model, "predict_proba"):
            return model.predict_proba(features_df)[0]
        raise RuntimeError("Model does not support predict_proba")

    def _in_range_score(self, v: float, lo: float, hi: float) -> float:
        """0..1 score: 1 inside range, penalize outside smoothly."""
        if lo <= v <= hi:
            return 1.0
        if v < lo:
            denom = (lo if lo != 0 else 1.0)
            return max(0.0, 1.0 - (lo - v) / denom)
        denom = (hi if hi != 0 else 1.0)
        return max(0.0, 1.0 - (v - hi) / denom)

    def _rule_crop_score(self, crop_name: str, features: Dict[str, Any]) -> float:
        rules = CROP_RULES.get(crop_name)
        if not rules: return 0.0

        ph = float(features.get("PH", 7.0))
        rain = float(features.get("Rainfall", 150))
        temp = float(features.get("Temperature", 28))
        moist = float(features.get("Moisture", 60))
        hum = float(features.get("Humidity", 60)) # New input

        s1 = self._in_range_score(ph, *rules["ph"])
        s2 = self._in_range_score(rain, *rules["rain"])
        s3 = self._in_range_score(temp, *rules["temp"])
        s4 = self._in_range_score(moist, *rules["moist"])
        s5 = self._in_range_score(hum, *rules["hum"]) # New check

        return (s1 + s2 + s3 + s4 + s5) / 5.0

    def _fertilizer_rule_pick(self, features: Dict[str, Any]) -> str:
        """Simple nutrient-deficiency rule (tune thresholds later)."""
        n = float(features.get("Nitrogen", 100))
        p = float(features.get("Phosphorous", 50))
        k = float(features.get("Potassium", 100))

        # Example thresholds
        if n < 80:
            return "Urea"
        if p < 40:
            return "DAP"
        if k < 80:
            return "MOP"
        return "General Purpose Fertilizer"

    def _hybrid_suitability(self, model_prob: float, rule_score: float, is_low_conf: bool) -> float:
        """
        Combine ML probability + rule suitability into a single score 0..1.
        If low confidence, rules dominate.
        """
        if is_low_conf:
            w_model, w_rule = 0.30, 0.70
        else:
            w_model, w_rule = 0.70, 0.30
        return float((w_model * model_prob) + (w_rule * rule_score))

    # ---------------------------
    # Load models
    # ---------------------------
    def load_models(self):
        """Load trained models and metadata"""
        try:
            if not os.path.exists(config.CROP_MODEL_PATH):
                logger.warning("Models not found. Please run training first.")
                return False

            logger.info("Loading models...")
            self.crop_model = joblib.load(config.CROP_MODEL_PATH)
            self.fertilizer_model = joblib.load(config.FERTILIZER_MODEL_PATH)
            self.remark_map = joblib.load(config.REMARK_MAP_PATH)

            with open(config.METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)

            self.models_loaded = True
            logger.info(f"Models loaded successfully (version: {self.metadata.get('model_version')})")
            return True

        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False

    # ---------------------------
    # Crop prediction
    # ---------------------------
    def predict_crop(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict crop with probabilities"""
        proba = self._safe_predict_proba(self.crop_model, features_df)
        classes = self._get_classes(self.crop_model)

        top_idx = int(np.argmax(proba))
        crop_label = str(classes[top_idx])
        confidence = float(proba[top_idx])

        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [{'label': str(classes[i]), 'prob': float(proba[i])} for i in top_k_indices]

        return crop_label, confidence, top_k

    # ---------------------------
    # Fertilizer prediction
    # ---------------------------
    def predict_fertilizer(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict fertilizer with probabilities"""
        proba = self._safe_predict_proba(self.fertilizer_model, features_df)
        classes = self._get_classes(self.fertilizer_model)

        top_idx = int(np.argmax(proba))
        fert_label = str(classes[top_idx])
        confidence = float(proba[top_idx])

        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [{'label': str(classes[i]), 'prob': float(proba[i])} for i in top_k_indices]

        return fert_label, confidence, top_k

    def get_crop_metadata(self, crop: str) -> Dict:
        default = {
            'icon': '🌱',
            'expectedYieldMin': 1000,
            'expectedYieldMax': 2000,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'Season-dependent',
            'growingSeasonEnd': 'Season-dependent'
        }
        return CROP_METADATA.get(crop, default)

    def get_fertilizer_metadata(self, fertilizer: str, land_size: float) -> Dict:
        default = {
            'components': ['Balanced nutrients'],
            'baseRatePerAcre': 100,
            'pricePerKg': 80,
            'environmentalImpact': 'moderate'
        }
        meta = FERTILIZER_METADATA.get(fertilizer, default)

        total_quantity = int(meta['baseRatePerAcre'] * land_size)
        estimated_cost = total_quantity * meta['pricePerKg']

        return {
            'components': meta['components'],
            'quantityPerAcre': f"{total_quantity} kg total ({meta['baseRatePerAcre']} kg/acre)",
            'estimatedCost': int(estimated_cost),
            'costUnit': 'LKR',
            'environmentalImpact': meta['environmentalImpact'],
            'applicationSchedule': self.generate_application_schedule()
        }

    def generate_application_schedule(self) -> List[Dict]:
        return [
            {'week': 1, 'action': 'Base application - Apply 50% of total fertilizer'},
            {'week': 4, 'action': 'First top dressing - Apply 25% of total fertilizer'},
            {'week': 8, 'action': 'Second top dressing - Apply remaining 25%'}
        ]

    # ---------------------------
    # Explanations (keep your style)
    # ---------------------------
    def generate_feature_importance(self, features_df) -> List[Dict]:
        ph = float(features_df['PH'].values[0])
        nitrogen = float(features_df['Nitrogen'].values[0])
        soil = str(features_df['Soil'].values[0])

        # NOTE: Your previous formula gave higher impact when worse.
        # Here we make it more intuitive: higher impact = better match.
        ph_score = 1.0 if (6.0 <= ph <= 7.5) else 0.4
        n_score = 1.0 if (nitrogen >= 80) else 0.4

        importance = [
            {
                'feature': 'Soil pH',
                'impact': safe_round(ph_score, 2),
                'explanation': f'pH {ph:.1f} is {"optimal" if 6.0 <= ph <= 7.5 else "suboptimal"} for nutrient availability'
            },
            {
                'feature': 'Nitrogen',
                'impact': safe_round(n_score, 2),
                'explanation': f'Nitrogen level ({nitrogen:.0f}) is {"adequate" if nitrogen >= 80 else "low"}'
            },
            {
                'feature': 'Soil Type',
                'impact': 0.75,
                'explanation': f'{soil} generally provides {"good" if "Loamy" in soil else "moderate"} nutrient retention'
            }
        ]
        return sorted(importance, key=lambda x: x['impact'], reverse=True)

    def generate_risk_factors(self, features_df) -> List[Dict]:
        ph = float(features_df['PH'].values[0])
        rainfall = float(features_df['Rainfall'].values[0])

        risks = []

        if ph < 5.5:
            risks.append({'factor': 'Low soil pH (acidic)', 'mitigation': 'Apply lime to raise pH to 6-7 range'})
        elif ph > 8:
            risks.append({'factor': 'High soil pH (alkaline)', 'mitigation': 'Add sulfur or organic matter to lower pH'})

        if rainfall < 100:
            risks.append({'factor': 'Low rainfall', 'mitigation': 'Ensure adequate irrigation and mulching'})
        elif rainfall > 300:
            risks.append({'factor': 'High rainfall', 'mitigation': 'Ensure proper drainage to prevent waterlogging'})

        if not risks:
            risks.append({'factor': 'No major risks detected', 'mitigation': 'Continue regular monitoring and good agricultural practices'})

        return risks

    def generate_alternative_crops(self, top_k: List[Dict]) -> List[Dict]:
        alternatives = []
        for item in top_k[1:4]:
            prob_percent = int(float(item['prob']) * 100)
            alternatives.append({
                'crop': item['label'],
                'confidence': prob_percent,
                'reason': f"Good alternative based on current conditions ({prob_percent}% match)"
            })
        return alternatives

    # ---------------------------
    # Main predict (frontend compatible)
    # ---------------------------
    def predict(self, request: PredictionRequest) -> Dict[str, Any]:
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Please train models first.")

        features_df = FeatureMapper.extract_features(request)
        features = features_df.iloc[0].to_dict()

        warnings: List[Dict[str, str]] = []

        # ---- Crop (model) ----
        crop_label, crop_model_conf, crop_top_k_model = self.predict_crop(features_df)
        is_crop_low = crop_model_conf < LOW_CONF_CROP

        # Compute rule scores for top_k candidates
        scored_candidates = []
        for item in crop_top_k_model:
            name = item["label"]
            rule_score = self._rule_crop_score(name, features)
            hybrid = self._hybrid_suitability(float(item["prob"]), rule_score, is_crop_low)
            scored_candidates.append({
                "label": name,
                "modelProb": float(item["prob"]),
                "ruleScore": float(rule_score),
                "prob": float(hybrid),  # NOTE: now this is "match/suitability"
            })

        scored_candidates.sort(key=lambda x: x["prob"], reverse=True)

        # Decide final crop label (override if low confidence and rules strongly disagree)
        final_crop = scored_candidates[0]["label"]
        final_suitability = float(scored_candidates[0]["prob"])

        # Compare model-top vs rule-top for override messaging
        model_top = crop_label
        model_top_rule = self._rule_crop_score(model_top, features)
        model_top_hybrid = self._hybrid_suitability(crop_model_conf, model_top_rule, is_crop_low)

        if is_crop_low:
            warnings.append({
                "type": "LOW_CROP_CONFIDENCE",
                "message": f"Low crop model confidence ({int(crop_model_conf*100)}%). Suitability rules are used to stabilize recommendations."
            })

            # if the best hybrid is significantly higher than model-top hybrid, warn override
            if (final_suitability - model_top_hybrid) >= STRONG_RULE_ADVANTAGE and final_crop != model_top:
                warnings.append({
                    "type": "CROP_OVERRIDDEN_BY_SUITABILITY",
                    "message": f"Suitability score favors {final_crop} over {model_top} for current soil/climate."
                })

        crop_meta = self.get_crop_metadata(final_crop)

        # Build crop block (IMPORTANT: confidence now = suitability)
        crop_block = {
            'label': final_crop,
            'confidence': safe_round(final_suitability, 2),          # used by UI -> shows meaningful %
            'modelConfidence': safe_round(crop_model_conf, 3),       # keep raw probability for debugging
            'suitabilityScore': safe_round(final_suitability, 2),    # explicit
            'icon': crop_meta['icon'],
            'expectedYieldMin': crop_meta['expectedYieldMin'],
            'expectedYieldMax': crop_meta['expectedYieldMax'],
            'yieldUnit': crop_meta['yieldUnit'],
            'marketPriceTrend': crop_meta['marketPriceTrend'],
            'growingSeasonStart': crop_meta['growingSeasonStart'],
            'growingSeasonEnd': crop_meta['growingSeasonEnd'],
            'top_k': [
                {
                    "label": x["label"],
                    "prob": safe_round(x["prob"], 3),         # suitability-like
                    "modelProb": safe_round(x["modelProb"], 3),
                    "ruleScore": safe_round(x["ruleScore"], 3),
                }
                for x in scored_candidates[:5]
            ]
        }

        # ---- Fertilizer (model) ----
        fert_label, fert_model_conf, fert_top_k_model = self.predict_fertilizer(features_df)
        is_fert_low = fert_model_conf < LOW_CONF_FERT

        final_fert = fert_label
        if is_fert_low:
            rule_fert = self._fertilizer_rule_pick(features)
            if rule_fert != fert_label:
                warnings.append({
                    "type": "LOW_FERTILIZER_CONFIDENCE",
                    "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Nutrient-rule suggests {rule_fert}."
                })
                final_fert = rule_fert
            else:
                warnings.append({
                    "type": "LOW_FERTILIZER_CONFIDENCE",
                    "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Recommendation kept but treat as low certainty."
                })

        fert_meta = self.get_fertilizer_metadata(final_fert, request.field.landSize)

        # Fertilizer “suitability” can be simple for now:
        fert_rule_ok = 1.0 if final_fert == self._fertilizer_rule_pick(features) else 0.6
        fert_suitability = self._hybrid_suitability(fert_model_conf, fert_rule_ok, is_fert_low)

        fertilizer_block = {
            'label': final_fert,
            'confidence': safe_round(fert_suitability, 2),         # optional if UI uses it later
            'modelConfidence': safe_round(fert_model_conf, 3),
            'suitabilityScore': safe_round(fert_suitability, 2),
            'type': final_fert,
            'components': fert_meta['components'],
            'quantityPerAcre': fert_meta['quantityPerAcre'],
            'estimatedCost': fert_meta['estimatedCost'],
            'costUnit': fert_meta['costUnit'],
            'environmentalImpact': fert_meta['environmentalImpact'],
            'applicationSchedule': fert_meta['applicationSchedule'],
            'top_k': [
                {
                    "label": x["label"],
                    "prob": safe_round(float(x["prob"]), 3)
                }
                for x in fert_top_k_model[:5]
            ]
        }

        # Get remark
        remark = self.remark_map.get(final_fert, "")

        # Generate insights
        feature_importance = self.generate_feature_importance(features_df)
        risk_factors = self.generate_risk_factors(features_df)
        alternative_crops = self.generate_alternative_crops(crop_block["top_k"])

        response = {
            'success': True,
            'crop': crop_block,
            'fertilizer': fertilizer_block,
            'remark': remark,
            'featureImportance': feature_importance,
            'riskFactors': risk_factors,
            'alternativeCrops': alternative_crops,
            'warnings': warnings,  # NEW: frontend can show as alerts
            'meta': {
                'model_version': self.metadata.get('model_version', 'unknown'),
                'timestamp': get_timestamp()
            }
        }

        return response


# Global predictor instance
predictor = Predictor()
