from typing import Dict, Any, Union, List, Optional
import pandas as pd
from pydantic import BaseModel, Field, field_validator
from ml.normalization import Normalizer
from utils.helpers import get_logger

logger = get_logger(__name__)


class SoilParameters(BaseModel):
    nitrogen: float = Field(..., ge=0)
    phosphorous: float = Field(..., ge=0)
    potassium: float = Field(..., ge=0)
    ph: float = Field(..., ge=0)
    carbon: float
    moisture: Optional[float] = None
    soil: str

    @field_validator("moisture", mode="before")
    @classmethod
    def _coerce_moisture(cls, v):
        # Accept None/"", default to 0.0 (or pick a better default for your domain)
        if v is None or v == "":
            return 0.0
        return v


class EnvironmentalFactors(BaseModel):
    temperature: float
    rainfall: float
    humidity: float

    @field_validator("temperature", "rainfall", "humidity", mode="before")
    @classmethod
    def _coerce_env_numbers(cls, v):
        if v is None or v == "":
            return 0.0
        return v


class PredictionRequest(BaseModel):
    soilParameters: SoilParameters
    environmentalFactors: EnvironmentalFactors


class FeatureMapper:
    FEATURE_NAMES = [
        "Temperature",
        "Moisture",
        "Rainfall",
        "PH",
        "Nitrogen",
        "Phosphorous",
        "Potassium",
        "Carbon",
        "Humidity",
        "NPK_Sum",
        "PH_Stress",
        "Rain_Temp_Balance",
        "Soil",  # <-- ADD (model pipeline expects this)
    ]

    @staticmethod
    def extract_features(request: PredictionRequest) -> pd.DataFrame:
        s = request.soilParameters
        e = request.environmentalFactors

        npk_sum = float(s.nitrogen + s.phosphorous + s.potassium)

        # PH_Stress: distance from optimal range (6.5-7.0)
        if 6.5 <= s.ph <= 7.0:
            ph_stress = 0.0
        elif s.ph < 6.5:
            ph_stress = 6.5 - float(s.ph)
        else:
            ph_stress = float(s.ph) - 7.0

        rain_temp_balance = float(e.rainfall / e.temperature) if float(e.temperature) != 0 else 0.0

        row = {
            "Temperature": float(e.temperature),
            "Moisture": float(s.moisture),
            "Rainfall": float(e.rainfall),
            "PH": float(s.ph),
            "Nitrogen": float(s.nitrogen),
            "Phosphorous": float(s.phosphorous),
            "Potassium": float(s.potassium),
            "Carbon": float(s.carbon),
            "Humidity": float(e.humidity),
            "NPK_Sum": npk_sum,
            "PH_Stress": float(ph_stress),
            "Rain_Temp_Balance": float(rain_temp_balance),
            "Soil": str(s.soil),  # <-- ADD
        }

        return pd.DataFrame([row], columns=FeatureMapper.FEATURE_NAMES)