from typing import Dict, Any, Union
import pandas as pd
from pydantic import BaseModel, Field, field_validator
from ml.normalization import Normalizer
from utils.helpers import get_logger

logger = get_logger(__name__)


class EnvironmentalData(BaseModel):
    rainfall: float = Field(..., ge=0)
    temperature: float
    humidity: float = Field(..., ge=0, le=100)


class FieldData(BaseModel):
    region: str
    landSize: float = Field(..., gt=0)
    irrigationType: str
    previousCrop: str


class SoilData(BaseModel):
    nitrogen: float = Field(..., ge=0)
    phosphorus: float = Field(..., ge=0)
    potassium: float = Field(..., ge=0)
    carbon: float = Field(..., ge=0)
    pH: float = Field(..., ge=0, le=14)
    soilType: str

    # ✅ allow numeric OR dropdown label
    moisture: Union[float, str] = Field(...)


class PredictionRequest(BaseModel):
    environmental: EnvironmentalData
    field: FieldData
    soil: SoilData

    @field_validator("soil")
    @classmethod
    def normalize_soil_data(cls, v: SoilData) -> SoilData:
        soil_dict = v.model_dump()
        soil_dict["soilType"] = Normalizer.normalize_soil_type(soil_dict["soilType"])
        soil_dict["moisture"] = Normalizer.normalize_moisture(soil_dict["moisture"])
        return SoilData(**soil_dict)


class FeatureMapper:
    """Map frontend request to ML model features"""

    # Feature order MUST match training
    FEATURE_NAMES = [
        "Temperature",
        "Moisture",
        "Rainfall",
        "PH",
        "Nitrogen",
        "Phosphorous",  # Note spelling!
        "Potassium",
        "Carbon",
        "Soil",
    ]

    @staticmethod
    def extract_features(request: PredictionRequest) -> pd.DataFrame:
        """
        Extract features from validated request in correct order.
        Returns DataFrame with single row in training column order.
        """
        features = {
            "Temperature": float(request.environmental.temperature),
            "Rainfall": float(request.environmental.rainfall),
            "Moisture": float(request.soil.moisture),  # ✅ normalized to float
            "PH": float(request.soil.pH),
            "Nitrogen": float(request.soil.nitrogen),
            "Phosphorous": float(request.soil.phosphorus),  # Map phosphorus -> Phosphorous
            "Potassium": float(request.soil.potassium),
            "Carbon": float(request.soil.carbon),
            "Soil": request.soil.soilType,  # ✅ normalized category
        }

        df = pd.DataFrame([features], columns=FeatureMapper.FEATURE_NAMES)
        logger.info(f"Extracted features: {features}")
        return df

    @staticmethod
    def get_extra_fields(request: PredictionRequest) -> Dict[str, Any]:
        """Extract non-ML fields for database logging"""
        return {
            "humidity": request.environmental.humidity,
            "region": request.field.region,
            "land_size": request.field.landSize,
            "irrigation_type": request.field.irrigationType,
            "previous_crop": request.field.previousCrop,
        }
