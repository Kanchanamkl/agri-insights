import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
import sklearn

from config import Config
from src.utils.logging_config import setup_logging

# Setup logging
logger = setup_logging(Config.LOG_FILE, Config.LOG_LEVEL)

def load_dataset(dataset_path: Path) -> pd.DataFrame:
    """Load and validate dataset"""
    logger.info(f"Loading dataset from {dataset_path}")
    
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")
    
    df = pd.DataFrame(pd.read_csv(dataset_path))
    logger.info(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    
    return df

def prepare_features_and_targets(df: pd.DataFrame):
    """Prepare feature matrix and target vectors"""
    
    # Feature columns
    numeric_features = [
        'Temperature', 'Moisture', 'Rainfall', 'PH',
        'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon'
    ]
    categorical_features = ['Soil']
    
    # Targets
    crop_target = 'Crop'
    fertilizer_target = 'Fertilizer'
    remark_column = 'Remark'
    
    X = df[numeric_features + categorical_features]
    y_crop = df[crop_target]
    y_fertilizer = df[fertilizer_target]
    remarks = df[remark_column]
    
    logger.info(f"Features shape: {X.shape}")
    logger.info(f"Crop classes: {y_crop.nunique()}")
    logger.info(f"Fertilizer classes: {y_fertilizer.nunique()}")
    
    return X, y_crop, y_fertilizer, remarks, numeric_features, categorical_features

def create_preprocessing_pipeline(numeric_features, categorical_features):
    """Create preprocessing pipeline"""
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ]
    )
    
    return preprocessor

def train_model(X_train, y_train, X_val, y_val, preprocessor, model_name="crop"):
    """Train and evaluate multiple models, return best one"""
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Training {model_name} model")
    logger.info(f"{'='*60}")
    
    # Model candidates
    models = {
        'LogisticRegression': LogisticRegression(
            max_iter=1000,
            random_state=Config.RANDOM_STATE,
            multi_class='multinomial'
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=100,
            random_state=Config.RANDOM_STATE,
            class_weight='balanced',
            n_jobs=-1
        ),
        'GradientBoosting': GradientBoostingClassifier(
            n_estimators=100,
            random_state=Config.RANDOM_STATE
        )
    }
    
    best_model = None
    best_score = 0
    best_name = None
    
    for name, model in models.items():
        logger.info(f"\nTraining {name}...")
        
        # Create pipeline
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        
        # Train
        pipeline.fit(X_train, y_train)
        
        # Evaluate on validation set
        y_pred = pipeline.predict(X_val)
        f1_macro = f1_score(y_val, y_pred, average='macro')
        
        logger.info(f"{name} Macro-F1 Score: {f1_macro:.4f}")
        
        if f1_macro > best_score:
            best_score = f1_macro
            best_model = pipeline
            best_name = name
    
    logger.info(f"\nBest model for {model_name}: {best_name} (Macro-F1: {best_score:.4f})")
    
    return best_model, best_name, best_score

def create_fertilizer_remark_map(df: pd.DataFrame) -> dict:
    """Create mapping from fertilizer to most common remark"""
    
    # Group by Fertilizer and get most common Remark
    fert_remark_map = {}
    
    for fertilizer in df['Fertilizer'].unique():
        remarks = df[df['Fertilizer'] == fertilizer]['Remark']
        most_common_remark = remarks.mode()[0] if len(remarks.mode()) > 0 else "No remark available"
        fert_remark_map[fertilizer] = most_common_remark
    
    logger.info(f"Created fertilizer-remark mapping for {len(fert_remark_map)} fertilizers")
    
    return fert_remark_map

