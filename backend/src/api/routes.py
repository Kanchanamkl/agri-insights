from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from typing import Dict, Any
import logging
import json

from ..api.schemas import (
    PredictionRequest,
    PredictionResponse,
    ErrorResponse
)
from src.ml.feature_mapper import FeatureMapper
from src.ml.predictor import Predictor
from src.db.repository import PredictionRepository
from utils.time_utils import get_current_timestamp

logger = logging.getLogger('micfrs.routes')

def create_routes(model_registry, db_manager) -> Blueprint:
    """
    Create Flask blueprint with routes
    
    Args:
        model_registry: ModelRegistry instance
        db_manager: Database manager instance
        
    Returns:
        Flask Blueprint
    """
    bp = Blueprint('api', __name__)
    
    # Initialize predictor only if models are loaded
    predictor = Predictor(model_registry) if model_registry else None
    
    @bp.route('/health', methods=['GET', 'OPTIONS'])
    def health_check():
        """Health check endpoint"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            is_ready = model_registry.is_ready() if model_registry else False
            
            logger.info(f"Health check requested - Status: {'ready' if is_ready else 'not ready'}")
            
            return jsonify({
                'status': 'healthy' if is_ready else 'initializing',
                'models_loaded': is_ready,
                'model_version': model_registry.get_model_version() if model_registry else 'unknown',
                'timestamp': get_current_timestamp()
            }), 200 if is_ready else 503
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}", exc_info=True)
            return jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'models_loaded': False,
                'timestamp': get_current_timestamp()
            }), 500
    
    @bp.route('/predict', methods=['POST', 'OPTIONS'])
    def predict():
        """Main prediction endpoint"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            # Log incoming request
            request_data = request.get_json()
            logger.info("="*60)
            logger.info("Prediction request received")
            logger.info(f"Request payload: {json.dumps(request_data, indent=2)}")
            
            if not model_registry or not model_registry.is_ready():
                logger.error("Models not loaded - cannot process prediction")
                return jsonify({
                    'success': False,
                    'error': 'Models not loaded. Please train models first.',
                    'details': {'message': 'Run python scripts/train.py'}
                }), 503
            
            if not request_data:
                logger.warning("No data provided in request")
                return jsonify({
                    'success': False,
                    'error': 'No data provided'
                }), 400
            
            # Validate request with Pydantic
            try:
                logger.info("Validating request with Pydantic schema...")
                validated_request = PredictionRequest(**request_data)
                logger.info("✓ Request validation successful")
            except ValidationError as e:
                logger.warning(f"Validation error: {str(e)}")
                logger.warning(f"Validation errors details: {json.dumps(e.errors(), indent=2)}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid request format',
                    'details': e.errors()
                }), 400
            
            # Map features
            logger.info("Mapping request features to model format...")
            features = FeatureMapper.map_request_to_features(request_data)
            logger.info(f"Mapped features: {features}")
            
            logger.info("Validating features...")
            FeatureMapper.validate_features(features)
            logger.info("✓ Features validation successful")
            
            logger.info("Converting features to DataFrame...")
            features_df = FeatureMapper.features_to_dataframe(features)
            logger.info(f"DataFrame shape: {features_df.shape}")
            logger.info(f"DataFrame columns: {features_df.columns.tolist()}")
            
            # Make predictions
            logger.info("Making predictions...")
            predictions = predictor.predict(features_df)
            logger.info(f"✓ Predictions generated: Crop={predictions['crop']['label']}, Fertilizer={predictions['fertilizer']['label']}")
            
            # Build response
            response_data = {
                'success': True,
                'crop': predictions['crop'],
                'fertilizer': predictions['fertilizer'],
                'remark': predictions['remark'],
                'meta': {
                    'model_version': model_registry.get_model_version(),
                    'timestamp': get_current_timestamp()
                }
            }
            
            logger.info(f"Response: {json.dumps(response_data, indent=2)}")
            
            # Save to database
            try:
                logger.info("Saving prediction to database...")
                with db_manager.get_session() as session:
                    log_entry = PredictionRepository.create_prediction_log(
                        session,
                        request_data,
                        response_data,
                        model_registry.get_model_version()
                    )
                    logger.info(f"✓ Prediction saved to database with ID: {log_entry.id}")
            except Exception as db_error:
                logger.error(f"Database error (non-critical): {str(db_error)}", exc_info=True)
                # Continue anyway - prediction succeeded
            
            logger.info("="*60)
            return jsonify(response_data), 200
            
        except ValueError as e:
            logger.warning(f"Value error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': 'Internal server error',
                'details': {'message': str(e)}
            }), 500
    
    @bp.route('/predict/crop', methods=['POST', 'OPTIONS'])
    def predict_crop_only():
        """Crop-only prediction endpoint"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            if not model_registry or not model_registry.is_ready():
                return jsonify({'success': False, 'error': 'Models not loaded'}), 503
            
            request_data = request.get_json()
            validated_request = PredictionRequest(**request_data)
            
            features = FeatureMapper.map_request_to_features(request_data)
            features_df = FeatureMapper.features_to_dataframe(features)
            
            crop_pred, crop_probs = predictor._predict_with_proba(
                model_registry.crop_model,
                features_df
            )
            crop_result = predictor._format_prediction(crop_pred, crop_probs, 3)
            
            return jsonify({
                'success': True,
                'crop': crop_result,
                'meta': {
                    'model_version': model_registry.get_model_version(),
                    'timestamp': get_current_timestamp()
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Crop prediction error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/predict/fertilizer', methods=['POST', 'OPTIONS'])
    def predict_fertilizer_only():
        """Fertilizer-only prediction endpoint"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            if not model_registry or not model_registry.is_ready():
                return jsonify({'success': False, 'error': 'Models not loaded'}), 503
            
            request_data = request.get_json()
            validated_request = PredictionRequest(**request_data)
            
            features = FeatureMapper.map_request_to_features(request_data)
            features_df = FeatureMapper.features_to_dataframe(features)
            
            fert_pred, fert_probs = predictor._predict_with_proba(
                model_registry.fertilizer_model,
                features_df
            )
            fert_result = predictor._format_prediction(fert_pred, fert_probs, 3)
            
            remark = model_registry.fertilizer_remark_map.get(
                fert_pred[0],
                "No specific remark available"
            )
            
            return jsonify({
                'success': True,
                'fertilizer': fert_result,
                'remark': remark,
                'meta': {
                    'model_version': model_registry.get_model_version(),
                    'timestamp': get_current_timestamp()
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Fertilizer prediction error: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp