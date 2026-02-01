from typing import Dict, Any
import pandas as pd
import logging

logger = logging.getLogger('micfrs.feature_mapper')

class FeatureMapper:
    """Maps frontend request to model features"""
    
    # Frontend to model feature mapping
    FEATURE_MAP = {
        'Temperature': 'environmental.temperature',
        'Moisture': 'soil.moisture',
        'Rainfall': 'environmental.rainfall',
        'PH': 'soil.pH',
        'Nitrogen': 'soil.nitrogen',
        'Phosphorous': 'soil.phosphorus',  # Note: frontend uses 'phosphorus'
        'Potassium': 'soil.potassium',
        'Carbon': 'soil.carbon',
        'Soil': 'soil.soilType'
    }
    
    @classmethod
    def map_request_to_features(cls, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map frontend request to model feature format
        
        Args:
            request_data: Frontend request payload
            
        Returns:
            Dictionary with model feature names as keys
        """
        logger.info("Starting feature mapping...")
        features = {}
        
        for model_feature, request_path in cls.FEATURE_MAP.items():
            value = cls._get_nested_value(request_data, request_path)
            if value is None:
                logger.warning(f"Missing value for feature: {model_feature} (path: {request_path})")
            else:
                logger.debug(f"Mapped {model_feature} = {value} (from {request_path})")
            features[model_feature] = value
        
        logger.info(f"Feature mapping complete. Total features: {len(features)}")
        return features
    
    @staticmethod
    def _get_nested_value(data: Dict[str, Any], path: str) -> Any:
        """
        Get value from nested dictionary using dot notation
        
        Args:
            data: Nested dictionary
            path: Dot-separated path (e.g., 'soil.nitrogen')
            
        Returns:
            Value at the specified path or None
        """
        keys = path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                logger.warning(f"Path {path} not found in data")
                return None
        
        return value
    
    @classmethod
    def features_to_dataframe(cls, features: Dict[str, Any]) -> pd.DataFrame:
        """
        Convert features dictionary to pandas DataFrame
        
        Args:
            features: Dictionary of features
            
        Returns:
            DataFrame with single row
        """
        logger.info(f"Converting features to DataFrame: {features}")
        df = pd.DataFrame([features])
        logger.info(f"DataFrame created with shape: {df.shape}")
        logger.info(f"DataFrame columns: {df.columns.tolist()}")
        logger.info(f"DataFrame values:\n{df.to_string()}")
        return df
    
    @classmethod
    def validate_features(cls, features: Dict[str, Any]) -> bool:
        """
        Validate that all required features are present and valid
        
        Args:
            features: Dictionary of features
            
        Returns:
            True if valid, raises ValueError otherwise
        """
        logger.info("Validating features...")
        required_features = set(cls.FEATURE_MAP.keys())
        provided_features = set(features.keys())
        
        missing = required_features - provided_features
        if missing:
            error_msg = f"Missing required features: {missing}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Check for None values
        none_features = [k for k, v in features.items() if v is None]
        if none_features:
            error_msg = f"Features with None values: {none_features}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info("✓ All features validated successfully")
        return True