def save_models_and_metadata(
    crop_model,
    fertilizer_model,
    fert_remark_map,
    crop_metrics,
    fert_metrics,
    numeric_features,
    categorical_features
):
    """Save models and metadata"""
    
    Config.MODEL_DIR.mkdir(exist_ok=True)
    
    # Save models
    crop_model_path = Config.MODEL_DIR / 'crop_model.pkl'
    joblib.dump(crop_model, crop_model_path)
    logger.info(f"Saved crop model to {crop_model_path}")
    
    fertilizer_model_path = Config.MODEL_DIR / 'fertilizer_model.pkl'
    joblib.dump(fertilizer_model, fertilizer_model_path)
    logger.info(f"Saved fertilizer model to {fertilizer_model_path}")
    
    remark_map_path = Config.MODEL_DIR / 'fertilizer_remark_map.pkl'
    joblib.dump(fert_remark_map, remark_map_path)
    logger.info(f"Saved remark map to {remark_map_path}")
    
    # Save metadata
    metadata = {
        'version': f"v1.0_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        'training_date': datetime.now().isoformat(),
        'sklearn_version': sklearn.__version__,
        'features': {
            'numeric': numeric_features,
            'categorical': categorical_features
        },
        'models': {
            'crop': {
                'type': crop_metrics['model_name'],
                'macro_f1': crop_metrics['f1_macro']
            },
            'fertilizer': {
                'type': fert_metrics['model_name'],
                'macro_f1': fert_metrics['f1_macro']
            }
        }
    }
    
    metadata_path = Config.MODEL_DIR / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved metadata to {metadata_path}")

def main():
    """Main training pipeline"""
    
    try:
        logger.info("="*60)
        logger.info("MICFRS Model Training Pipeline")
        logger.info("="*60)
        
        # Load dataset
        df = load_dataset(Config.DATASET_PATH)
        
        # Prepare features and targets
        X, y_crop, y_fertilizer, remarks, numeric_features, categorical_features = \
            prepare_features_and_targets(df)
        
        # Split data: 80% train, 10% val, 10% test
        X_temp, X_test, y_crop_temp, y_crop_test, y_fert_temp, y_fert_test = \
            train_test_split(
                X, y_crop, y_fertilizer,
                test_size=Config.TEST_SIZE,
                random_state=Config.RANDOM_STATE,
                stratify=y_crop
            )
        
        X_train, X_val, y_crop_train, y_crop_val, y_fert_train, y_fert_val = \
            train_test_split(
                X_temp, y_crop_temp, y_fert_temp,
                test_size=Config.VAL_SIZE,
                random_state=Config.RANDOM_STATE,
                stratify=y_crop_temp
            )
        
        logger.info(f"\nDataset split:")
        logger.info(f"Training set: {X_train.shape[0]} samples")
        logger.info(f"Validation set: {X_val.shape[0]} samples")
        logger.info(f"Test set: {X_test.shape[0]} samples")
        
        # Create preprocessing pipeline
        preprocessor = create_preprocessing_pipeline(numeric_features, categorical_features)
        
        # Train crop model
        crop_model, crop_model_name, crop_f1 = train_model(
            X_train, y_crop_train,
            X_val, y_crop_val,
            preprocessor,
            model_name="crop"
        )
        
        # Train fertilizer model
        fertilizer_model, fert_model_name, fert_f1 = train_model(
            X_train, y_fert_train,
            X_val, y_fert_val,
            preprocessor,
            model_name="fertilizer"
        )
        
        # Create fertilizer-remark mapping
        fert_remark_map = create_fertilizer_remark_map(df)
        
        # Save models and metadata
        save_models_and_metadata(
            crop_model,
            fertilizer_model,
            fert_remark_map,
            {'model_name': crop_model_name, 'f1_macro': crop_f1},
            {'model_name': fert_model_name, 'f1_macro': fert_f1},
            numeric_features,
            categorical_features
        )
        
        logger.info("\n" + "="*60)
        logger.info("Training completed successfully!")
        logger.info("="*60)
        logger.info(f"Crop Model: {crop_model_name} (F1: {crop_f1:.4f})")
        logger.info(f"Fertilizer Model: {fert_model_name} (F1: {fert_f1:.4f})")
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()