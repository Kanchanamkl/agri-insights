from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
DATASET_PATH = str(BASE_DIR / "data" / "enhanced_crop_fertlizer_dataset.csv")

MODELS_DIR = str(BASE_DIR / "ml" / "artifacts")
CROP_MODEL_PATH = str(Path(MODELS_DIR) / "crop_model.joblib")
FERTILIZER_MODEL_PATH = str(Path(MODELS_DIR) / "fert_model.joblib")
REMARK_MAP_PATH = str(Path(MODELS_DIR) / "remark_map.joblib")
METADATA_PATH = str(Path(MODELS_DIR) / "metadata.json")
