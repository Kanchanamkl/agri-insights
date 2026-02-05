from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import ValidationError
import json

from ml.predictor import predictor
from ml.feature_mapper import PredictionRequest, FeatureMapper
from db.database import db
from db.models import PredictionLog
from utils.helpers import get_logger, get_timestamp
from config import config

logger = get_logger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Global init flags
_initialized = False
db_available = False


def ensure_initialized():
    """Initialize models and database lazily (once)."""
    global _initialized, db_available

    if _initialized:
        return

    # Load models
    if not predictor.models_loaded:
        predictor.load_models()

    # Connect DB (non-fatal if fails)
    try:
        db_available = db.connect()
    except Exception as e:
        db_available = False
        logger.warning(f"Database not available: {e}")

    _initialized = True


@app.before_request
def before_request():
    ensure_initialized()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    model_version = None
    if predictor.models_loaded and predictor.metadata:
        model_version = predictor.metadata.get("model_version")

    return jsonify(
        {
            "status": "healthy" if predictor.models_loaded else "initializing",
            "models_loaded": predictor.models_loaded,
            "model_version": model_version,
            "database_available": db_available,
            "timestamp": get_timestamp(),
            "message": (
                "Run `python ml/train.py` to train models"
                if not predictor.models_loaded
                else "Ready"
            ),
        }
    ), (200 if predictor.models_loaded else 503)


@app.route("/predict", methods=["POST"])
def predict():
    """Combined crop and fertilizer prediction"""
    try:
        ensure_initialized()

        if not predictor.models_loaded:
            return jsonify(
                {
                    "success": False,
                    "error": "Models not loaded. Train first.",
                    "details": {"hint": "Run: python ml/train.py"},
                }
            ), 503

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        # ✅ Pydantic v2
        pred_request = PredictionRequest.model_validate(data)

        response = predictor.predict(pred_request)

        # DB logging is non-fatal
        if db_available:
            try:
                log_prediction(data, response, pred_request)
            except Exception as e:
                logger.error(f"Failed to log prediction: {e}", exc_info=True)

        return jsonify(response), 200

    except ValidationError as e:
        logger.warning(f"Validation error: {e}")
        return jsonify(
            {"success": False, "error": "Invalid request format", "details": e.errors()}
        ), 400

    except ValueError as e:
        logger.warning(f"Value error: {e}")
        return jsonify({"success": False, "error": str(e)}), 400

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return jsonify(
            {"success": False, "error": "Internal server error", "message": str(e)}
        ), 500


@app.route("/predict/crop", methods=["POST"])
def predict_crop_only():
    """Crop prediction only"""
    try:
        ensure_initialized()

        if not predictor.models_loaded:
            return jsonify({"success": False, "error": "Models not loaded"}), 503

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        pred_request = PredictionRequest.model_validate(data)

        features_df = FeatureMapper.extract_features(pred_request)
        crop_label, crop_conf, crop_top_k = predictor.predict_crop(features_df)
        crop_meta = predictor.get_crop_metadata(crop_label)

        response = {
            "success": True,
            "crop": {
                "label": crop_label,
                "confidence": round(crop_conf, 2),
                **crop_meta,
                # IMPORTANT: if your predictor returns raw probs, round here:
                "top_k": [{"label": x["label"], "prob": round(float(x["prob"]), 2)} for x in crop_top_k],
            },
            "meta": {
                "model_version": predictor.metadata.get("model_version") if predictor.metadata else None,
                "timestamp": get_timestamp(),
            },
        }

        return jsonify(response), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": "Invalid request format", "details": e.errors()}), 400

    except Exception as e:
        logger.error(f"Crop prediction error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/predict/fertilizer", methods=["POST"])
def predict_fertilizer_only():
    """Fertilizer prediction only"""
    try:
        ensure_initialized()

        if not predictor.models_loaded:
            return jsonify({"success": False, "error": "Models not loaded"}), 503

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "No JSON payload provided"}), 400

        pred_request = PredictionRequest.model_validate(data)

        features_df = FeatureMapper.extract_features(pred_request)
        fert_label, fert_conf, fert_top_k = predictor.predict_fertilizer(features_df)
        fert_meta = predictor.get_fertilizer_metadata(fert_label, pred_request.field.landSize)

        remark = predictor.remark_map.get(fert_label, "") if predictor.remark_map else ""

        response = {
            "success": True,
            "fertilizer": {
                "label": fert_label,
                "confidence": round(fert_conf, 2),
                "type": fert_label,
                **fert_meta,
                "top_k": [{"label": x["label"], "prob": round(float(x["prob"]), 2)} for x in fert_top_k],
            },
            "remark": remark,
            "meta": {
                "model_version": predictor.metadata.get("model_version") if predictor.metadata else None,
                "timestamp": get_timestamp(),
            },
        }

        return jsonify(response), 200

    except ValidationError as e:
        return jsonify({"success": False, "error": "Invalid request format", "details": e.errors()}), 400

    except Exception as e:
        logger.error(f"Fertilizer prediction error: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


def log_prediction(request_data: dict, response_data: dict, pred_request: PredictionRequest):
    """Log prediction to database"""
    session = db.get_session()
    try:
        log = PredictionLog(
            model_version=response_data["meta"]["model_version"],
            request_json=json.dumps(request_data),
            response_json=json.dumps(response_data),
            crop_label=response_data["crop"]["label"],
            crop_confidence=response_data["crop"]["confidence"],
            fertilizer_label=response_data["fertilizer"]["label"],
            fertilizer_confidence=response_data["fertilizer"]["confidence"],
            land_size=pred_request.field.landSize,
            region=pred_request.field.region,
            irrigation_type=pred_request.field.irrigationType,
            previous_crop=pred_request.field.previousCrop,
        )

        session.add(log)
        session.commit()
        logger.info(f"Prediction logged: ID={log.id}")

    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}", exc_info=True)
    return jsonify({"success": False, "error": "Internal server error"}), 500


if __name__ == "__main__":
    logger.info("Starting Flask application...")
    logger.info(f"Debug mode: {config.DEBUG}")

    app.run(host="0.0.0.0", port=5000, debug=config.DEBUG)
