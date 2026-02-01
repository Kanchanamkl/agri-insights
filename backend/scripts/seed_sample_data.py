"""
Seed sample prediction data into database
This is optional - for demonstration purposes only
"""
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from src.db.database import Database
from src.db.models import PredictionLog
from src.utils.logging_config import setup_logging

# Setup logging
logger = setup_logging(Config.LOG_FILE, Config.LOG_LEVEL)

# Sample data
SAMPLE_PREDICTIONS = [
    {
        "nitrogen": 90,
        "phosphorous": 42,
        "potassium": 43,
        "carbon": 30,
        "ph": 6.5,
        "soil_type": "Loamy",
        "moisture": 60,
        "rainfall": 202.9,
        "temperature": 26.5,
        "humidity": 80.3,
        "region": "Central",
        "land_size": 2.5,
        "irrigation_type": "Drip",
        "previous_crop": "Rice",
        "predicted_crop": "Maize",
        "crop_confidence": 0.95,
        "predicted_fertilizer": "Urea",
        "fertilizer_confidence": 0.89,
        "remark": "Apply urea in split doses for better nitrogen utilization",
        "model_version": "v1.0_sample",
        "raw_request_json": {
            "soil": {
                "nitrogen": 90,
                "phosphorus": 42,
                "potassium": 43,
                "carbon": 30,
                "pH": 6.5,
                "soilType": "Loamy",
                "moisture": 60
            },
            "environmental": {
                "rainfall": 202.9,
                "temperature": 26.5,
                "humidity": 80.3
            },
            "field": {
                "region": "Central",
                "landSize": 2.5,
                "irrigationType": "Drip",
                "previousCrop": "Rice"
            }
        },
        "raw_response_json": {
            "success": True,
            "crop": {
                "label": "Maize",
                "confidence": 0.95
            },
            "fertilizer": {
                "label": "Urea",
                "confidence": 0.89
            }
        }
    },
    {
        "nitrogen": 80,
        "phosphorous": 40,
        "potassium": 40,
        "carbon": 25,
        "ph": 6.0,
        "soil_type": "Clay",
        "moisture": 55,
        "rainfall": 180.5,
        "temperature": 25.0,
        "humidity": 75.0,
        "region": "Western",
        "land_size": 1.5,
        "irrigation_type": "Sprinkler",
        "previous_crop": "Wheat",
        "predicted_crop": "Rice",
        "crop_confidence": 0.92,
        "predicted_fertilizer": "DAP",
        "fertilizer_confidence": 0.87,
        "remark": "Use DAP for optimal phosphorus availability",
        "model_version": "v1.0_sample",
        "raw_request_json": {
            "soil": {
                "nitrogen": 80,
                "phosphorus": 40,
                "potassium": 40,
                "carbon": 25,
                "pH": 6.0,
                "soilType": "Clay",
                "moisture": 55
            },
            "environmental": {
                "rainfall": 180.5,
                "temperature": 25.0,
                "humidity": 75.0
            },
            "field": {
                "region": "Western",
                "landSize": 1.5,
                "irrigationType": "Sprinkler",
                "previousCrop": "Wheat"
            }
        },
        "raw_response_json": {
            "success": True,
            "crop": {
                "label": "Rice",
                "confidence": 0.92
            },
            "fertilizer": {
                "label": "DAP",
                "confidence": 0.87
            }
        }
    }
]

def seed_sample_data():
    """Insert sample prediction data"""
    try:
        logger.info("="*60)
        logger.info("Seeding Sample Data")
        logger.info("="*60)
        
        # Create database connection
        db = Database(Config.SQLALCHEMY_DATABASE_URI)
        
        with db.get_session() as session:
            # Check if data already exists
            existing_count = session.query(PredictionLog).count()
            
            if existing_count > 0:
                logger.warning(f"Database already contains {existing_count} records")
                response = input("Do you want to add more sample data? (yes/no): ")
                if response.lower() not in ['yes', 'y']:
                    logger.info("Seeding cancelled")
                    return
            
            # Insert sample data
            for idx, sample in enumerate(SAMPLE_PREDICTIONS, 1):
                prediction = PredictionLog(**sample)
                session.add(prediction)
                logger.info(f"Added sample prediction {idx}: {sample['predicted_crop']}")
            
            session.commit()
            
            logger.info("="*60)
            logger.info(f"Successfully inserted {len(SAMPLE_PREDICTIONS)} sample predictions")
            logger.info("="*60)
            
    except Exception as e:
        logger.error(f"Seeding failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    seed_sample_data()
