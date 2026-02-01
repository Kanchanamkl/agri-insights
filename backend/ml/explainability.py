import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger('micfrs.explainability')

class ModelExplainer:
    """Provides model prediction explanations"""
    
    @staticmethod
    def get_feature_importance(model, feature_names: List[str]) -> Dict[str, float]:
        """
        Get feature importance from trained model
        
        Args:
            model: Trained model (must have feature_importances_)
            feature_names: List of feature names
            
        Returns:
            Dictionary mapping feature names to importance scores
        """
        try:
            # Get the classifier from the pipeline
            if hasattr(model, 'named_steps'):
                classifier = model.named_steps.get('classifier')
            else:
                classifier = model
            
            if not hasattr(classifier, 'feature_importances_'):
                logger.warning("Model does not have feature_importances_ attribute")
                return {}
            
            importances = classifier.feature_importances_
            
            # Map to feature names
            importance_dict = {
                name: float(imp)
                for name, imp in zip(feature_names, importances)
            }
            
            # Sort by importance
            return dict(sorted(
                importance_dict.items(),
                key=lambda x: x[1],
                reverse=True
            ))
            
        except Exception as e:
            logger.error(f"Error getting feature importance: {str(e)}")
            return {}
    
    @staticmethod
    def explain_prediction(
        features: Dict[str, Any],
        prediction: str,
        confidence: float
    ) -> str:
        """
        Generate human-readable explanation for prediction
        
        Args:
            features: Input features
            prediction: Predicted label
            confidence: Prediction confidence
            
        Returns:
            Explanation string
        """
        explanation = f"Based on the soil and environmental conditions:\n"
        explanation += f"- Soil Type: {features.get('Soil', 'N/A')}\n"
        explanation += f"- pH Level: {features.get('PH', 'N/A')}\n"
        explanation += f"- Temperature: {features.get('Temperature', 'N/A')}°C\n"
        explanation += f"- Rainfall: {features.get('Rainfall', 'N/A')}mm\n"
        explanation += f"\nRecommended {prediction} with {confidence*100:.1f}% confidence."
        
        return explanation