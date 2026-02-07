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
    """Map frontend request to ML model features (Updated for 13-feature Model)"""

    # MUST match the order used in your enhanced training exactly
    FEATURE_NAMES = [
        "Temperature", "Moisture", "Rainfall", "PH", "Humidity",
        "Nitrogen", "Phosphorous", "Potassium", "Carbon", "Soil",
        "NPK_Sum", "PH_Stress", "Rain_Temp_Balance"
    ]

    @staticmethod
    def extract_features(request: PredictionRequest) -> pd.DataFrame:
        # 1. Extract raw validated inputs
        temp = float(request.environmental.temperature)
        rain = float(request.environmental.rainfall)
        hum = float(request.environmental.humidity)
        n = float(request.soil.nitrogen)
        p = float(request.soil.phosphorus)
        k = float(request.soil.potassium)
        ph = float(request.soil.pH)

        # 2. Calculate Engineered Features (Calculated exactly like training)
        npk_sum = n + p + k
        ph_stress = abs(ph - 7.0)
        rt_balance = rain / (temp + 1)

        features = {
            "Temperature": temp,
            "Moisture": float(request.soil.moisture),
            "Rainfall": rain,
            "PH": ph,
            "Humidity": hum,
            "Nitrogen": n,
            "Phosphorous": p,
            "Potassium": k,
            "Carbon": float(request.soil.carbon),
            "Soil": request.soil.soilType,
            "NPK_Sum": npk_sum,
            "PH_Stress": ph_stress,
            "Rain_Temp_Balance": rt_balance
        }

        df = pd.DataFrame([features], columns=FeatureMapper.FEATURE_NAMES)
        logger.info(f"Extracted 13 features for model: {list(features.keys())}")
        return df