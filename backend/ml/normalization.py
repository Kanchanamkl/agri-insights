from typing import Dict, Any
from utils.helpers import get_logger

logger = get_logger(__name__)

# Soil type mapping: frontend values -> dataset values
SOIL_TYPE_MAPPING = {
    'loamy': 'Loamy Soil',
    'peaty': 'Peaty Soil',
    'acidic': 'Acidic Soil',
    'neutral': 'Neutral Soil',
    'alkaline': 'Alkaline Soil',
    # Also accept already-correct values
    'loamy soil': 'Loamy Soil',
    'peaty soil': 'Peaty Soil',
    'acidic soil': 'Acidic Soil',
    'neutral soil': 'Neutral Soil',
    'alkaline soil': 'Alkaline Soil',
}

VALID_SOIL_TYPES = list(set(SOIL_TYPE_MAPPING.values()))

class Normalizer:
    """Normalize frontend inputs to match training dataset format"""
    
    @staticmethod
    def normalize_soil_type(soil_type: str) -> str:
        """
        Normalize soil type from frontend format to dataset format.
        
        Frontend: "Loamy", "Peaty", etc.
        Dataset: "Loamy Soil", "Peaty Soil", etc.
        
        Args:
            soil_type: Raw soil type from frontend
            
        Returns:
            Normalized soil type
            
        Raises:
            ValueError: If soil type is unknown
        """
        normalized = soil_type.strip().lower()
        
        if normalized in SOIL_TYPE_MAPPING:
            result = SOIL_TYPE_MAPPING[normalized]
            logger.info(f"Normalized soil type: '{soil_type}' -> '{result}'")
            return result
        
        # Unknown soil type
        raise ValueError(
            f"Unknown soil type: '{soil_type}'. "
            f"Allowed values: {', '.join(VALID_SOIL_TYPES)}"
        )
    
    @staticmethod
    def normalize_moisture(moisture: Any) -> float:
        """
        Normalize moisture value.
        
        Currently accepts numeric values directly.
        Can be extended to handle categorical values if needed.
        
        Args:
            moisture: Moisture value (numeric)
            
        Returns:
            Normalized moisture as float
        """
        try:
            return float(moisture)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid moisture value: '{moisture}'. Must be numeric.")
    
    @staticmethod
    def validate_and_normalize(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and normalize all input data.
        
        Args:
            data: Raw input dictionary with soil, environmental, field sections
            
        Returns:
            Normalized data dictionary
        """
        normalized = data.copy()
        
        # Normalize soil type
        if 'soil' in normalized and 'soilType' in normalized['soil']:
            normalized['soil']['soilType'] = Normalizer.normalize_soil_type(
                normalized['soil']['soilType']
            )
        
        # Normalize moisture
        if 'soil' in normalized and 'moisture' in normalized['soil']:
            normalized['soil']['moisture'] = Normalizer.normalize_moisture(
                normalized['soil']['moisture']
            )
        
        return normalized
