import joblib
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger('micfrs.model_registry')

class ModelRegistry:
    """Registry for loading and managing trained models"""
    
    def __init__(self, model_dir: Path):
        """
        Initialize model registry
        
        Args:
            model_dir: Directory containing model files
        """
        self.model_dir = Path(model_dir)
        self.crop_model = None
        self.fertilizer_model = None
        self.fertilizer_remark_map = None
        self.metadata = None
        
    def load_models(self) -> None:
        """Load all models and metadata"""
        try:
            # Load crop model
            crop_model_path = self.model_dir / 'crop_model.pkl'
            if not crop_model_path.exists():
                raise FileNotFoundError(f"Crop model not found at {crop_model_path}")
            self.crop_model = joblib.load(crop_model_path)
            logger.info(f"Loaded crop model from {crop_model_path}")
            
            # Load fertilizer model
            fertilizer_model_path = self.model_dir / 'fertilizer_model.pkl'
            if not fertilizer_model_path.exists():
                raise FileNotFoundError(f"Fertilizer model not found at {fertilizer_model_path}")
            self.fertilizer_model = joblib.load(fertilizer_model_path)
            logger.info(f"Loaded fertilizer model from {fertilizer_model_path}")
            
            # Load fertilizer remark map
            remark_map_path = self.model_dir / 'fertilizer_remark_map.pkl'
            if not remark_map_path.exists():
                raise FileNotFoundError(f"Remark map not found at {remark_map_path}")
            self.fertilizer_remark_map = joblib.load(remark_map_path)
            logger.info(f"Loaded remark map from {remark_map_path}")
            
            # Load metadata
            metadata_path = self.model_dir / 'metadata.json'
            if not metadata_path.exists():
                raise FileNotFoundError(f"Metadata not found at {metadata_path}")
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
            logger.info(f"Loaded metadata from {metadata_path}")
            
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def get_model_version(self) -> str:
        """Get current model version"""
        if self.metadata:
            return self.metadata.get('version', 'unknown')
        return 'unknown'
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get model metadata"""
        return self.metadata or {}
    
    def is_ready(self) -> bool:
        """Check if all models are loaded and ready"""
        return all([
            self.crop_model is not None,
            self.fertilizer_model is not None,
            self.fertilizer_remark_map is not None,
            self.metadata is not None
        ])