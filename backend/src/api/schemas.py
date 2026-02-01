from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger('micfrs.schemas')

class SoilInput(BaseModel):
    """Soil parameters"""
    nitrogen: float = Field(..., ge=0, description="Nitrogen content")
    phosphorus: float = Field(..., ge=0, description="Phosphorus content")
    potassium: float = Field(..., ge=0, description="Potassium content")
    carbon: float = Field(default=30, ge=0, description="Carbon content")
    pH: float = Field(..., ge=0, le=14, description="Soil pH level")
    soilType: str = Field(..., description="Type of soil")
    moisture: float = Field(..., ge=0, le=100, description="Soil moisture percentage")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nitrogen": 100,
                "phosphorus": 50,
                "potassium": 100,
                "carbon": 30,
                "pH": 6.5,
                "soilType": "Loamy",
                "moisture": 60
            }
        }

class EnvironmentalInput(BaseModel):
    """Environmental parameters"""
    rainfall: float = Field(..., ge=0, description="Rainfall in mm")
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: float = Field(..., ge=0, le=100, description="Humidity percentage")
    
    class Config:
        json_schema_extra = {
            "example": {
                "rainfall": 200,
                "temperature": 28,
                "humidity": 70
            }
        }

class FieldInput(BaseModel):
    """Field context parameters"""
    region: str = Field(..., description="Geographic region")
    landSize: float = Field(..., gt=0, description="Land size in hectares")
    irrigationType: str = Field(..., description="Type of irrigation")
    previousCrop: str = Field(..., description="Previously grown crop")
    
    class Config:
        json_schema_extra = {
            "example": {
                "region": "Southern",
                "landSize": 1,
                "irrigationType": "rainfed",
                "previousCrop": "Rice"
            }
        }

class PredictionRequest(BaseModel):
    """Complete prediction request"""
    soil: SoilInput
    environmental: EnvironmentalInput
    field: FieldInput
    
    class Config:
        json_schema_extra = {
            "example": {
                "soil": {
                    "nitrogen": 100,
                    "phosphorus": 50,
                    "potassium": 100,
                    "carbon": 30,
                    "pH": 6.5,
                    "soilType": "Loamy",
                    "moisture": 60
                },
                "environmental": {
                    "rainfall": 200,
                    "temperature": 28,
                    "humidity": 70
                },
                "field": {
                    "region": "Southern",
                    "landSize": 1,
                    "irrigationType": "rainfed",
                    "previousCrop": "Rice"
                }
            }
        }

class PredictionDetail(BaseModel):
    """Single prediction with confidence"""
    label: str
    prob: float

class CropPrediction(BaseModel):
    """Crop prediction response"""
    label: str
    confidence: float
    top_k: List[PredictionDetail]

class FertilizerPrediction(BaseModel):
    """Fertilizer prediction response"""
    label: str
    confidence: float
    top_k: List[PredictionDetail]

class PredictionMetadata(BaseModel):
    """Prediction metadata"""
    model_version: str
    timestamp: str

class PredictionResponse(BaseModel):
    """Complete prediction response"""
    success: bool
    crop: CropPrediction
    fertilizer: FertilizerPrediction
    remark: str
    meta: PredictionMetadata

class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None