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
    """
    Builds the two separate DataFrames the trained models expect.

    Training used split feature sets:
      Crop model  (13 raw cols): Temperature, Rainfall, Humidity,
                                 Rain_Temp_Balance, Moisture, PH, PH_Stress,
                                 Carbon, Soil, Nitrogen, Phosphorous,
                                 Potassium, NPK_Sum
      Fert model  ( 9 raw cols): Nitrogen, Phosphorous, Potassium, NPK_Sum,
                                 PH, PH_Stress, Carbon, Moisture, Soil
    """

    CROP_FEATURE_COLUMNS = [
        "Temperature", "Rainfall", "Humidity", "Rain_Temp_Balance",
        "Moisture", "PH", "PH_Stress", "Carbon", "Soil",
        "Nitrogen", "Phosphorous", "Potassium", "NPK_Sum",
    ]

    FERT_FEATURE_COLUMNS = [
        "Nitrogen", "Phosphorous", "Potassium", "NPK_Sum",
        "PH", "PH_Stress", "Carbon", "Moisture", "Soil",
    ]

    @staticmethod
    def _engineer(s: SoilParameters, e: EnvironmentalFactors) -> dict:
        """Compute all raw + engineered values from request objects."""
        npk_sum = float(s.nitrogen + s.phosphorous + s.potassium)

        ph = float(s.ph)
        if 6.5 <= ph <= 7.0:
            ph_stress = 0.0
        elif ph < 6.5:
            ph_stress = 6.5 - ph
        else:
            ph_stress = ph - 7.0

        temp = float(e.temperature)
        rain_temp_balance = float(e.rainfall / temp) if temp != 0 else 0.0

        return {
            "Temperature":       temp,
            "Rainfall":          float(e.rainfall),
            "Humidity":          float(e.humidity),
            "Rain_Temp_Balance": rain_temp_balance,
            "Moisture":          float(s.moisture),
            "PH":                ph,
            "PH_Stress":         ph_stress,
            "Carbon":            float(s.carbon),
            "Soil":              str(s.soil),
            "Nitrogen":          float(s.nitrogen),
            "Phosphorous":       float(s.phosphorous),
            "Potassium":         float(s.potassium),
            "NPK_Sum":           npk_sum,
        }

    @staticmethod
    def extract_features(request: PredictionRequest) -> pd.DataFrame:
        """
        Legacy method — returns a DataFrame with ALL engineered columns.
        Used by routes that only need the full feature dict (e.g. risk factor
        generation).  For model inference, use extract_crop_features /
        extract_fert_features instead.
        """
        row = FeatureMapper._engineer(
            request.soilParameters, request.environmentalFactors
        )
        all_cols = list(dict.fromkeys(
            FeatureMapper.CROP_FEATURE_COLUMNS + FeatureMapper.FERT_FEATURE_COLUMNS
        ))
        return pd.DataFrame([row], columns=all_cols)

    @staticmethod
    def extract_crop_features(request: PredictionRequest) -> pd.DataFrame:
        """Return a single-row DataFrame with exactly the 13 crop model columns."""
        row = FeatureMapper._engineer(
            request.soilParameters, request.environmentalFactors
        )
        return pd.DataFrame(
            [{c: row[c] for c in FeatureMapper.CROP_FEATURE_COLUMNS}],
            columns=FeatureMapper.CROP_FEATURE_COLUMNS,
        )

    @staticmethod
    def extract_fert_features(request: PredictionRequest) -> pd.DataFrame:
        """Return a single-row DataFrame with exactly the 9 fertilizer model columns."""
        row = FeatureMapper._engineer(
            request.soilParameters, request.environmentalFactors
        )
        return pd.DataFrame(
            [{c: row[c] for c in FeatureMapper.FERT_FEATURE_COLUMNS}],
            columns=FeatureMapper.FERT_FEATURE_COLUMNS,
        )

    @staticmethod
    def extract_raw_dict(request: PredictionRequest) -> dict:
        """Return the raw engineered values as a plain dict (for SHAP label lookup)."""
        return FeatureMapper._engineer(
            request.soilParameters, request.environmentalFactors
        )