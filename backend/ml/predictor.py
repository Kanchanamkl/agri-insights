import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger('micfrs.predictor')

class Predictor:
    """Handles model predictions"""
    
    def __init__(self, model_registry):
        """
        Initialize predictor
        
        Args:
            model_registry: ModelRegistry instance with loaded models
        """
        self.registry = model_registry
        
    def predict(self, features_df: pd.DataFrame, top_k: int = 3) -> Dict[str, Any]:
        """
        Make predictions for both crop and fertilizer
        
        Args:
            features_df: DataFrame with features
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with crop and fertilizer predictions
        """
        if not self.registry.is_ready():
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        # Predict crop
        crop_pred, crop_probs = self._predict_with_proba(
            self.registry.crop_model,
            features_df
        )
        crop_result = self._format_prediction(crop_pred, crop_probs, top_k)
        
        # Predict fertilizer
        fert_pred, fert_probs = self._predict_with_proba(
            self.registry.fertilizer_model,
            features_df
        )
        fert_result = self._format_prediction(fert_pred, fert_probs, top_k)
        
        # Get remark for fertilizer
        remark = self.registry.fertilizer_remark_map.get(fert_pred[0], "No specific remark available")
        
        return {
            'crop': crop_result,
            'fertilizer': fert_result,
            'remark': remark
        }
    
    def _predict_with_proba(
        self,
        model,
        features_df: pd.DataFrame
    ) -> Tuple[List[str], np.ndarray]:
        """
        Get prediction and probability scores
        
        Args:
            model: Trained model pipeline
            features_df: Features DataFrame
            
        Returns:
            Tuple of (predictions, probabilities)
        """
        predictions = model.predict(features_df)
        probabilities = model.predict_proba(features_df)
        
        return predictions.tolist(), probabilities
    
    def _format_prediction(
        self,
        predictions: List[str],
        probabilities: np.ndarray,
        top_k: int
    ) -> Dict[str, Any]:
        """
        Format prediction result
        
        Args:
            predictions: List of predicted labels
            probabilities: Probability matrix
            top_k: Number of top predictions
            
        Returns:
            Formatted prediction dictionary
        """
        # Get class labels from the model
        classes = probabilities[0]  # First row probabilities
        
        # Get top k predictions
        top_indices = np.argsort(classes)[::-1][:top_k]
        
        # Get class names (assumes pipeline has classes_ attribute)
        # This will be available after we implement the training script
        
        result = {
            'label': predictions[0],
            'confidence': float(np.max(classes)),
            'top_k': [
                {
                    'label': f"Class_{idx}",  # Placeholder - will be replaced with actual class names
                    'prob': float(classes[idx])
                }
                for idx in top_indices
            ]
        }
        
        return result