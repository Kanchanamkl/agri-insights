from typing import Union
from utils.helpers import get_logger

logger = get_logger(__name__)


class Normalizer:
    # Dataset-accepted soil types (exact)
    ALLOWED_SOIL_TYPES = [
        "Loamy Soil",
        "Peaty Soil",
        "Acidic Soil",
        "Neutral Soil",
        "Alkaline Soil",
    ]

    # Accept frontend variants (case/spacing safe)
    SOIL_TYPE_MAPPING = {
        "loamy": "Loamy Soil",
        "loamy soil": "Loamy Soil",
        "peaty": "Peaty Soil",
        "peaty soil": "Peaty Soil",
        "acidic": "Acidic Soil",
        "acidic soil": "Acidic Soil",
        "neutral": "Neutral Soil",
        "neutral soil": "Neutral Soil",
        "alkaline": "Alkaline Soil",
        "alkaline soil": "Alkaline Soil",
    }

    # Optional moisture labels (if UI ever sends strings)
    MOISTURE_MAPPING = {
        "low (dry)": 30.0,
        "medium (moist)": 60.0,
        "high (wet)": 85.0,
    }

    @classmethod
    def normalize_soil_type(cls, soil_type: str) -> str:
        if soil_type is None:
            raise ValueError(f"soilType is required. Allowed: {cls.ALLOWED_SOIL_TYPES}")

        key = str(soil_type).strip().lower()
        normalized = cls.SOIL_TYPE_MAPPING.get(key, None)

        # If user already passed exact dataset value:
        if normalized is None:
            # try exact match ignoring extra spaces
            candidate = str(soil_type).strip()
            if candidate in cls.ALLOWED_SOIL_TYPES:
                return candidate

            raise ValueError(
                f"Invalid soilType '{soil_type}'. Allowed values: {cls.ALLOWED_SOIL_TYPES} "
                f"(also accepts: {list(cls.SOIL_TYPE_MAPPING.keys())})"
            )

        return normalized

    @classmethod
    def normalize_moisture(cls, moisture: Union[float, str]) -> float:
        if moisture is None:
            raise ValueError("moisture is required (number 0-100 or labels: Low/Medium/High)")

        # Numeric already
        if isinstance(moisture, (int, float)):
            val = float(moisture)
        else:
            key = str(moisture).strip().lower()
            if key in cls.MOISTURE_MAPPING:
                val = cls.MOISTURE_MAPPING[key]
            else:
                # try convert string-number "60"
                try:
                    val = float(key)
                except Exception:
                    raise ValueError(
                        f"Invalid moisture '{moisture}'. Provide numeric 0-100 or one of: {list(cls.MOISTURE_MAPPING.keys())}"
                    )

        # Clamp/validate range (your dataset expects 0-100)
        if not (0.0 <= val <= 100.0):
            raise ValueError(f"moisture out of range: {val}. Expected 0-100.")

        return val
