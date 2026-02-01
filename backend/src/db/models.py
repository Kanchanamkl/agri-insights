from sqlalchemy import Column, Integer, Float, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base

class PredictionLog(Base):
    """Model for storing prediction requests and results"""
    
    __tablename__ = 'prediction_logs'
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Soil inputs
    nitrogen = Column(Float, nullable=False)
    phosphorous = Column(Float, nullable=False)
    potassium = Column(Float, nullable=False)
    carbon = Column(Float, nullable=False)
    ph = Column(Float, nullable=False)
    soil_type = Column(String(50), nullable=False)
    moisture = Column(Float, nullable=False)
    
    # Environmental inputs
    rainfall = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    
    # Field context (not used in ML)
    region = Column(String(100))
    land_size = Column(Float)
    irrigation_type = Column(String(50))
    previous_crop = Column(String(100))
    
    # Predictions
    predicted_crop = Column(String(100), nullable=False)
    crop_confidence = Column(Float, nullable=False)
    predicted_fertilizer = Column(String(100), nullable=False)
    fertilizer_confidence = Column(Float, nullable=False)
    remark = Column(Text)
    
    # Metadata
    model_version = Column(String(50))
    raw_request_json = Column(JSON)
    raw_response_json = Column(JSON)
    
    def __repr__(self):
        return f"<PredictionLog(id={self.id}, crop={self.predicted_crop}, fertilizer={self.predicted_fertilizer})>"
