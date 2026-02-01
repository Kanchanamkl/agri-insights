import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger('micfrs.predictor')

class Predictor:
    """Handles model predictions and enrichment with additional data"""
    
    # Crop database with metadata
    CROP_DATABASE = {
        'rice': {
            'icon': '🌾',
            'expectedYieldMin': 2500,
            'expectedYieldMax': 3500,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'October',
            'growingSeasonEnd': 'February',
        },
        'maize': {
            'icon': '🌽',
            'expectedYieldMin': 3000,
            'expectedYieldMax': 5000,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'rising',
            'growingSeasonStart': 'April',
            'growingSeasonEnd': 'August',
        },
        'tea': {
            'icon': '🍵',
            'expectedYieldMin': 1500,
            'expectedYieldMax': 2500,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'March',
            'growingSeasonEnd': 'November',
        },
        'vegetables': {
            'icon': '🥬',
            'expectedYieldMin': 4000,
            'expectedYieldMax': 7000,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'rising',
            'growingSeasonStart': 'Any',
            'growingSeasonEnd': 'season',
        },
        'coconut': {
            'icon': '🥥',
            'expectedYieldMin': 8000,
            'expectedYieldMax': 12000,
            'yieldUnit': 'nuts/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'Year-round',
            'growingSeasonEnd': '',
        },
    }
    
    # Fertilizer database with details
    FERTILIZER_DATABASE = {
        'Urea': {
            'components': ['Nitrogen (46%)'],
            'baseRatePerAcre': 50,
            'pricePerKg': 80,
            'environmentalImpact': 'medium',
        },
        'DAP': {
            'components': ['Nitrogen (18%)', 'Phosphorus (46%)'],
            'baseRatePerAcre': 100,
            'pricePerKg': 120,
            'environmentalImpact': 'medium',
        },
        'General Purpose Fertilizer': {
            'components': ['Nitrogen (15%)', 'Phosphorus (15%)', 'Potassium (15%)', 'Micronutrients'],
            'baseRatePerAcre': 120,
            'pricePerKg': 100,
            'environmentalImpact': 'low',
        },
        'NPK': {
            'components': ['Nitrogen (20%)', 'Phosphorus (20%)', 'Potassium (20%)'],
            'baseRatePerAcre': 150,
            'pricePerKg': 150,
            'environmentalImpact': 'medium',
        },
        'TSP': {
            'components': ['Phosphorus (46%)'],
            'baseRatePerAcre': 75,
            'pricePerKg': 110,
            'environmentalImpact': 'low',
        },
        'MOP': {
            'components': ['Potassium (60%)'],
            'baseRatePerAcre': 60,
            'pricePerKg': 90,
            'environmentalImpact': 'low',
        },
    }
    
    def __init__(self, model_registry):
        """
        Initialize predictor
        
        Args:
            model_registry: ModelRegistry instance with loaded models
        """
        self.registry = model_registry
        
    def predict(self, features_df: pd.DataFrame, land_size: float = 1, top_k: int = 3) -> Dict[str, Any]:
        """
        Make predictions for both crop and fertilizer with enriched data
        
        Args:
            features_df: DataFrame with features
            land_size: Land size in acres (for cost calculation)
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with enriched crop and fertilizer predictions
        """
        if not self.registry.is_ready():
            raise RuntimeError("Models not loaded. Call load_models() first.")
        
        # Predict crop
        crop_pred, crop_probs = self._predict_with_proba(
            self.registry.crop_model,
            features_df
        )
        crop_result = self._format_crop_prediction(crop_pred, crop_probs, top_k)
        
        # Predict fertilizer
        fert_pred, fert_probs = self._predict_with_proba(
            self.registry.fertilizer_model,
            features_df
        )
        fert_result = self._format_fertilizer_prediction(fert_pred, fert_probs, land_size, top_k)
        
        # Get remark for fertilizer
        remark = self.registry.fertilizer_remark_map.get(fert_pred[0], "No specific remark available")
        
        # Generate feature importance
        feature_importance = self._generate_feature_importance(features_df)
        
        # Generate risk factors
        risk_factors = self._generate_risk_factors(features_df)
        
        return {
            'crop': crop_result,
            'fertilizer': fert_result,
            'remark': remark,
            'featureImportance': feature_importance,
            'riskFactors': risk_factors,
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
    
    def _format_crop_prediction(
        self,
        predictions: List[str],
        probabilities: np.ndarray,
        top_k: int
    ) -> Dict[str, Any]:
        """
        Format crop prediction with enriched metadata
        """
        # Get class labels
        classifier = self.registry.crop_model.named_steps.get('classifier')
        classes = classifier.classes_
        
        # Get probabilities for each class
        class_probs = probabilities[0]
        
        # Get top k predictions
        top_indices = np.argsort(class_probs)[::-1][:top_k]
        
        # Main prediction
        main_crop = predictions[0].lower()
        main_confidence = float(class_probs[np.where(classes == predictions[0])[0][0]])
        
        # Get crop metadata
        crop_meta = self.CROP_DATABASE.get(main_crop, {
            'icon': '🌱',
            'expectedYieldMin': 2000,
            'expectedYieldMax': 3000,
            'yieldUnit': 'kg/acre',
            'marketPriceTrend': 'stable',
            'growingSeasonStart': 'March',
            'growingSeasonEnd': 'July',
        })
        
        result = {
            'label': main_crop.title(),
            'confidence': main_confidence,
            'icon': crop_meta['icon'],
            'expectedYieldMin': crop_meta['expectedYieldMin'],
            'expectedYieldMax': crop_meta['expectedYieldMax'],
            'yieldUnit': crop_meta['yieldUnit'],
            'marketPriceTrend': crop_meta['marketPriceTrend'],
            'growingSeasonStart': crop_meta['growingSeasonStart'],
            'growingSeasonEnd': crop_meta['growingSeasonEnd'],
            'top_k': [
                {
                    'label': classes[idx].title(),
                    'prob': float(class_probs[idx])
                }
                for idx in top_indices
            ]
        }
        
        return result
    
    def _format_fertilizer_prediction(
        self,
        predictions: List[str],
        probabilities: np.ndarray,
        land_size: float,
        top_k: int
    ) -> Dict[str, Any]:
        """
        Format fertilizer prediction with cost and schedule
        """
        # Get class labels
        classifier = self.registry.fertilizer_model.named_steps.get('classifier')
        classes = classifier.classes_
        
        # Get probabilities for each class
        class_probs = probabilities[0]
        
        # Get top k predictions
        top_indices = np.argsort(class_probs)[::-1][:top_k]
        
        # Main prediction
        main_fertilizer = predictions[0]
        main_confidence = float(class_probs[np.where(classes == predictions[0])[0][0]])
        
        # Get fertilizer metadata
        fert_meta = self.FERTILIZER_DATABASE.get(main_fertilizer, {
            'components': ['Balanced nutrients'],
            'baseRatePerAcre': 100,
            'pricePerKg': 100,
            'environmentalImpact': 'low',
        })
        
        # Calculate quantities and costs
        total_quantity = fert_meta['baseRatePerAcre'] * land_size
        estimated_cost = total_quantity * fert_meta['pricePerKg']
        
        result = {
            'label': main_fertilizer,
            'confidence': main_confidence,
            'type': main_fertilizer,
            'components': fert_meta['components'],
            'quantityPerAcre': f"{int(total_quantity)} kg total ({fert_meta['baseRatePerAcre']} kg/acre)",
            'estimatedCost': int(estimated_cost),
            'costUnit': 'LKR',
            'environmentalImpact': fert_meta['environmentalImpact'],
            'applicationSchedule': [
                {'week': 1, 'action': f'Apply base dose of {main_fertilizer}'},
                {'week': 4, 'action': 'First top dressing application'},
                {'week': 8, 'action': 'Second top dressing application'},
                {'week': 12, 'action': 'Final application if needed'},
            ],
            'top_k': [
                {
                    'label': classes[idx],
                    'prob': float(class_probs[idx])
                }
                for idx in top_indices
            ]
        }
        
        return result
    
    def _generate_feature_importance(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate feature importance explanation"""
        features = features_df.iloc[0].to_dict()
        importance = []
        
        # pH impact
        ph = features.get('PH', 7.0)
        if 6.0 <= ph <= 7.0:
            importance.append({
                'feature': 'Soil pH',
                'impact': 0.85,
                'explanation': f'Optimal pH ({ph}) → Excellent nutrient availability'
            })
        else:
            importance.append({
                'feature': 'Soil pH',
                'impact': -0.25,
                'explanation': f'Suboptimal pH ({ph}) → May need lime/gypsum'
            })
        
        # Nitrogen impact
        nitrogen = features.get('Nitrogen', 100)
        if nitrogen > 100:
            importance.append({
                'feature': 'Nitrogen',
                'impact': 0.72,
                'explanation': f'Good nitrogen ({nitrogen} ppm) → Supports vigorous growth'
            })
        else:
            importance.append({
                'feature': 'Nitrogen',
                'impact': -0.35,
                'explanation': f'Low nitrogen ({nitrogen} ppm) → Additional fertilizer needed'
            })
        
        # Rainfall impact
        rainfall = features.get('Rainfall', 200)
        if rainfall > 150:
            importance.append({
                'feature': 'Rainfall',
                'impact': 0.65,
                'explanation': f'Good rainfall ({rainfall}mm) → Suitable for water-loving crops'
            })
        else:
            importance.append({
                'feature': 'Rainfall',
                'impact': -0.18,
                'explanation': f'Low rainfall ({rainfall}mm) → Irrigation recommended'
            })
        
        # Temperature impact
        temp = features.get('Temperature', 28)
        if 22 <= temp <= 30:
            importance.append({
                'feature': 'Temperature',
                'impact': 0.55,
                'explanation': f'Ideal temperature ({temp}°C) → Good for most crops'
            })
        else:
            importance.append({
                'feature': 'Temperature',
                'impact': -0.15,
                'explanation': f'Temperature ({temp}°C) → May limit crop options'
            })
        
        return sorted(importance, key=lambda x: abs(x['impact']), reverse=True)
    
    def _generate_risk_factors(self, features_df: pd.DataFrame) -> List[Dict[str, str]]:
        """Generate risk factors and mitigation strategies"""
        features = features_df.iloc[0].to_dict()
        risks = []
        
        # pH risk
        ph = features.get('PH', 7.0)
        if ph < 5.5:
            risks.append({
                'factor': f'Acidic soil (pH {ph})',
                'mitigation': 'Apply agricultural lime to raise pH to 6.0-6.5'
            })
        elif ph > 7.5:
            risks.append({
                'factor': f'Alkaline soil (pH {ph})',
                'mitigation': 'Apply gypsum or sulfur to lower pH'
            })
        
        # Nitrogen risk
        nitrogen = features.get('Nitrogen', 100)
        if nitrogen < 50:
            risks.append({
                'factor': f'Very low nitrogen ({nitrogen} ppm)',
                'mitigation': 'Increase urea application in split doses'
            })
        
        # Moisture/humidity risk
        moisture = features.get('Moisture', 60)
        if moisture > 80:
            risks.append({
                'factor': 'High soil moisture',
                'mitigation': 'Ensure good drainage to prevent waterlogging'
            })
        
        if len(risks) == 0:
            risks.append({
                'factor': 'No major risks detected',
                'mitigation': 'Continue regular monitoring and good agricultural practices'
            })
        
        return risks