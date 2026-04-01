import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG     = os.getenv("FLASK_DEBUG", "True").lower() == "true"

    # MySQL
    MYSQL_HOST     = os.getenv("MYSQL_HOST",     "localhost")
    MYSQL_PORT     = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER     = os.getenv("MYSQL_USER",     "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB       = os.getenv("MYSQL_DB",       "agri_insights")

    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    # Paths
    BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR   = os.path.join(BASE_DIR, "data")
    MODELS_DIR = os.path.join(BASE_DIR, "models")

    # ── Core model artifacts ────────────────────────────────────────────────
    # Notebook saves:  crop_model.joblib, fert_model.joblib
    # Config exposes:  CROP_MODEL_PATH, FERTILIZER_MODEL_PATH
    CROP_MODEL_PATH = os.path.abspath(
        os.getenv("CROP_MODEL_PATH",
                  os.path.join(MODELS_DIR, "crop_model.joblib"))
    )
    FERTILIZER_MODEL_PATH = os.path.abspath(
        os.getenv("FERTILIZER_MODEL_PATH",
                  os.path.join(MODELS_DIR, "fert_model.joblib"))   # matches notebook output
    )
    REMARK_MAP_PATH = os.path.abspath(
        os.getenv("REMARK_MAP_PATH",
                  os.path.join(MODELS_DIR, "remark_map.joblib"))
    )
    METADATA_PATH = os.path.abspath(
        os.getenv("METADATA_PATH",
                  os.path.join(MODELS_DIR, "metadata.json"))
    )

    # ── SHAP explainer artifacts (saved by notebook cell 35/37) ────────────
    CROP_EXPLAINER_PATH = os.path.abspath(
        os.getenv("CROP_EXPLAINER_PATH",
                  os.path.join(MODELS_DIR, "crop_explainer.joblib"))
    )
    FERT_EXPLAINER_PATH = os.path.abspath(
        os.getenv("FERT_EXPLAINER_PATH",
                  os.path.join(MODELS_DIR, "fert_explainer.joblib"))
    )

    # ── Post-OHE feature name lists (for SHAP → readable label mapping) ────
    CROP_FEATURE_NAMES_PATH = os.path.abspath(
        os.getenv("CROP_FEATURE_NAMES_PATH",
                  os.path.join(MODELS_DIR, "crop_feature_names.joblib"))
    )
    FERT_FEATURE_NAMES_PATH = os.path.abspath(
        os.getenv("FERT_FEATURE_NAMES_PATH",
                  os.path.join(MODELS_DIR, "fert_feature_names.joblib"))
    )

    # ── Raw input column lists (for FeatureMapper DataFrame construction) ──
    CROP_FEATURE_COLUMNS_PATH = os.path.abspath(
        os.getenv("CROP_FEATURE_COLUMNS_PATH",
                  os.path.join(MODELS_DIR, "crop_feature_columns.joblib"))
    )
    FERT_FEATURE_COLUMNS_PATH = os.path.abspath(
        os.getenv("FERT_FEATURE_COLUMNS_PATH",
                  os.path.join(MODELS_DIR, "fert_feature_columns.joblib"))
    )

    # ── Dataset ─────────────────────────────────────────────────────────────
    DATASET_PATH = os.path.abspath(
        os.getenv("DATASET_PATH",
                  os.path.join(DATA_DIR, "enhanced_crop_fertlizer_dataset.csv"))
    )

    # ── ML compatibility ─────────────────────────────────────────────────────
    # Models saved with sklearn 1.5.2 (per training logs).
    REQUIRED_SKLEARN_VERSION = os.getenv("REQUIRED_SKLEARN_VERSION", "1.5.2")
    ENFORCE_SKLEARN_VERSION  = os.getenv("ENFORCE_SKLEARN_VERSION",  "True").lower()  == "true"
    SKLEARN_VERSION_WARN_ONLY = os.getenv("SKLEARN_VERSION_WARN_ONLY", "False").lower() == "true"


config = Config()