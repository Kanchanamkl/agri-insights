from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import PredictionLog
import logging

logger = logging.getLogger('micfrs.repository')

class PredictionRepository:
    """Repository for prediction log operations"""
    
    @staticmethod
    def create_prediction_log(
        session: Session,
        request_data: Dict[str, Any],
        response_data: Dict[str, Any],
        model_version: str
    ) -> PredictionLog:
        """
        Create a new prediction log entry
        
        Args:
            session: Database session
            request_data: Original request payload
            response_data: Prediction response
            model_version: Version of the model used
            
        Returns:
            Created PredictionLog instance
        """
        try:
            # Extract data from request
            soil = request_data.get('soil', {})
            environmental = request_data.get('environmental', {})
            field = request_data.get('field', {})
            
            # Extract predictions from response
            crop_pred = response_data.get('crop', {})
            fert_pred = response_data.get('fertilizer', {})
            
            # Create log entry
            log = PredictionLog(
                # Soil inputs
                nitrogen=soil.get('nitrogen'),
                phosphorous=soil.get('phosphorus'),  # Note: frontend uses 'phosphorus'
                potassium=soil.get('potassium'),
                carbon=soil.get('carbon'),
                ph=soil.get('pH'),
                soil_type=soil.get('soilType'),
                moisture=soil.get('moisture'),
                
                # Environmental inputs
                rainfall=environmental.get('rainfall'),
                temperature=environmental.get('temperature'),
                humidity=environmental.get('humidity'),
                
                # Field context
                region=field.get('region'),
                land_size=field.get('landSize'),
                irrigation_type=field.get('irrigationType'),
                previous_crop=field.get('previousCrop'),
                
                # Predictions
                predicted_crop=crop_pred.get('label'),
                crop_confidence=crop_pred.get('confidence'),
                predicted_fertilizer=fert_pred.get('label'),
                fertilizer_confidence=fert_pred.get('confidence'),
                remark=response_data.get('remark'),
                
                # Metadata
                model_version=model_version,
                raw_request_json=request_data,
                raw_response_json=response_data
            )
            
            session.add(log)
            session.flush()
            
            logger.info(f"Created prediction log with ID: {log.id}")
            return log
            
        except Exception as e:
            logger.error(f"Error creating prediction log: {str(e)}")
            raise
    
    @staticmethod
    def get_prediction_by_id(session: Session, prediction_id: int) -> Optional[PredictionLog]:
        """Get a prediction log by ID"""
        return session.query(PredictionLog).filter(PredictionLog.id == prediction_id).first()
