from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class PredictionLog(Base):
    __tablename__ = 'prediction_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    model_version = Column(String(50))
    
    # JSON columns for full request/response
    request_json = Column(Text)
    response_json = Column(Text)
    
    # Extracted fields for quick querying
    crop_label = Column(String(100))
    crop_confidence = Column(Float)
    fertilizer_label = Column(String(100))
    fertilizer_confidence = Column(Float)
    
    # Additional context
    land_size = Column(Float)
    region = Column(String(100))
    irrigation_type = Column(String(50))
    previous_crop = Column(String(100))
    
    def __repr__(self):
        return f"<PredictionLog(id={self.id}, crop={self.crop_label}, fertilizer={self.fertilizer_label})>"
