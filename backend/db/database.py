from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
from typing import Generator
import logging

logger = logging.getLogger('micfrs.database')

Base = declarative_base()

class Database:
    """Database connection manager"""
    
    def __init__(self, database_uri: str):
        """
        Initialize database connection
        
        Args:
            database_uri: SQLAlchemy database URI
        """
        self.engine = create_engine(
            database_uri,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False
        )
        self.session_factory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(self.session_factory)
        
    def create_tables(self):
        """Create all database tables"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise
    
    @contextmanager
    def get_session(self) -> Generator:
        """
        Context manager for database sessions
        
        Yields:
            Database session
        """
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            session.close()
    
    def close(self):
        """Close database connections"""
        self.Session.remove()
        self.engine.dispose()
        logger.info("Database connections closed")