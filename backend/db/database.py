from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import NullPool
from db.models import Base
from config import config
from utils.helpers import get_logger

logger = get_logger(__name__)

class Database:
    def __init__(self):
        self.engine = None
        self.Session = None
        
    def connect(self):
        """Create database engine and session factory"""
        try:
            self.engine = create_engine(
                config.SQLALCHEMY_DATABASE_URI,
                poolclass=NullPool,
                echo=False
            )
            
            # Test connection
            self.engine.connect()
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            # Create session factory
            self.Session = scoped_session(sessionmaker(bind=self.engine))
            
            logger.info("Database connected successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            logger.warning("Predictions will work, but logging will be disabled")
            return False
    
    def get_session(self):
        """Get a new database session"""
        if self.Session is None:
            raise RuntimeError("Database not connected")
        return self.Session()
    
    def close(self):
        """Close database connections"""
        if self.Session:
            self.Session.remove()
        if self.engine:
            self.engine.dispose()
        logger.info("Database connections closed")

# Global database instance
db = Database()
