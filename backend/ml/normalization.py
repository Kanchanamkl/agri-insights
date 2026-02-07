from typing import Dict, Any, Union
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
    'sandy': 'Sandy Soil',
}

# Moisture mapping: frontend dropdown -> numeric value
MOISTURE_MAPPING = {
    # Exact matches from frontend
    'low (dry)': 30.0,
    'medium (moist)': 60.0,
    'high (wet)': 85.0,
    # Flexible matches (case-insensitive, without parentheses)
    'low': 30.0,
    'dry': 30.0,
    'medium': 60.0,
    'moist': 60.0,
    'high': 85.0,
    'wet': 85.0,
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
    def normalize_moisture(moisture: Union[str, int, float]) -> float:
        """
        Normalize moisture value from frontend.
        
        Accepts:
        - Numeric values (0-100) directly
        - String labels like "low", "medium", "high", "low (dry)", "medium (moist)", "high (wet)"
        
        Args:
            moisture: Moisture value (numeric or string label)
            
        Returns:
            Normalized moisture as float (0-100)
            
        Raises:
            ValueError: If moisture value is invalid
        """
        # If already numeric, validate and return
        if isinstance(moisture, (int, float)):
            val = float(moisture)
            if 0 <= val <= 100:
                return val
            raise ValueError(f"Numeric moisture must be 0-100, got {val}")
        
        # If string, try to map it
        if isinstance(moisture, str):
            # Clean string: lowercase, strip
            cleaned = moisture.strip().lower()
            
            if cleaned in MOISTURE_MAPPING:
                result = MOISTURE_MAPPING[cleaned]
                logger.info(f"Normalized moisture: '{moisture}' -> {result}")
                return result
            
            # Try to parse as number
            try:
                val = float(cleaned)
                if 0 <= val <= 100:
                    return val
            except ValueError:
                pass
            
            # Invalid string label
            allowed_labels = list(MOISTURE_MAPPING.keys())
            raise ValueError(
                f"Invalid moisture '{moisture}'. "
                f"Provide numeric 0-100 or one of: {allowed_labels}"
            )
        
        # Unexpected type
        raise ValueError(
            f"Invalid moisture type: {type(moisture).__name__}. "
            f"Expected numeric or string label."
        )
    
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
