"""
API Package
Handles Flask routes and request/response validation
"""

from .routes import create_routes
from .schemas import (
    PredictionRequest,
    PredictionResponse,
    ErrorResponse,
    SoilInput,
    EnvironmentalInput,
    FieldInput,
    CropPrediction,
    FertilizerPrediction
)

__all__ = [
    'create_routes',
    'PredictionRequest',
    'PredictionResponse',
    'ErrorResponse',
    'SoilInput',
    'EnvironmentalInput',
    'FieldInput',
    'CropPrediction',
    'FertilizerPrediction'
]
