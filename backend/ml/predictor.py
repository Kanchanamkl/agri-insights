import joblib
import json
import os
import numpy as np
from typing import Dict, Any, List, Tuple
from pathlib import Path

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

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
CROP_MODEL_PATH = ARTIFACTS_DIR / "crop_model.joblib"
FERT_MODEL_PATH = ARTIFACTS_DIR / "fert_model.joblib"
REMARK_MAP_PATH = ARTIFACTS_DIR / "remark_map.joblib"

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
            paths = {
                "crop_model": config.CROP_MODEL_PATH,
                "fertilizer_model": config.FERTILIZER_MODEL_PATH,
                "remark_map": config.REMARK_MAP_PATH,
            }

            missing = [k for k, p in paths.items() if not os.path.exists(p)]
            if missing:
                logger.error(f"Missing model artifacts: {missing}")
                logger.error(f"Expected paths: {paths}")
                self.models_loaded = False
                return

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
        logger.info("=" * 80)
        logger.info("CROP : PREDICTION PROCESS")
        logger.info("=" * 80)


        logger.info("CROP : Starting crop prediction")
        logger.info("CROP : Input features shape: %s", features_df.shape)
        logger.info("CROP : Input features columns: %s", list(features_df.columns))

        # Step 1: Get probability distribution across all crop classes
        proba = self._safe_predict_proba(self.crop_model, features_df)
        logger.info("CROP : Prediction probabilities: %s", proba)

        # Step 2: Get the crop class labels from the trained model
        classes = self._get_classes(self.crop_model)
        logger.info("CROP : Model classes: %s", classes)

        # Step 3: Identify the class with the highest probability
        top_idx = int(np.argmax(proba))
        crop_label = str(classes[top_idx])
        confidence = float(proba[top_idx])
        logger.info(
            "CROP : Best prediction: crop='%s', confidence=%.4f (index=%d)",
            crop_label, confidence, top_idx
        )

        # Step 4: Get top-5 predictions sorted by probability (descending)
        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [{'label': str(classes[i]), 'prob': float(proba[i])} for i in top_k_indices]
        logger.info("CROP : Top-5 predictions: %s", top_k)

        return crop_label, confidence, top_k

    # ---------------------------
    # Fertilizer prediction
    # ---------------------------
    def predict_fertilizer(self, features_df) -> Tuple[str, float, List[Dict]]:
        """
        Predict fertilizer recommendation with probabilities and detailed logging
        
        Returns:
            (fertilizer_label, confidence, top_k_list)
        """
        logger.info("=" * 80)
        logger.info("FERTILIZER PREDICTION PROCESS")
        logger.info("=" * 80)
        
        # ─── STEP 1: Extract Raw Probabilities ───
        logger.info("\n[STEP 1] Getting Model Probabilities")
        logger.debug("FERTILIZER : Input features shape: %s", features_df.shape)
        logger.debug("FERTILIZER : Input features columns: %s", list(features_df.columns))
        
        proba = self._safe_predict_proba(self.fertilizer_model, features_df)
        
        logger.info(f"FERTILIZER :Raw probability array: {proba}")
        logger.info(f"FERTILIZER :Array length: {len(proba)} (number of fertilizer classes)")
        logger.info(f"FERTILIZER :Sum of probabilities: {proba.sum():.4f} (should be 1.0)")
        
        # ─── STEP 2: Get Fertilizer Class Labels ───
        logger.info("\n[STEP 2]FERTILIZER :Retrieving Fertilizer Classes from Model")
        classes = self._get_classes(self.fertilizer_model)
        
        logger.info(f"FERTILIZER :Available fertilizer types: {list(classes)}")
        logger.info(f"FERTILIZER :Total fertilizer classes: {len(classes)}")
        
        # Create a mapping for clarity
        class_prob_map = {str(classes[i]): float(proba[i]) for i in range(len(classes))}
        logger.debug("FERTILIZER :Class-to-Probability mapping:")
        for fert_type, prob in sorted(class_prob_map.items(), key=lambda x: x[1], reverse=True):
            logger.debug(f"  {fert_type:30s} → {prob:.4f} ({prob*100:6.2f}%)")
        
        # ─── STEP 3: Identify Best Prediction ───
        logger.info("\n[STEP 3] Finding Best Prediction (Highest Probability)")
        top_idx = int(np.argmax(proba))
        fert_label = str(classes[top_idx])
        confidence = float(proba[top_idx])
        
        logger.info(f"FERTILIZER :Highest probability index: {top_idx}")
        logger.info(f"FERTILIZER :Best fertilizer: {fert_label}")
        logger.info(f"FERTILIZER :Model confidence: {confidence:.4f} ({confidence*100:.2f}%)")
        
        # ─── STEP 4: Get Top-5 Alternatives ───
        logger.info("\n[STEP 4] FERTILIZER : Generating Top-5 Alternative Fertilizers")
        top_k_indices = np.argsort(proba)[::-1][:5]
        
        logger.info(f"FERTILIZER : Top-5 indices (sorted descending): {top_k_indices}")
        
        top_k = []
        for rank, idx in enumerate(top_k_indices, start=1):
            fert_name = str(classes[idx])
            prob_value = float(proba[idx])
            percentage = prob_value * 100
            
            log_line = f"  {rank}. {fert_name:30s} → {prob_value:.4f} ({percentage:6.2f}%)"
            logger.info(log_line)
            
            top_k.append({
                'label': fert_name,
                'prob': prob_value
            })
        
        logger.info("=" * 80)
        logger.info(f"FERTILIZER : RESULT: {fert_label} (confidence: {confidence:.2%})")
        logger.info("=" * 80 + "\n")
        
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

    def get_fertilizer_metadata(self, fertilizer: str) -> Dict:
        """
        Field Context removed => no land_size-based quantities/costs.
        Return base guidance only.
        """
        default = {
            'components': ['Balanced nutrients'],
            'baseRatePerAcre': 100,
            'pricePerKg': 80,
            'environmentalImpact': 'moderate'
        }
        meta = FERTILIZER_METADATA.get(fertilizer, default)

        return {
            'components': meta['components'],
            'baseRatePerAcre': meta['baseRatePerAcre'],
            'pricePerKg': meta['pricePerKg'],
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
        """
        Main prediction method - combines ML models with agricultural rules
        to provide crop & fertilizer recommendations
        """
        
        logger.info("=" * 100)
        logger.info("█" * 100)
        logger.info("STARTING COMPREHENSIVE PREDICTION")
        logger.info("█" * 100)
        logger.info("=" * 100)
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 0: INITIALIZATION & MODEL CHECK
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 0] INITIALIZATION & MODEL CHECK")
        logger.info("-" * 100)
        
        if not self.models_loaded:
            logger.error("CRITICAL: Models not loaded!")
            raise RuntimeError("Models not loaded. Please train models first.")
        
        logger.info("✓ Models loaded successfully")
        logger.info(f"  • Model Version: {self.metadata.get('model_version', 'unknown')}")
        logger.info(f"  • Crop Classes: {len(self.metadata.get('crop_classes', []))} types")
        logger.info(f"  • Fertilizer Classes: {len(self.metadata.get('fertilizer_classes', []))} types")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 1: FEATURE EXTRACTION & VALIDATION
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 1] FEATURE EXTRACTION & VALIDATION")
        logger.info("-" * 100)
        
        try:
            features_df = FeatureMapper.extract_features(request)
            features = features_df.iloc[0].to_dict()
            
            logger.info("✓ Features extracted successfully")
            logger.info(f"  • DataFrame shape: {features_df.shape}")
            logger.info(f"  • Features extracted: {len(features)} parameters")
            
            # Log individual features for debugging
            logger.debug("\n  Detailed Feature Values:")
            logger.debug(f"    SOIL:")
            logger.debug(f"      - Nitrogen (N):        {features.get('Nitrogen', 'N/A')} ppm")
            logger.debug(f"      - Phosphorus (P):      {features.get('Phosphorous', 'N/A')} ppm")
            logger.debug(f"      - Potassium (K):       {features.get('Potassium', 'N/A')} ppm")
            logger.debug(f"      - Carbon (C):          {features.get('Carbon', 'N/A')} ppm")
            logger.debug(f"      - pH:                  {features.get('PH', 'N/A')}")
            logger.debug(f"      - Moisture:            {features.get('Moisture', 'N/A')}%")
            logger.debug(f"      - Soil Type:           {features.get('Soil', 'N/A')}")
            logger.debug(f"    ENVIRONMENTAL:")
            logger.debug(f"      - Temperature:         {features.get('Temperature', 'N/A')}°C")
            logger.debug(f"      - Rainfall:            {features.get('Rainfall', 'N/A')} mm")
            logger.debug(f"      - Humidity:            {features.get('Humidity', 'N/A')}%")
            
        except Exception as e:
            logger.error(f"✗ Feature extraction failed: {str(e)}", exc_info=True)
            raise
        
        warnings: List[Dict[str, str]] = []
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 2: CROP PREDICTION (ML MODEL)
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 2] CROP PREDICTION (ML MODEL)")
        logger.info("-" * 100)
        
        try:
            crop_label, crop_model_conf, crop_top_k_model = self.predict_crop(features_df)
            is_crop_low = crop_model_conf < LOW_CONF_CROP
            
            logger.info(f"\n✓ Crop prediction complete")
            logger.info(f"  • Best Prediction: {crop_label}")
            logger.info(f"  • Model Confidence: {crop_model_conf:.4f} ({crop_model_conf*100:.2f}%)")
            logger.info(f"  • Low Confidence Flag: {'YES ⚠️' if is_crop_low else 'NO ✓'}")
            logger.info(f"  • Threshold: {LOW_CONF_CROP} ({LOW_CONF_CROP*100:.0f}%)")
            
            logger.info(f"\n  Top-5 Model Predictions:")
            for rank, item in enumerate(crop_top_k_model, 1):
                logger.info(f"    {rank}. {item['label']:25s} → {item['prob']:.4f} ({item['prob']*100:6.2f}%)")
                
        except Exception as e:
            logger.error(f"✗ Crop prediction failed: {str(e)}", exc_info=True)
            raise
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 3: CROP RULE-BASED SCORING
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 3] CROP RULE-BASED SCORING")
        logger.info("-" * 100)
        logger.info("  Evaluating top-5 crops against agricultural suitability rules...\n")
        
        scored_candidates = []
        
        for item in crop_top_k_model:
            name = item["label"]
            
            # Get rule score
            rule_score = self._rule_crop_score(name, features)
            
            # Get hybrid score
            hybrid = self._hybrid_suitability(float(item["prob"]), rule_score, is_crop_low)
            
            scored_candidates.append({
                "label": name,
                "modelProb": float(item["prob"]),
                "ruleScore": float(rule_score),
                "prob": float(hybrid),
            })
            
            # Log individual crop evaluation
            model_pct = item["prob"] * 100
            rule_pct = rule_score * 100
            hybrid_pct = hybrid * 100
            
            logger.info(f"  {name:25s}:")
            logger.info(f"    • Model Probability:  {item['prob']:.4f} ({model_pct:6.2f}%)")
            logger.info(f"    • Rule Suitability:   {rule_score:.4f} ({rule_pct:6.2f}%)")
            
            if is_crop_low:
                logger.info(f"    • Weight (Low Conf):  30% ML + 70% Rules")
            else:
                logger.info(f"    • Weight (High Conf): 70% ML + 30% Rules")
            
            logger.info(f"    • Hybrid Score:       {hybrid:.4f} ({hybrid_pct:6.2f}%) ★")
        
        # Sort by hybrid score (descending)
        scored_candidates.sort(key=lambda x: x["prob"], reverse=True)
        
        logger.info(f"\n  After Rule Evaluation (Sorted by Suitability):")
        for rank, candidate in enumerate(scored_candidates, 1):
            logger.info(f"    {rank}. {candidate['label']:25s} → {candidate['prob']:.4f} ({candidate['prob']*100:6.2f}%)")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 4: CROP DECISION LOGIC
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 4] CROP DECISION LOGIC")
        logger.info("-" * 100)
        
        final_crop = scored_candidates[0]["label"]
        final_suitability = float(scored_candidates[0]["prob"])
        
        logger.info(f"  Final Crop Selection: {final_crop}")
        logger.info(f"  Final Suitability Score: {final_suitability:.4f} ({final_suitability*100:.2f}%)")
        
        # Compare model-top vs rule-top for override messaging
        model_top = crop_label
        model_top_rule = self._rule_crop_score(model_top, features)
        model_top_hybrid = self._hybrid_suitability(crop_model_conf, model_top_rule, is_crop_low)
        
        logger.info(f"\n  Comparison with Model's First Choice ({model_top}):")
        logger.info(f"    • Model Top Hybrid Score: {model_top_hybrid:.4f} ({model_top_hybrid*100:.2f}%)")
        logger.info(f"    • Final Top Hybrid Score: {final_suitability:.4f} ({final_suitability*100:.2f}%)")
        logger.info(f"    • Difference: {(final_suitability - model_top_hybrid):.4f}")
        
        # Check for override conditions
        # if is_crop_low:
        #     logger.info(f"\n  ⚠️  LOW CONFIDENCE MODE ACTIVE")
        #     logger.info(f"    • Model confidence ({crop_model_conf*100:.1f}%) < threshold ({LOW_CONF_CROP*100:.0f}%)")
        #     logger.info(f"    • Agricultural rules weighted higher (70%)")
            
        #     warnings.append({
        #         "type": "LOW_CROP_CONFIDENCE",
        #         "message": f"Low crop model confidence ({int(crop_model_conf*100)}%). Suitability rules are used to stabilize recommendations."
        #     })
            
        #     # Check if rules strongly disagree with model
        #     if (final_suitability - model_top_hybrid) >= STRONG_RULE_ADVANTAGE and final_crop != model_top:
        #         logger.warning(f"\n  ⚠️  CROP OVERRIDE TRIGGERED (Rule Advantage ≥ {STRONG_RULE_ADVANTAGE})")
        #         logger.warning(f"    • Model suggested: {model_top} ({model_top_hybrid*100:.1f}% suitability)")
        #         logger.warning(f"    • Rules prefer: {final_crop} ({final_suitability*100:.1f}% suitability)")
        #         logger.warning(f"    • Reason: Better soil/climate match for {final_crop}")
                
        #         warnings.append({
        #             "type": "CROP_OVERRIDDEN_BY_SUITABILITY",
        #             "message": f"Suitability score favors {final_crop} over {model_top} for current soil/climate."
        #         })
        # else:
        #     logger.info(f"\n  ✓ HIGH CONFIDENCE MODE")
        #     logger.info(f"    • Model confidence ({crop_model_conf*100:.1f}%) ≥ threshold ({LOW_CONF_CROP*100:.0f}%)")
        #     logger.info(f"    • ML model weighted higher (70%)")
        
        # Get crop metadata
        crop_meta = self.get_crop_metadata(final_crop)
        logger.info(f"\n  Loading metadata for {final_crop}:")
        logger.info(f"    • Icon: {crop_meta['icon']}")
        logger.info(f"    • Expected Yield: {crop_meta['expectedYieldMin']}-{crop_meta['expectedYieldMax']} {crop_meta['yieldUnit']}")
        logger.info(f"    • Growing Season: {crop_meta['growingSeasonStart']} to {crop_meta['growingSeasonEnd']}")
        logger.info(f"    • Market Trend: {crop_meta['marketPriceTrend']}")
        
        # Build crop block
        crop_block = {
            'label': final_crop,
            'confidence': safe_round(final_suitability, 2),
            'modelConfidence': safe_round(crop_model_conf, 3),
            'suitabilityScore': safe_round(final_suitability, 2),
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
                    "prob": safe_round(x["prob"], 3),
                    "modelProb": safe_round(x["modelProb"], 3),
                    "ruleScore": safe_round(x["ruleScore"], 3),
                }
                for x in scored_candidates[:5]
            ]
        }
        
        logger.info(f"\n✓ Crop block prepared for response")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 5: FERTILIZER PREDICTION (ML MODEL)
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 5] FERTILIZER PREDICTION (ML MODEL)")
        logger.info("-" * 100)
        
        try:
            fert_label, fert_model_conf, fert_top_k_model = self.predict_fertilizer(features_df)
            is_fert_low = fert_model_conf < LOW_CONF_FERT
            
            logger.info(f"\n✓ Fertilizer prediction complete")
            logger.info(f"  • Best Prediction: {fert_label}")
            logger.info(f"  • Model Confidence: {fert_model_conf:.4f} ({fert_model_conf*100:.2f}%)")
            logger.info(f"  • Low Confidence Flag: {'YES ⚠️' if is_fert_low else 'NO ✓'}")
            logger.info(f"  • Threshold: {LOW_CONF_FERT} ({LOW_CONF_FERT*100:.0f}%)")
            
            logger.info(f"\n  Top-5 Model Predictions:")
            for rank, item in enumerate(fert_top_k_model, 1):
                logger.info(f"    {rank}. {item['label']:30s} → {item['prob']:.4f} ({item['prob']*100:6.2f}%)")
                
        except Exception as e:
            logger.error(f"✗ Fertilizer prediction failed: {str(e)}", exc_info=True)
            raise
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 6: FERTILIZER RULE-BASED DECISION
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 6] FERTILIZER RULE-BASED DECISION")
        logger.info("-" * 100)
        
        final_fert = fert_label
        rule_fert = self._fertilizer_rule_pick(features)
        
        logger.info(f"  Nutrient Analysis:")
        n = float(features.get("Nitrogen", 100))
        p = float(features.get("Phosphorous", 50))
        k = float(features.get("Potassium", 100))
        
        logger.info(f"    • Nitrogen (N): {n:.1f} ppm → {'DEFICIENT ⚠️' if n < 80 else 'ADEQUATE ✓'} (threshold: 80)")
        logger.info(f"    • Phosphorus (P): {p:.1f} ppm → {'DEFICIENT ⚠️' if p < 40 else 'ADEQUATE ✓'} (threshold: 40)")
        logger.info(f"    • Potassium (K): {k:.1f} ppm → {'DEFICIENT ⚠️' if k < 80 else 'ADEQUATE ✓'} (threshold: 80)")
        
        logger.info(f"\n  Rule-Based Recommendation:")
        logger.info(f"    • Rule suggests: {rule_fert}")
        logger.info(f"    • Model suggests: {fert_label}")
        logger.info(f"    • Match: {'YES ✓' if rule_fert == fert_label else 'NO ⚠️'}")
        
        if is_fert_low:
            logger.info(f"\n  ⚠️  LOW CONFIDENCE MODE ACTIVE")
            logger.info(f"    • Model confidence ({fert_model_conf*100:.1f}%) < threshold ({LOW_CONF_FERT*100:.0f}%)")
            
            if rule_fert != fert_label:
                logger.warning(f"    • Model and rules disagree - Using rule recommendation")
                warnings.append({
                    "type": "LOW_FERTILIZER_CONFIDENCE",
                    "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Nutrient-rule suggests {rule_fert}."
                })
                final_fert = rule_fert
            else:
                logger.info(f"    • Model and rules agree - Keeping model recommendation")
                warnings.append({
                    "type": "LOW_FERTILIZER_CONFIDENCE",
                    "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Recommendation kept but treat as low certainty."
                })
        else:
            logger.info(f"\n  ✓ HIGH CONFIDENCE MODE")
            logger.info(f"    • Model confidence ({fert_model_conf*100:.1f}%) ≥ threshold ({LOW_CONF_FERT*100:.0f}%)")
            logger.info(f"    • Using model recommendation: {final_fert}")
        
        logger.info(f"\n  Final Fertilizer: {final_fert}")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 7: FERTILIZER METADATA (NO LAND SIZE)
        # ═══════════════════════════════════════════════════════════════════════════════
        fert_meta = self.get_fertilizer_metadata(final_fert)

        logger.info(f"  Fertilizer: {final_fert}")
        logger.info(f"  Components: {', '.join(fert_meta['components'])}")
        logger.info(f"  Base Rate: {fert_meta['baseRatePerAcre']} kg/acre")
        logger.info(f"  Price: LKR {fert_meta['pricePerKg']} per kg")

        # Fertilizer suitability
        fert_rule_ok = 1.0 if final_fert == rule_fert else 0.6
        fert_suitability = self._hybrid_suitability(fert_model_conf, fert_rule_ok, is_fert_low)
        
        logger.info(f"\n  Suitability Calculation:")
        logger.info(f"    • Model Confidence: {fert_model_conf:.4f}")
        logger.info(f"    • Rule Alignment: {fert_rule_ok:.4f} ({'Perfect' if fert_rule_ok == 1.0 else 'Partial'})")
        logger.info(f"    • Final Suitability: {fert_suitability:.4f} ({fert_suitability*100:.2f}%)")
        
        # Build fertilizer block
        fertilizer_block = {
            'label': final_fert,
            'confidence': safe_round(fert_suitability, 2),
            'modelConfidence': safe_round(fert_model_conf, 3),
            'suitabilityScore': safe_round(fert_suitability, 2),
            'type': final_fert,
            'components': fert_meta['components'],
            'baseRatePerAcre': fert_meta['baseRatePerAcre'],
            'pricePerKg': fert_meta['pricePerKg'],
            'costUnit': fert_meta['costUnit'],
            'environmentalImpact': fert_meta['environmentalImpact'],
            'applicationSchedule': fert_meta['applicationSchedule'],
            'top_k': [
                {"label": x["label"], "prob": safe_round(float(x["prob"]), 3)}
                for x in fert_top_k_model[:5]
            ]
        }
        
        logger.info(f"\n✓ Fertilizer block prepared for response")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 8: REMARK RETRIEVAL
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 8] REMARK RETRIEVAL")
        logger.info("-" * 100)
        
        remark = self.remark_map.get(final_fert, "")
        logger.info(f"  Fertilizer Type: {final_fert}")
        logger.info(f"  Associated Remark: {remark if remark else '(No specific remark available)'}")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 9: INSIGHTS GENERATION
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 9] INSIGHTS GENERATION")
        logger.info("-" * 100)
        
        feature_importance = self.generate_feature_importance(features_df)
        logger.info(f"  Generated {len(feature_importance)} feature importance items")
        for item in feature_importance:
            logger.info(f"    • {item['feature']:25s}: {item['impact']:.2f} - {item['explanation']}")
        
        risk_factors = self.generate_risk_factors(features_df)
        logger.info(f"\n  Identified {len(risk_factors)} risk factors:")
        for item in risk_factors:
            logger.info(f"    • Risk: {item['factor']}")
            logger.info(f"      Mitigation: {item['mitigation']}")
        
        alternative_crops = self.generate_alternative_crops(crop_block["top_k"])
        logger.info(f"\n  Generated {len(alternative_crops)} alternative crops:")
        for item in alternative_crops:
            logger.info(f"    • {item['crop']:25s}: {item['confidence']:3d}% confidence - {item['reason']}")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # PHASE 10: RESPONSE ASSEMBLY
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n[PHASE 10] RESPONSE ASSEMBLY")
        logger.info("-" * 100)
        
        response = {
            'success': True,
            'crop': crop_block,
            'fertilizer': fertilizer_block,
            'remark': remark,
            'featureImportance': feature_importance,
            'riskFactors': risk_factors,
            'alternativeCrops': alternative_crops,
            'warnings': warnings,
            'meta': {
                'model_version': self.metadata.get('model_version', 'unknown'),
                'timestamp': get_timestamp()
            }
        }
        
        logger.info(f"✓ Response assembled successfully")
        logger.info(f"  • Warnings/Alerts: {len(warnings)}")
        if warnings:
            for warning in warnings:
                logger.warning(f"    - [{warning['type']}] {warning['message']}")
        
        logger.info(f"  • Feature Importance Items: {len(feature_importance)}")
        logger.info(f"  • Risk Factors: {len(risk_factors)}")
        logger.info(f"  • Alternative Crops: {len(alternative_crops)}")
        
        # ═══════════════════════════════════════════════════════════════════════════════
        # FINAL SUMMARY
        # ═══════════════════════════════════════════════════════════════════════════════
        logger.info("\n" + "=" * 100)
        logger.info("█" * 100)
        logger.info("PREDICTION COMPLETE - SUMMARY")
        logger.info("█" * 100)
        logger.info("=" * 100)
        
        logger.info(f"\n📊 FINAL RECOMMENDATIONS:")
        logger.info(f"\n  🌾 CROP RECOMMENDATION")
        logger.info(f"     Crop: {crop_block['label']}")
        logger.info(f"     Suitability: {crop_block['confidence']*100:.1f}%")
        logger.info(f"     Model Confidence: {crop_block['modelConfidence']*100:.1f}%")
        logger.info(f"     Expected Yield: {crop_block['expectedYieldMin']}-{crop_block['expectedYieldMax']} {crop_block['yieldUnit']}")
        
        logger.info(f"\n  🧪 FERTILIZER RECOMMENDATION")
        logger.info(f"     Fertilizer: {fertilizer_block['label']}")
        logger.info(f"     Suitability: {fertilizer_block['confidence']*100:.1f}%")
        logger.info(f"     Components: {', '.join(fertilizer_block['components'])}")
        logger.info(f"     Quantity: {fertilizer_block['baseRatePerAcre']} kg/acre")
        logger.info(f"     Cost: LKR {fertilizer_block['pricePerKg']} per kg")
        
        logger.info(f"\n  ⚙️  METADATA")
        logger.info(f"     Timestamp: {response['meta']['timestamp']}")
        logger.info(f"     Model Version: {response['meta']['model_version']}")
        
        logger.info("\n" + "=" * 100)
        logger.info("█" * 100)
        logger.info("END OF PREDICTION")
        logger.info("█" * 100)
        logger.info("=" * 100 + "\n")
        
        return response


# Global predictor instance
predictor = Predictor()
