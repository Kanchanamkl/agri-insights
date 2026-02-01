from flask import Flask
from flask_cors import CORS
import sys
import logging

from config import Config
from src.utils.logging_config import setup_logging
from src.db.database import Database
from src.ml.model_registry import ModelRegistry
from src.api.routes import create_routes

# Initialize configuration
Config.ensure_directories()

# Setup logging
logger = setup_logging(
    log_file=Config.LOG_FILE,
    log_level=Config.LOG_LEVEL
)

def create_app() -> Flask:
    """Create and configure Flask application"""
    
    logger.info("Starting MICFRS Backend Application")
    
    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    try:
        # Initialize database
        logger.info("Initializing database connection...")
        db = Database(Config.SQLALCHEMY_DATABASE_URI)
        db.create_tables()
        app.db = db
        
        # Initialize model registry
        logger.info("Loading ML models...")
        model_registry = ModelRegistry(Config.MODEL_DIR)
        
        try:
            model_registry.load_models()
            logger.info(f"Models loaded successfully. Version: {model_registry.get_model_version()}")
        except FileNotFoundError as e:
            logger.error(f"Model files not found: {str(e)}")
            logger.error("Please run 'python scripts/train.py' first to train models")
            sys.exit(1)
        
        # Register routes
        api_bp = create_routes(model_registry, db)
        app.register_blueprint(api_bp)
        
        logger.info("Application initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}", exc_info=True)
        sys.exit(1)
    
    return app

# Create app instance
app = create_app()

if __name__ == '__main__':
    logger.info(f"Starting Flask server on http://localhost:5000")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=Config.DEBUG
    )