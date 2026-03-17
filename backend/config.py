import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    # MySQL
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('MYSQL_DB', 'agri_insights')
    
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    MODELS_DIR = os.path.join(BASE_DIR, 'models')
    
    # Model files (allow override via env; always absolute)
    CROP_MODEL_PATH = os.path.abspath(os.getenv('CROP_MODEL_PATH', os.path.join(MODELS_DIR, 'crop_model.joblib')))
    FERTILIZER_MODEL_PATH = os.path.abspath(os.getenv('FERTILIZER_MODEL_PATH', os.path.join(MODELS_DIR, 'fertilizer_model.joblib')))
    REMARK_MAP_PATH = os.path.abspath(os.getenv('REMARK_MAP_PATH', os.path.join(MODELS_DIR, 'fertilizer_remark_map.joblib')))
    METADATA_PATH = os.path.abspath(os.getenv('METADATA_PATH', os.path.join(MODELS_DIR, 'metadata.json')))
    
    # Dataset
    DATASET_PATH = os.path.abspath(os.getenv('DATASET_PATH', os.path.join(DATA_DIR, 'enhanced_crop_fertlizer_dataset.csv')))

    # ML compatibility (model was saved with sklearn 1.5.2 per your logs)
    REQUIRED_SKLEARN_VERSION = os.getenv("REQUIRED_SKLEARN_VERSION", "1.5.2")

    # If true, abort startup/prediction when sklearn mismatch is detected.
    ENFORCE_SKLEARN_VERSION = os.getenv("ENFORCE_SKLEARN_VERSION", "True").lower() == "true"

    # If true, allow continuing on mismatch but log a warning (not recommended for prod).
    SKLEARN_VERSION_WARN_ONLY = os.getenv("SKLEARN_VERSION_WARN_ONLY", "False").lower() == "true"

config = Config()
