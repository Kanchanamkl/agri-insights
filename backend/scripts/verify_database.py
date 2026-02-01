"""
Verify database connection and show table statistics
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from src.db.database import Database
from src.db.models import PredictionLog
from src.utils.logging_config import setup_logging
from sqlalchemy import inspect

# Setup logging
logger = setup_logging(Config.LOG_FILE, Config.LOG_LEVEL)

def verify_database():
    """Verify database connection and show statistics"""
    try:
        logger.info("="*60)
        logger.info("Database Verification")
        logger.info("="*60)
        
        # Create database connection
        db = Database(Config.SQLALCHEMY_DATABASE_URI)
        
        # Check connection
        logger.info(f"Database: {Config.DB_NAME}")
        logger.info(f"Host: {Config.DB_HOST}:{Config.DB_PORT}")
        logger.info(f"User: {Config.DB_USER}")
        
        # Verify tables
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        logger.info(f"\nTables found: {len(tables)}")
        for table in tables:
            logger.info(f"  - {table}")
        
        # Get statistics
        with db.get_session() as session:
            total_records = session.query(PredictionLog).count()
            
            logger.info(f"\nPrediction Logs Statistics:")
            logger.info(f"  Total records: {total_records}")
            
            if total_records > 0:
                # Get latest prediction
                latest = session.query(PredictionLog).order_by(
                    PredictionLog.created_at.desc()
                ).first()
                
                logger.info(f"  Latest prediction:")
                logger.info(f"    ID: {latest.id}")
                logger.info(f"    Crop: {latest.predicted_crop}")
                logger.info(f"    Fertilizer: {latest.predicted_fertilizer}")
                logger.info(f"    Created: {latest.created_at}")
                
                # Get crop distribution
                logger.info(f"\n  Sample predictions:")
                recent = session.query(PredictionLog).order_by(
                    PredictionLog.created_at.desc()
                ).limit(5).all()
                
                for pred in recent:
                    logger.info(f"    - {pred.predicted_crop} | {pred.predicted_fertilizer} | {pred.created_at}")
        
        logger.info("\n" + "="*60)
        logger.info("Database verification completed successfully!")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"Database verification failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    verify_database()
