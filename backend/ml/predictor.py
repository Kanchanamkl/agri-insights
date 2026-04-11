import joblib
import json
import os
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

from config import config
from ml.feature_mapper import FeatureMapper, PredictionRequest
from utils.helpers import get_logger, get_timestamp, safe_round

logger = get_logger(__name__)

# ── Thresholds ─────────────────────────────────────────────────────────────────
LOW_CONF_CROP          = 0.35
LOW_CONF_FERT          = 0.40
STRONG_RULE_ADVANTAGE  = 0.15
TOP_N_SHAP_FEATURES    = 4

ARTIFACTS_DIR      = Path(__file__).resolve().parent / "artifacts"
CROP_RULES_PATH    = ARTIFACTS_DIR / "crop_rules.json"
CROP_METADATA_PATH = ARTIFACTS_DIR / "crop_metadata.json"
FERT_METADATA_PATH = ARTIFACTS_DIR / "fertilizer_metadata.json"


# ── Feature display labels (post-OHE name → human label + unit) ───────────────
_DISPLAY_MAP = {
    "Temperature":       ("temperature",       "°C"),
    "Rainfall":          ("rainfall",          "mm"),
    "Humidity":          ("humidity",          "%"),
    "Rain_Temp_Balance": ("rain/temp balance", ""),
    "Moisture":          ("soil moisture",     ""),
    "PH":                ("soil pH",           ""),
    "PH_Stress":         ("pH stress",         ""),
    "Carbon":            ("organic carbon",    "%"),
    "Nitrogen":          ("nitrogen",          "mg/kg"),
    "Phosphorous":       ("phosphorus",        "mg/kg"),
    "Potassium":         ("potassium",         "mg/kg"),
    "NPK_Sum":           ("total NPK",         "mg/kg"),
}

def _feat_display(fname: str) -> Tuple[str, str]:
    if fname in _DISPLAY_MAP:
        return _DISPLAY_MAP[fname]
    if fname.startswith("Soil_"):
        return fname[5:].lower() + " soil type", ""
    return fname.lower().replace("_", " "), ""


