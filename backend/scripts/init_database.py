"""
Database initialization script
Creates all database tables
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from src.db.database import Database
from src.utils.logging_config import setup_logging

# Setup logging
logger = setup_logging(Config.LOG_FILE, Config.LOG_LEVEL)

def init_database():
    """Initialize database and create all tables"""
    try:
        logger.info("="*60)
        logger.info("Database Initialization")
        logger.info("="*60)
        
        # Ensure directories exist
        Config.ensure_directories()
        
        # Create database connection
        logger.info(f"Connecting to database: {Config.DB_NAME}")
        db = Database(Config.SQLALCHEMY_DATABASE_URI)
        
        # Create all tables
        logger.info("Creating database tables...")
        db.create_tables()
        
        logger.info("="*60)
        logger.info("Database initialization completed successfully!")
        logger.info("="*60)
        logger.info(f"Database: {Config.DB_NAME}")
        logger.info(f"Host: {Config.DB_HOST}:{Config.DB_PORT}")
        logger.info(f"Tables created:")
        logger.info("  - prediction_logs")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    init_database()
