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
STRONG_RULE_ADVANTAGE = 0.15

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
CROP_MODEL_PATH = ARTIFACTS_DIR / "crop_model.joblib"
FERT_MODEL_PATH = ARTIFACTS_DIR / "fert_model.joblib"
REMARK_MAP_PATH = ARTIFACTS_DIR / "remark_map.joblib"
CROP_RULES_PATH = ARTIFACTS_DIR / "crop_rules.json"
CROP_METADATA_PATH = ARTIFACTS_DIR / "crop_metadata.json"
FERT_METADATA_PATH = ARTIFACTS_DIR / "fertilizer_metadata.json"


class Predictor:
    def __init__(self):
        self.crop_model = None
        self.fertilizer_model = None
        self.remark_map = None
        self.metadata = None          # general metadata (sklearn version, etc.)
        self.crop_rules = {}          # loaded from crop_rules.json
        self.crop_metadata = {}       # loaded from crop_metadata.json
        self.fert_metadata = {}        # loaded from fertilizer_metadata.json
        self.models_loaded = False

    # ---------------------------
    # Utilities
    # ---------------------------
    def _get_classes(self, model):
        if hasattr(model, "classes_"):
            return model.classes_
        if hasattr(model, "named_steps") and "classifier" in model.named_steps:
            return model.named_steps["classifier"].classes_
        raise RuntimeError("Unable to access model classes_")

    def _safe_predict_proba(self, model, features_df):
        if hasattr(model, "predict_proba"):
            return model.predict_proba(features_df)[0]
        raise RuntimeError("Model does not support predict_proba")

    def _in_range_score(self, v: float, lo: float, hi: float) -> float:
        if lo <= v <= hi:
            return 1.0
        if v < lo:
            denom = lo if lo != 0 else 1.0
            return max(0.0, 1.0 - (lo - v) / denom)
        denom = hi if hi != 0 else 1.0
        return max(0.0, 1.0 - (v - hi) / denom)

    def _rule_crop_score(self, crop_name: str, features: Dict[str, Any]) -> float:
        """Use data‑derived rules if available; otherwise return neutral 0.5."""
        rules = self.crop_rules.get(crop_name)
        if not rules:
            logger.debug(f"No rules for crop '{crop_name}', using neutral score 0.5")
            return 0.5

        ph = float(features.get("PH", 7.0))
        rain = float(features.get("Rainfall", 150))
        temp = float(features.get("Temperature", 28))
        moist = float(features.get("Moisture", 60))
        hum = float(features.get("Humidity", 60))

        # rules contain per‑feature (min, max) tuples
        s1 = self._in_range_score(ph, *rules.get("ph", (0,14)))
        s2 = self._in_range_score(rain, *rules.get("rainfall", (0,500)))
        s3 = self._in_range_score(temp, *rules.get("temperature", (0,50)))
        s4 = self._in_range_score(moist, *rules.get("moisture", (0,100)))
        s5 = self._in_range_score(hum, *rules.get("humidity", (0,100)))

        return (s1 + s2 + s3 + s4 + s5) / 5.0

    def _fertilizer_rule_pick(self, features: Dict[str, Any]) -> str:
        """Simple nutrient‑deficiency rule (thresholds can be tuned)."""
        n = float(features.get("Nitrogen", 100))
        p = float(features.get("Phosphorous", 50))
        k = float(features.get("Potassium", 100))

        if n < 80:
            return "Urea"
        if p < 40:
            return "DAP"
        if k < 80:
            return "MOP"
        return "General Purpose Fertilizer"

    def _hybrid_suitability(self, model_prob: float, rule_score: float, is_low_conf: bool) -> float:
        if is_low_conf:
            w_model, w_rule = 0.30, 0.70
        else:
            w_model, w_rule = 0.70, 0.30
        return float((w_model * model_prob) + (w_rule * rule_score))

    # ---------------------------
    # Load models and JSON artifacts
    # ---------------------------
    def _load_json_artifact(self, path: Path, default: Any = None) -> Any:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Artifact not found: {path}")
            return default if default is not None else {}
        except Exception as e:
            logger.error(f"Failed to load {path}: {e}")
            return default if default is not None else {}

    def load_models(self):
        """Load trained models and all metadata."""
        try:
            paths = {
                "crop_model": config.CROP_MODEL_PATH,
                "fertilizer_model": config.FERTILIZER_MODEL_PATH,
                "remark_map": config.REMARK_MAP_PATH,
            }

            missing = [k for k, p in paths.items() if not os.path.exists(p)]
            if missing:
                logger.error(f"Missing model artifacts: {missing}")
                self.models_loaded = False
                return False

            logger.info("Loading models...")
            self.crop_model = joblib.load(config.CROP_MODEL_PATH)
            self.fertilizer_model = joblib.load(config.FERTILIZER_MODEL_PATH)
            self.remark_map = joblib.load(config.REMARK_MAP_PATH)

            with open(config.METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)

            # Load additional JSON artifacts
            self.crop_rules = self._load_json_artifact(CROP_RULES_PATH, {})
            self.crop_metadata = self._load_json_artifact(CROP_METADATA_PATH, {})
            self.fert_metadata = self._load_json_artifact(FERT_METADATA_PATH, {})

            self.models_loaded = True
            logger.info(f"Models loaded successfully (version: {self.metadata.get('model_version')})")
            return True

        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False

    # ---------------------------
    # Prediction methods (unchanged)
    # ---------------------------
    def predict_crop(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict crop with probabilities"""
        logger.info("=" * 80)
        logger.info("CROP : PREDICTION PROCESS")
        logger.info("=" * 80)

        proba = self._safe_predict_proba(self.crop_model, features_df)
        classes = self._get_classes(self.crop_model)
        top_idx = int(np.argmax(proba))
        crop_label = str(classes[top_idx])
        confidence = float(proba[top_idx])
        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [{'label': str(classes[i]), 'prob': float(proba[i])} for i in top_k_indices]

        logger.info(f"CROP : Best prediction: crop='{crop_label}', confidence={confidence:.4f}")
        logger.info(f"CROP : Top-5 predictions: {top_k}")
        return crop_label, confidence, top_k

    def predict_fertilizer(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict fertilizer recommendation with probabilities"""
        logger.info("=" * 80)
        logger.info("FERTILIZER PREDICTION PROCESS")
        logger.info("=" * 80)

        proba = self._safe_predict_proba(self.fertilizer_model, features_df)
        classes = self._get_classes(self.fertilizer_model)
        top_idx = int(np.argmax(proba))
        fert_label = str(classes[top_idx])
        confidence = float(proba[top_idx])
        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [{'label': str(classes[i]), 'prob': float(proba[i])} for i in top_k_indices]

        logger.info(f"FERTILIZER : Best prediction: {fert_label} (confidence: {confidence:.4f})")
        return fert_label, confidence, top_k

    # ---------------------------
    # Metadata retrieval with fallbacks
    # ---------------------------
    def get_crop_metadata(self, crop: str) -> Dict:
        """Return metadata for a crop; if missing, provide a sensible default."""
        default = {
            'icon': '🌱',
            'expectedYieldMin': 1000,
            'expectedYieldMax': 2000,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'Season-dependent',
            'growingSeasonEnd': 'Season-dependent'
        }
        meta = self.crop_metadata.get(crop, default)
        # Ensure all keys exist
        for k, v in default.items():
            meta.setdefault(k, v)
        return meta

    def get_fertilizer_metadata(self, fertilizer: str) -> Dict:
        """Return metadata for a fertilizer; if missing, provide a sensible default."""
        default = {
            'components': ['Balanced nutrients'],
            'baseRatePerAcre': 100,
            'pricePerKg': 80,
            'environmentalImpact': 'moderate',
            'costUnit': 'LKR',
            'applicationSchedule': self.generate_application_schedule()
        }
        meta = self.fert_metadata.get(fertilizer, default)
        # Ensure all keys exist
        for k, v in default.items():
            meta.setdefault(k, v)
        return meta

    def generate_application_schedule(self) -> List[Dict]:
        return [
            {'week': 1, 'action': 'Base application - Apply 50% of total fertilizer'},
            {'week': 4, 'action': 'First top dressing - Apply 25% of total fertilizer'},
            {'week': 8, 'action': 'Second top dressing - Apply remaining 25%'}
        ]

    # ---------------------------
    # Explanations (unchanged)
    # ---------------------------
    def generate_feature_importance(self, features_df) -> List[Dict]:
        ph = float(features_df['PH'].values[0])
        nitrogen = float(features_df['Nitrogen'].values[0])
        soil = str(features_df['Soil'].values[0])

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
    # Main predict method (unchanged logic, uses new metadata)
    # ---------------------------
    def predict(self, request: PredictionRequest) -> Dict[str, Any]:
        logger.info("=" * 100)
        logger.info("█" * 100)
        logger.info("STARTING COMPREHENSIVE PREDICTION")
        logger.info("█" * 100)
        logger.info("=" * 100)

        # PHASE 0: MODEL CHECK
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Please train models first.")

        logger.info("✓ Models loaded successfully")
        logger.info(f"  • Model Version: {self.metadata.get('model_version', 'unknown')}")
        logger.info(f"  • Crop Classes: {len(self.metadata.get('crop_classes', []))} types")
        logger.info(f"  • Fertilizer Classes: {len(self.metadata.get('fertilizer_classes', []))} types")

        # PHASE 1: FEATURE EXTRACTION
        try:
            features_df = FeatureMapper.extract_features(request)
            features = features_df.iloc[0].to_dict()
            logger.info("✓ Features extracted successfully")
            logger.info(f"  • DataFrame shape: {features_df.shape}")
        except Exception as e:
            logger.error(f"✗ Feature extraction failed: {str(e)}", exc_info=True)
            raise

        warnings: List[Dict[str, str]] = []

        # PHASE 2: CROP PREDICTION (ML)
        crop_label, crop_model_conf, crop_top_k_model = self.predict_crop(features_df)
        is_crop_low = crop_model_conf < LOW_CONF_CROP

        # PHASE 3: CROP RULE SCORING
        scored_candidates = []
        for item in crop_top_k_model:
            name = item["label"]
            rule_score = self._rule_crop_score(name, features)
            hybrid = self._hybrid_suitability(float(item["prob"]), rule_score, is_crop_low)
            scored_candidates.append({
                "label": name,
                "modelProb": float(item["prob"]),
                "ruleScore": float(rule_score),
                "prob": float(hybrid),
            })
        scored_candidates.sort(key=lambda x: x["prob"], reverse=True)
        final_crop = scored_candidates[0]["label"]
        final_suitability = scored_candidates[0]["prob"]

        # PHASE 4: CROP METADATA
        crop_meta = self.get_crop_metadata(final_crop)
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

        # PHASE 5: FERTILIZER PREDICTION (ML)
        fert_label, fert_model_conf, fert_top_k_model = self.predict_fertilizer(features_df)
        is_fert_low = fert_model_conf < LOW_CONF_FERT

        # PHASE 6: FERTILIZER RULE DECISION
        final_fert = fert_label
        rule_fert = self._fertilizer_rule_pick(features)
        if is_fert_low and rule_fert != fert_label:
            final_fert = rule_fert
            warnings.append({
                "type": "LOW_FERTILIZER_CONFIDENCE",
                "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Using rule‑based recommendation: {rule_fert}."
            })
        elif is_fert_low:
            warnings.append({
                "type": "LOW_FERTILIZER_CONFIDENCE",
                "message": f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). Recommendation may be less reliable."
            })

        # PHASE 7: FERTILIZER METADATA
        fert_meta = self.get_fertilizer_metadata(final_fert)
        fert_rule_ok = 1.0 if final_fert == rule_fert else 0.6
        fert_suitability = self._hybrid_suitability(fert_model_conf, fert_rule_ok, is_fert_low)

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
            'top_k': [{"label": x["label"], "prob": safe_round(float(x["prob"]), 3)} for x in fert_top_k_model[:5]]
        }

        # PHASE 8: REMARK
        remark = self.remark_map.get(final_fert, "")

        # PHASE 9: INSIGHTS
        feature_importance = self.generate_feature_importance(features_df)
        risk_factors = self.generate_risk_factors(features_df)
        alternative_crops = self.generate_alternative_crops(crop_block["top_k"])

        # PHASE 10: RESPONSE
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
        logger.info("✓ Response assembled successfully")
        return response


# Global predictor instance
predictor = Predictor()

import logging
logger = logging.getLogger(__name__)

def _check_sklearn_compat(required_version: str, *, enforce: bool, warn_only: bool):
    try:
        import sklearn
        installed = getattr(sklearn, "__version__", "unknown")
    except Exception as e:
        msg = f"Unable to import scikit-learn to verify version compatibility: {e}"
        if enforce and not warn_only:
            raise RuntimeError(msg) from e
        logger.warning(msg)
        return

    if installed != required_version:
        msg = (
            f"scikit-learn version mismatch: installed={installed} required={required_version}. "
            "Models serialized with a different sklearn version can fail to load."
        )
        if enforce and not warn_only:
            raise RuntimeError(msg)
        logger.warning(msg)

def load_models():
    from config import config
    _check_sklearn_compat(
        config.REQUIRED_SKLEARN_VERSION,
        enforce=getattr(config, "ENFORCE_SKLEARN_VERSION", True),
        warn_only=getattr(config, "SKLEARN_VERSION_WARN_ONLY", False),
    )
    predictor.load_models()