class Predictor:
    def __init__(self):
        self.crop_model        = None
        self.fertilizer_model  = None
        self.crop_explainer    = None
        self.fert_explainer    = None
        self.crop_feature_names: List[str] = []   # post-OHE, 17 entries
        self.fert_feature_names: List[str] = []   # post-OHE, 13 entries
        self.remark_map        = {}
        self.metadata          = {}
        self.crop_rules        = {}
        self.crop_metadata     = {}
        self.fert_metadata     = {}
        self.models_loaded     = False
        self.explainers_loaded = False

    # ── Utilities ──────────────────────────────────────────────────────────────
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
        rules = self.crop_rules.get(crop_name)
        if not rules:
            return 0.5
        ph   = float(features.get("PH",          7.0))
        rain = float(features.get("Rainfall",    150))
        temp = float(features.get("Temperature",  28))
        moist = float(features.get("Moisture",   60))
        hum  = float(features.get("Humidity",    60))
        s1 = self._in_range_score(ph,    *rules.get("ph",          (0, 14)))
        s2 = self._in_range_score(rain,  *rules.get("rainfall",    (0, 500)))
        s3 = self._in_range_score(temp,  *rules.get("temperature", (0, 50)))
        s4 = self._in_range_score(moist, *rules.get("moisture",    (0, 100)))
        s5 = self._in_range_score(hum,   *rules.get("humidity",    (0, 100)))
        return (s1 + s2 + s3 + s4 + s5) / 5.0

    def _fertilizer_rule_pick(self, features: Dict[str, Any]) -> str:
        n = float(features.get("Nitrogen",    100))
        p = float(features.get("Phosphorous",  50))
        k = float(features.get("Potassium",   100))
        if n < 80: return "Urea"
        if p < 40: return "DAP"
        if k < 80: return "MOP"
        return "General Purpose Fertilizer"

    def _hybrid_suitability(self, model_prob: float, rule_score: float,
                             is_low_conf: bool) -> float:
        w_model, w_rule = (0.30, 0.70) if is_low_conf else (0.70, 0.30)
        return float(w_model * model_prob + w_rule * rule_score)

    # ── SHAP helpers ───────────────────────────────────────────────────────────
    @staticmethod
    def _normalise_shap(sv, n_features: int, n_classes: int) -> np.ndarray:
        """
        Normalise shap_values() output → (C, N, F) regardless of shap version.

        Formats handled
        ---------------
        list of C arrays each (N, F)   — old shap API
        ndarray (N, F, C)              — shap >= 0.42
        ndarray (C, N, F)              — some intermediate builds
        ndarray (N, F)                 — binary classifier
        """
        if isinstance(sv, list):
            arr = np.array(sv)                            # (C, N, F)
        else:
            arr = np.asarray(sv)
            if arr.ndim == 3:
                if arr.shape[1] == n_features:            # (N, F, C)
                    arr = np.transpose(arr, (2, 0, 1))    # → (C, N, F)
                elif arr.shape[0] == n_classes:           # already (C, N, F)
                    pass
                else:
                    raise ValueError(
                        f"Cannot interpret SHAP array shape {arr.shape} "
                        f"for n_features={n_features}, n_classes={n_classes}"
                    )
            elif arr.ndim == 2:                           # binary (N, F)
                arr = arr[np.newaxis, :, :]               # → (1, N, F)
            else:
                raise ValueError(
                    f"Unexpected SHAP ndim={arr.ndim}, shape={arr.shape}"
                )
        return arr  # (C, N, F)

    def _shap_for_instance(self, explainer, X_tf_1row: np.ndarray,
                           n_features: int, n_classes: int,
                           class_idx: int) -> np.ndarray:
        """Return SHAP values shape (n_features,) for one instance + one class."""
        sv  = explainer.shap_values(X_tf_1row)
        arr = self._normalise_shap(sv, n_features, n_classes)  # (C, 1, F)
        return arr[class_idx, 0, :]                             # (F,)

    def _build_explanation(self, predicted_label: str, shap_vals: np.ndarray,
                           feature_names: List[str], raw_input: dict,
                           confidence: float, model_type: str,
                           top_n: int = TOP_N_SHAP_FEATURES
                           ) -> Tuple[str, List[Dict]]:
        """
        Build a natural-language explanation + structured top_features list
        from per-instance SHAP values for the predicted class.
        """
        abs_vals   = np.abs(shap_vals)
        ranked_idx = np.argsort(abs_vals)[::-1][:top_n]

        positives, negatives, top_features = [], [], []

        for idx in ranked_idx:
            fname      = feature_names[idx]
            sval       = float(shap_vals[idx])
            label, unit = _feat_display(fname)

            if fname.startswith("Soil_"):
                val_str = f"({raw_input.get('Soil', '')})"
            else:
                orig = raw_input.get(fname)
                if orig is not None:
                    val_str = (f"({orig:.1f} {unit})".strip()
                               if unit else f"({orig:.2f})")
                else:
                    val_str = ""

            phrase = f"{label} {val_str}".strip()
            top_features.append({
                "feature":    fname,
                "label":      label,
                "shap_value": round(sval, 5),
                "direction":  "positive" if sval > 0 else "negative",
                "display":    phrase,
            })
            (positives if sval > 0 else negatives).append(phrase)

        noun = "crop" if model_type == "crop" else "fertilizer"
        parts = []
        if positives:
            parts.append(
                f"primarily driven by {' and '.join(positives[:2])}, "
                "which support this recommendation"
            )
        if negatives:
            parts.append(
                f"partially counteracted by {' and '.join(negatives[:2])}"
            )

        body = "; ".join(parts) if parts else \
            "based on a combination of soil and environmental factors"
        sentence = f"The {noun} recommendation ({predicted_label}) is {body}."

        if confidence < LOW_CONF_CROP:
            sentence += (
                f" Note: model confidence is low ({confidence:.0%}) — "
                "additional soil testing is recommended."
            )
        return sentence, top_features

    # ── Artifact loading ───────────────────────────────────────────────────────
    def _load_json(self, path: Path, default: Any = None) -> Any:
        try:
            with open(path) as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Artifact not found: {path}")
            return default if default is not None else {}
        except Exception as e:
            logger.error(f"Failed to load {path}: {e}")
            return default if default is not None else {}

    def load_models(self) -> bool:
        try:
            logger.info("Checking required model artifacts ...")    
            required = {
                "crop_model":       config.CROP_MODEL_PATH,
                "fert_model":       config.FERTILIZER_MODEL_PATH,
                "remark_map":       config.REMARK_MAP_PATH,
            }
            missing = [k for k, p in required.items() if not os.path.exists(p)]
            if missing:
                logger.error(f"Missing required artifacts: {missing}")
                self.models_loaded = False
                return False

            logger.info("Loading model pipelines ...")
            self.crop_model       = joblib.load(config.CROP_MODEL_PATH)
            self.fertilizer_model = joblib.load(config.FERTILIZER_MODEL_PATH)
            self.remark_map       = joblib.load(config.REMARK_MAP_PATH)
            self.metadata         = self._load_json(Path(config.METADATA_PATH), {})

            # ── Load SHAP explainers (optional — graceful degradation) ──────
            for attr, path_attr, label in [
                ("crop_explainer",    "CROP_EXPLAINER_PATH",    "crop"),
                ("fert_explainer",    "FERT_EXPLAINER_PATH",    "fert"),
                ("crop_feature_names","CROP_FEATURE_NAMES_PATH","crop_feature_names"),
                ("fert_feature_names","FERT_FEATURE_NAMES_PATH","fert_feature_names"),
            ]:
                path = Path(getattr(config, path_attr, ""))
                if path.exists():
                    setattr(self, attr, joblib.load(path))
                    logger.info(f"✓ Loaded {label}: {path.name}")
                else:
                    # Fall back to reading from metadata.json
                    if attr == "crop_feature_names":
                        setattr(self, attr,
                                self.metadata.get("crop_post_ohe_feature_names", []))
                    elif attr == "fert_feature_names":
                        setattr(self, attr,
                                self.metadata.get("fert_post_ohe_feature_names", []))
                    else:
                        logger.warning(
                            f"SHAP explainer not found at {path} — "
                            "SHAP explanations will be unavailable."
                        )

            self.explainers_loaded = (
                self.crop_explainer is not None and
                self.fert_explainer is not None and
                len(self.crop_feature_names) > 0 and
                len(self.fert_feature_names) > 0
            )

            # ── Optional JSON metadata ──────────────────────────────────────
            self.crop_rules    = self._load_json(CROP_RULES_PATH,    {})
            self.crop_metadata = self._load_json(CROP_METADATA_PATH, {})
            self.fert_metadata = self._load_json(FERT_METADATA_PATH, {})

            self.models_loaded = True
            logger.info(
                f"Models loaded successfully  "
                f"(version: {self.metadata.get('model_version', 'unknown')}  "
                f"shap: {'yes' if self.explainers_loaded else 'no'})"
            )
            return True

        except Exception as e:
            logger.error(f"Error loading models: {e}", exc_info=True)
            self.models_loaded = False
            return False

    # ── Model prediction methods ───────────────────────────────────────────────
    def predict_crop(self, crop_df) -> Tuple[str, float, List[Dict]]:
        proba   = self._safe_predict_proba(self.crop_model, crop_df)
        classes = self._get_classes(self.crop_model)
        top_idx = int(np.argmax(proba))
        top_k   = [{"label": str(classes[i]), "prob": float(proba[i])}
                   for i in np.argsort(proba)[::-1][:5]]
        logger.info(f"CROP: '{classes[top_idx]}' conf={proba[top_idx]:.4f}")
        return str(classes[top_idx]), float(proba[top_idx]), top_k

    def predict_fertilizer(self, fert_df) -> Tuple[str, float, List[Dict]]:
        proba   = self._safe_predict_proba(self.fertilizer_model, fert_df)
        classes = self._get_classes(self.fertilizer_model)
        top_idx = int(np.argmax(proba))
        top_k   = [{"label": str(classes[i]), "prob": float(proba[i])}
                   for i in np.argsort(proba)[::-1][:5]]
        logger.info(f"FERT: '{classes[top_idx]}' conf={proba[top_idx]:.4f}")
        return str(classes[top_idx]), float(proba[top_idx]), top_k

    # ── Metadata helpers ───────────────────────────────────────────────────────
    def get_crop_metadata(self, crop: str) -> Dict:
        default = {
            "icon": "🌱",
            "expectedYieldMin": 1000, "expectedYieldMax": 2000,
            "yieldUnit": "kg/acre",   "marketPriceTrend": "stable",
            "growingSeasonStart": "Season-dependent",
            "growingSeasonEnd":   "Season-dependent",
        }
        meta = dict(self.crop_metadata.get(crop, {}))
        for k, v in default.items():
            meta.setdefault(k, v)
        return meta

    def get_fertilizer_metadata(self, fertilizer: str) -> Dict:
        default = {
            "components":        ["Balanced nutrients"],
            "baseRatePerAcre":   100,
            "pricePerKg":        80,
            "environmentalImpact": "moderate",
            "costUnit":          "LKR",
            "applicationSchedule": self.generate_application_schedule(),
        }
        meta = dict(self.fert_metadata.get(fertilizer, {}))
        for k, v in default.items():
            meta.setdefault(k, v)
        return meta

    def generate_application_schedule(self) -> List[Dict]:
        return []

    # ── Heuristic insight generators (fallback when SHAP not available) ────────
    def generate_feature_importance(self, raw_input: dict) -> List[Dict]:
        """
        If SHAP explainers are loaded this is NOT called (predict() uses real SHAP).
        This is a heuristic fallback used only when explainers are missing.
        """
        ph       = float(raw_input.get("PH",       7.0))
        nitrogen = float(raw_input.get("Nitrogen", 100))
        soil     = str(raw_input.get("Soil",       ""))

        ph_score = 1.0 if 6.0 <= ph <= 7.5 else 0.4
        n_score  = 1.0 if nitrogen >= 80     else 0.4

        importance = [
            {
                "feature": "Soil pH",
                "impact":  safe_round(ph_score, 2),
                "explanation": (
                    f"pH {ph:.1f} is "
                    f"{'optimal' if 6.0 <= ph <= 7.5 else 'suboptimal'} "
                    "for nutrient availability"
                ),
            },
            {
                "feature": "Nitrogen",
                "impact":  safe_round(n_score, 2),
                "explanation": (
                    f"Nitrogen level ({nitrogen:.0f}) is "
                    f"{'adequate' if nitrogen >= 80 else 'low'}"
                ),
            },
            {
                "feature": "Soil Type",
                "impact":  0.75,
                "explanation": (
                    f"{soil} generally provides "
                    f"{'good' if 'Loamy' in soil else 'moderate'} "
                    "nutrient retention"
                ),
            },
        ]
        return sorted(importance, key=lambda x: x["impact"], reverse=True)

    def generate_risk_factors(self, raw_input: dict) -> List[Dict]:
        return []

    def generate_alternative_crops(self, top_k: List[Dict]) -> List[Dict]:
        alternatives = []
        for item in top_k[1:4]:
            pct = int(float(item["prob"]) * 100)
            alternatives.append({
                "crop":       item["label"],
                "confidence": pct,
                "reason":     f"Good alternative based on current conditions ({pct}% match)",
            })
        return alternatives

    # ── Main predict ───────────────────────────────────────────────────────────
    def predict(self, request: PredictionRequest) -> Dict[str, Any]:
        print("\n🧠 [ML FLOW] Starting Prediction Logic...", flush=True)
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Run ml/train.py first.")

        # ── Feature extraction (separate DFs per model) ────────────────────
        crop_df    = FeatureMapper.extract_crop_features(request)
        fert_df    = FeatureMapper.extract_fert_features(request)
        raw_input  = FeatureMapper.extract_raw_dict(request)
        features   = raw_input   # alias for rule helpers
        print(f"   [ML] Inputs extracted: {raw_input}", flush=True)

        warnings: List[Dict[str, str]] = []

        # ── Crop ML prediction ─────────────────────────────────────────────
        print("   [ML] Executing Crop model...", flush=True)
        crop_label, crop_model_conf, crop_top_k_model = self.predict_crop(crop_df)
        print(f"   [ML] Model suggests: {crop_label} ({crop_model_conf*100:.1f}%)", flush=True)
        is_crop_low = crop_model_conf < LOW_CONF_CROP

        # ── Crop rule scoring + hybrid ─────────────────────────────────────
        print("   [ML] Calculating hybrid suitability scores...", flush=True)
        scored = []
        for item in crop_top_k_model:
            rule_score = self._rule_crop_score(item["label"], features)
            hybrid     = self._hybrid_suitability(
                float(item["prob"]), rule_score, is_crop_low
            )
            scored.append({
                "label":     item["label"],
                "modelProb": float(item["prob"]),
                "ruleScore": float(rule_score),
                "prob":      float(hybrid),
            })
        scored.sort(key=lambda x: x["prob"], reverse=True)
        final_crop       = scored[0]["label"]
        final_suitability = scored[0]["prob"]
        print(f"   [ML] Final Crop Winner: {final_crop} (Suitability: {final_suitability*100:.1f}%)", flush=True)

        # ── Crop SHAP explanation ──────────────────────────────────────────
        crop_explanation  = None
        crop_top_features = []
        crop_shap_available = False

        if self.explainers_loaded:
            try:
                n_crop_feat = len(self.crop_feature_names)
                n_crop_cls  = len(self._get_classes(self.crop_model))
                crop_idx    = list(self._get_classes(self.crop_model)).index(final_crop)

                X_crop_tf   = self.crop_model.named_steps["preprocessor"].transform(crop_df)
                crop_shap_v = self._shap_for_instance(
                    self.crop_explainer, X_crop_tf, n_crop_feat, n_crop_cls, crop_idx
                )
                crop_explanation, crop_top_features = self._build_explanation(
                    final_crop, crop_shap_v, self.crop_feature_names,
                    raw_input, crop_model_conf, "crop"
                )
                crop_shap_available = True
            except Exception as exc:
                logger.warning(f"Crop SHAP failed: {exc}")

        # ── Crop metadata block ────────────────────────────────────────────
        crop_meta  = self.get_crop_metadata(final_crop)
        crop_block = {
            "label":            final_crop,
            "confidence":       safe_round(final_suitability, 2),
            "modelConfidence":  safe_round(crop_model_conf, 3),
            "suitabilityScore": safe_round(final_suitability, 2),
            "icon":             crop_meta["icon"],
            "expectedYieldMin": crop_meta["expectedYieldMin"],
            "expectedYieldMax": crop_meta["expectedYieldMax"],
            "yieldUnit":        crop_meta["yieldUnit"],
            "marketPriceTrend": crop_meta["marketPriceTrend"],
            "growingSeasonStart": crop_meta["growingSeasonStart"],
            "growingSeasonEnd":   crop_meta["growingSeasonEnd"],
            "explanation":      crop_explanation,
            "topFeatures":      crop_top_features,
            "top_k": [
                {
                    "label":     x["label"],
                    "prob":      safe_round(x["prob"], 3),
                    "modelProb": safe_round(x["modelProb"], 3),
                    "ruleScore": safe_round(x["ruleScore"], 3),
                }
                for x in scored[:5]
            ],
        }

        # ── Fertilizer ML prediction ───────────────────────────────────────
        print("   [ML] Executing Fertilizer model...", flush=True)
        fert_label, fert_model_conf, fert_top_k_model = self.predict_fertilizer(fert_df)
        print(f"   [ML] Model suggests: {fert_label} ({fert_model_conf*100:.1f}%)", flush=True)
        is_fert_low = fert_model_conf < LOW_CONF_FERT

        # ── Fertilizer rule override ───────────────────────────────────────
        final_fert = fert_label
        rule_fert  = self._fertilizer_rule_pick(features)
        if is_fert_low and rule_fert != fert_label:
            final_fert = rule_fert
            warnings.append({
                "type": "LOW_FERTILIZER_CONFIDENCE",
                "message": (
                    f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). "
                    f"Using rule-based recommendation: {rule_fert}."
                ),
            })
        elif is_fert_low:
            warnings.append({
                "type": "LOW_FERTILIZER_CONFIDENCE",
                "message": (
                    f"Low fertilizer model confidence ({int(fert_model_conf*100)}%). "
                    "Recommendation may be less reliable."
                ),
            })

        # ── Fertilizer SHAP explanation ────────────────────────────────────
        fert_explanation  = None
        fert_top_features = []

        if self.explainers_loaded:
            try:
                n_fert_feat = len(self.fert_feature_names)
                n_fert_cls  = len(self._get_classes(self.fertilizer_model))
                fert_idx    = list(self._get_classes(self.fertilizer_model)).index(final_fert)

                X_fert_tf   = self.fertilizer_model.named_steps["preprocessor"].transform(fert_df)
                fert_shap_v = self._shap_for_instance(
                    self.fert_explainer, X_fert_tf, n_fert_feat, n_fert_cls, fert_idx
                )
                fert_explanation, fert_top_features = self._build_explanation(
                    final_fert, fert_shap_v, self.fert_feature_names,
                    raw_input, fert_model_conf, "fertilizer"
                )
            except Exception as exc:
                logger.warning(f"Fert SHAP failed: {exc}")

        # ── Fertilizer metadata block ──────────────────────────────────────
        fert_meta       = self.get_fertilizer_metadata(final_fert)
        fert_rule_ok    = 1.0 if final_fert == rule_fert else 0.6
        fert_suitability = self._hybrid_suitability(fert_model_conf, fert_rule_ok, is_fert_low)

        fertilizer_block = {
            "label":             final_fert,
            "confidence":        safe_round(fert_suitability, 2),
            "modelConfidence":   safe_round(fert_model_conf, 3),
            "suitabilityScore":  safe_round(fert_suitability, 2),
            "type":              final_fert,
            "components":        fert_meta["components"],
            "baseRatePerAcre":   fert_meta["baseRatePerAcre"],
            "pricePerKg":        fert_meta["pricePerKg"],
            "costUnit":          fert_meta["costUnit"],
            "environmentalImpact": fert_meta["environmentalImpact"],
            "applicationSchedule": fert_meta["applicationSchedule"],
            "explanation":       fert_explanation,
            "topFeatures":       fert_top_features,
            "top_k": [
                {"label": x["label"], "prob": safe_round(float(x["prob"]), 3)}
                for x in fert_top_k_model[:5]
            ],
        }

        # ── Insights (use SHAP top features when available, else heuristic) ─
        if crop_shap_available and crop_top_features:
            feature_importance = [
                {
                    "feature":     tf["label"],
                    "impact":      round(abs(tf["shap_value"]) * 10, 2),
                    "explanation": (
                        f"{tf['display']} "
                        f"{'increases' if tf['direction'] == 'positive' else 'decreases'} "
                        "prediction confidence"
                    ),
                }
                for tf in crop_top_features
            ]
        else:
            feature_importance = self.generate_feature_importance(raw_input)

        remark        = ""
        risk_factors  = self.generate_risk_factors(raw_input)
        alt_crops     = self.generate_alternative_crops(crop_block["top_k"])

        return {
            "success":           True,
            "crop":              crop_block,
            "fertilizer":        fertilizer_block,
            "remark":            remark,
            "soil":              raw_input.get("Soil", "General"),
            "featureImportance": feature_importance,
            "riskFactors":       risk_factors,
            "alternativeCrops":  alt_crops,
            "warnings":          warnings,
            "meta": {
                "model_version":     self.metadata.get("model_version", "unknown"),
                "shap_available":    self.explainers_loaded,
                "timestamp":         get_timestamp(),
            },
        }


# ── Global instance ────────────────────────────────────────────────────────────
predictor = Predictor()

import logging as _logging
_logger2 = _logging.getLogger(__name__)


def _check_sklearn_compat(required_version: str, *, enforce: bool, warn_only: bool):
    try:
        import sklearn
        installed = getattr(sklearn, "__version__", "unknown")
    except Exception as e:
        msg = f"Unable to import scikit-learn to verify version: {e}"
        if enforce and not warn_only:
            raise RuntimeError(msg) from e
        _logger2.warning(msg)
        return

    if installed != required_version:
        msg = (
            f"scikit-learn version mismatch: installed={installed} "
            f"required={required_version}. Models saved with a different "
            "sklearn version can fail to load."
        )
        if enforce and not warn_only:
            raise RuntimeError(msg)
        _logger2.warning(msg)


def load_models():
    from config import config
    _check_sklearn_compat(
        config.REQUIRED_SKLEARN_VERSION,
        enforce=getattr(config, "ENFORCE_SKLEARN_VERSION", True),
        warn_only=getattr(config, "SKLEARN_VERSION_WARN_ONLY", False),
    )
    predictor.load_models()