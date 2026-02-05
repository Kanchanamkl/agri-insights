import joblib
import json
import os
import numpy as np
from typing import Dict, Any, List, Tuple
from config import config
from ml.feature_mapper import FeatureMapper, PredictionRequest
from utils.helpers import get_logger, get_timestamp, safe_round

logger = get_logger(__name__)

# Crop metadata
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

# Fertilizer metadata
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

class Predictor:
    def __init__(self):
        self.crop_model = None
        self.fertilizer_model = None
        self.remark_map = None
        self.metadata = None
        self.models_loaded = False
        
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
            logger.info(f"Models loaded successfully (version: {self.metadata['model_version']})")
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False
    
    def predict_crop(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict crop with probabilities"""
        proba = self.crop_model.predict_proba(features_df)[0]
        classes = self.crop_model.classes_
        
        # Get top prediction
        top_idx = np.argmax(proba)
        crop_label = classes[top_idx]
        confidence = float(proba[top_idx])
        
        # Get top-k
        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [
            {'label': classes[i], 'prob': safe_round(proba[i], 2)}
            for i in top_k_indices
        ]
        
        return crop_label, confidence, top_k
    
    def predict_fertilizer(self, features_df) -> Tuple[str, float, List[Dict]]:
        """Predict fertilizer with probabilities"""
        proba = self.fertilizer_model.predict_proba(features_df)[0]
        classes = self.fertilizer_model.classes_
        
        # Get top prediction
        top_idx = np.argmax(proba)
        fert_label = classes[top_idx]
        confidence = float(proba[top_idx])
        
        # Get top-k
        top_k_indices = np.argsort(proba)[::-1][:5]
        top_k = [
            {'label': classes[i], 'prob': safe_round(proba[i], 2)}
            for i in top_k_indices
        ]
        
        return fert_label, confidence, top_k
    
    def get_crop_metadata(self, crop: str) -> Dict:
        """Get crop metadata with defaults"""
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
        """Get fertilizer metadata with quantity and cost calculations"""
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
            'estimatedCost': estimated_cost,
            'costUnit': 'LKR',
            'environmentalImpact': meta['environmentalImpact'],
            'applicationSchedule': self.generate_application_schedule()
        }
    
    def generate_application_schedule(self) -> List[Dict]:
        """Generate fertilizer application schedule"""
        return [
            {'week': 1, 'action': 'Base application - Apply 50% of total fertilizer'},
            {'week': 4, 'action': 'First top dressing - Apply 25% of total fertilizer'},
            {'week': 8, 'action': 'Second top dressing - Apply remaining 25%'}
        ]
    
    def generate_feature_importance(self, features_df) -> List[Dict]:
        """Generate feature importance explanations"""
        ph = features_df['PH'].values[0]
        nitrogen = features_df['Nitrogen'].values[0]
        soil = features_df['Soil'].values[0]
        
        importance = [
            {
                'feature': 'Soil pH',
                'impact': safe_round(min(abs(7 - ph) / 7, 1), 2),
                'explanation': f'pH {ph:.1f} is {"optimal" if 6 <= ph <= 7.5 else "suboptimal"} for most crops'
            },
            {
                'feature': 'Nitrogen',
                'impact': safe_round(min(nitrogen / 200, 1), 2),
                'explanation': f'Nitrogen level ({nitrogen:.0f}) is {"adequate" if nitrogen >= 80 else "low"}'
            },
            {
                'feature': 'Soil Type',
                'impact': 0.75,
                'explanation': f'{soil} provides {"good" if "Loamy" in soil else "moderate"} nutrient retention'
            }
        ]
        
        return sorted(importance, key=lambda x: x['impact'], reverse=True)
    
    def generate_risk_factors(self, features_df) -> List[Dict]:
        """Generate risk factors and mitigation strategies"""
        ph = features_df['PH'].values[0]
        rainfall = features_df['Rainfall'].values[0]
        
        risks = []
        
        if ph < 5.5:
            risks.append({
                'factor': 'Low soil pH (acidic)',
                'mitigation': 'Apply lime to raise pH to 6-7 range'
            })
        elif ph > 8:
            risks.append({
                'factor': 'High soil pH (alkaline)',
                'mitigation': 'Add sulfur or organic matter to lower pH'
            })
        
        if rainfall < 100:
            risks.append({
                'factor': 'Low rainfall',
                'mitigation': 'Ensure adequate irrigation and mulching'
            })
        elif rainfall > 300:
            risks.append({
                'factor': 'High rainfall',
                'mitigation': 'Ensure proper drainage to prevent waterlogging'
            })
        
        return risks
    
    def generate_alternative_crops(self, top_k: List[Dict]) -> List[Dict]:
        """Generate alternative crop recommendations"""
        alternatives = []
        
        # Skip the top prediction, use next 3
        for item in top_k[1:4]:
            prob_percent = int(item['prob'] * 100)
            alternatives.append({
                'crop': item['label'],
                'confidence': prob_percent,
                'reason': f"Good alternative based on soil conditions ({prob_percent}% match)"
            })
        
        return alternatives
    
    def predict(self, request: PredictionRequest) -> Dict[str, Any]:
        """
        Generate complete prediction response.
        
        Returns response in exact frontend-compatible format.
        """
        if not self.models_loaded:
            raise RuntimeError("Models not loaded. Please train models first.")
        
        # Extract features
        features_df = FeatureMapper.extract_features(request)
        extra_fields = FeatureMapper.get_extra_fields(request)
        
        # Predict crop
        crop_label, crop_conf, crop_top_k = self.predict_crop(features_df)
        crop_meta = self.get_crop_metadata(crop_label)
        
        # Predict fertilizer
        fert_label, fert_conf, fert_top_k = self.predict_fertilizer(features_df)
        fert_meta = self.get_fertilizer_metadata(fert_label, request.field.landSize)
        
        # Get remark
        remark = self.remark_map.get(fert_label, "")
        
        # Generate insights
        feature_importance = self.generate_feature_importance(features_df)
        risk_factors = self.generate_risk_factors(features_df)
        alternative_crops = self.generate_alternative_crops(crop_top_k)
        
        # Build response
        response = {
            'success': True,
            'crop': {
                'label': crop_label,
                'confidence': safe_round(crop_conf, 2),
                'icon': crop_meta['icon'],
                'expectedYieldMin': crop_meta['expectedYieldMin'],
                'expectedYieldMax': crop_meta['expectedYieldMax'],
                'yieldUnit': crop_meta['yieldUnit'],
                'marketPriceTrend': crop_meta['marketPriceTrend'],
                'growingSeasonStart': crop_meta['growingSeasonStart'],
                'growingSeasonEnd': crop_meta['growingSeasonEnd'],
                'top_k': crop_top_k
            },
            'fertilizer': {
                'label': fert_label,
                'confidence': safe_round(fert_conf, 2),
                'type': fert_label,
                'components': fert_meta['components'],
                'quantityPerAcre': fert_meta['quantityPerAcre'],
                'estimatedCost': fert_meta['estimatedCost'],
                'costUnit': fert_meta['costUnit'],
                'environmentalImpact': fert_meta['environmentalImpact'],
                'applicationSchedule': fert_meta['applicationSchedule'],
                'top_k': fert_top_k
            },
            'remark': remark,
            'featureImportance': feature_importance,
            'riskFactors': risk_factors,
            'alternativeCrops': alternative_crops,
            'meta': {
                'model_version': self.metadata['model_version'],
                'timestamp': get_timestamp()
            }
        }
        
        return response

# Global predictor instance
predictor = Predictor()
