from __future__ import annotations

import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
from sklearn.model_selection import train_test_split, RandomizedSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
import sklearn
from config import config
from utils.helpers import get_logger
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

logger = get_logger(__name__)

FEATURE_COLUMNS = [
    "Temperature",
    "Moisture",
    "Rainfall",
    "PH",
    "Nitrogen",
    "Phosphorous",
    "Potassium",
    "Carbon",
    "Humidity",
    "NPK_Sum",
    "PH_Stress",
    "Rain_Temp_Balance",
    "Soil",  # <-- ADD: training must include Soil because inference provides it and model expects it
]

TARGET_CROP = "Crop"
TARGET_FERT = "Fertilizer"
TARGET_REMARK = "Remark"

NUMERIC_FEATURES = [
    "Temperature",
    "Moisture",
    "Rainfall",
    "PH",
    "Nitrogen",
    "Phosphorous",
    "Potassium",
    "Carbon",
    "Humidity",
    "NPK_Sum",
    "PH_Stress",
    "Rain_Temp_Balance",
]
CATEGORICAL_FEATURES = ["Soil"]

DEFAULT_DATASET = Path(__file__).resolve().parents[1] / "data" / "enhanced_crop_fertlizer_dataset.csv"
DEFAULT_OUT_DIR = Path(__file__).resolve().parents[0] / "artifacts"  # backend/ml/artifacts/

@dataclass(frozen=True)
class TrainOutputs:
    crop_model_path: Path
    fert_model_path: Path
    remark_map_path: Path
    feature_names_path: Path

def load_dataset(csv_path: str):
    import pandas as pd
    df = pd.read_csv(csv_path)

    # Drop anything not needed; hard-enforce training schema
    missing = [c for c in FEATURE_COLUMNS + [TARGET_CROP, TARGET_FERT, TARGET_REMARK] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    X = df[FEATURE_COLUMNS].copy()
    y_crop = df[TARGET_CROP].copy()
    y_fert = df[TARGET_FERT].copy()

    # remark_map purely by fertilizer label (no Field Context)
    remark_map = (
        df[[TARGET_FERT, TARGET_REMARK]]
        .dropna()
        .drop_duplicates(subset=[TARGET_FERT])
        .set_index(TARGET_FERT)[TARGET_REMARK]
        .to_dict()
    )

    return X, y_crop, y_fert, remark_map

class ModelTrainer:
    def __init__(self):
        self.df = None
        self.crop_model = None
        self.fertilizer_model = None
        self.remark_map = None
        self.metadata = {}
        
    def load_data(self):
        """Load, validate, and aggressively clean dataset"""
        logger.info(f"Loading dataset from {config.DATASET_PATH}")
        self.df = pd.read_csv(config.DATASET_PATH)
        
        required_cols = FEATURE_COLUMNS + [TARGET_CROP, TARGET_FERT, TARGET_REMARK]
        
        missing = set(required_cols) - set(self.df.columns)
        if missing:
            raise ValueError(f"Missing columns: {missing}")

        # --- DATA CLEANING PHASE ---
        initial_count = len(self.df)
        
        # 1. Remove impossible physical values
        self.df = self.df[self.df['Rainfall'] >= 0]
        self.df = self.df[self.df['Temperature'].between(10, 50)]
        self.df = self.df[self.df['PH'].between(3, 10)]
        self.df = self.df[self.df['Potassium'] >= -1] # allowing slight negative if it's a sensor error, but usually >=0
        
        # 2. Remove exact duplicates that cause overfitting
        self.df = self.df.drop_duplicates(subset=FEATURE_COLUMNS)
        
        cleaned_count = len(self.df)
        logger.info(f"Cleaning complete: Removed {initial_count - cleaned_count} rows of noise/duplicates.")
        
        logger.info(f"Dataset ready: {len(self.df)} rows")
        logger.info(f"Crop classes: {self.df['Crop'].nunique()}, Fertilizer classes: {self.df['Fertilizer'].nunique()}")
        
    def prepare_features(self):
        """Prepare feature matrix and targets"""
        X = self.df[FEATURE_COLUMNS].copy()
        y_crop = self.df[TARGET_CROP].copy()
        y_fertilizer = self.df[TARGET_FERT].copy()
        
        # Build remark map: fertilizer -> most common remark
        logger.info("Building fertilizer-to-remark mapping...")
        self.remark_map = (
            self.df[[TARGET_FERT, TARGET_REMARK]]
            .dropna()
            .drop_duplicates(subset=[TARGET_FERT])
            .set_index(TARGET_FERT)[TARGET_REMARK]
            .to_dict()
        )
        
        logger.info(f"Created remark map for {len(self.remark_map)} fertilizer types")
        
        return X, y_crop, y_fertilizer
    
    def build_preprocessor(self, feature_cols):
        """Build preprocessing pipeline"""
        numeric_features = [
            'Temperature', 'Moisture', 'Rainfall', 'PH',
            'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon',
            'Humidity', 'NPK_Sum', 'PH_Stress', 'Rain_Temp_Balance'
        ]
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numeric_features)
            ]
        )
        
        return preprocessor
    
    def train_model(self, X, y, task_name="crop"):
        logger.info(f"Training {task_name} with Hyperparameter Tuning...")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42, stratify=y
        )

        # Preprocessor setup (Numerical + Categorical)
        numeric_features = [c for c in X.columns if c != "Soil"]
        categorical_features = ["Soil"]

        preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), numeric_features),
                ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ],
            remainder="drop",
        )

        pipeline = Pipeline(
            [
                ("preprocessor", preprocessor),
                ("classifier", RandomForestClassifier(random_state=42)),
            ]
        )

        # This is what makes it take time but increases accuracy
        param_grid = {
            'classifier__n_estimators': [300, 500, 1000],
            'classifier__max_depth': [20, 40, None],
            'classifier__min_samples_split': [2, 5]
        }

        # Increase n_iter to 10 or 20 for better results
        search = RandomizedSearchCV(pipeline, param_grid, n_iter=10, cv=3, n_jobs=-1)
        search.fit(X_train, y_train)

        best_model = search.best_estimator_
        acc = accuracy_score(y_test, best_model.predict(X_test))
        
        # FIX THE KEYERROR HERE:
        report = {
            'task': task_name,
            'best_model': 'RandomForest (Tuned)',
            'test_accuracy': float(acc),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'val_samples': 0, # Explicitly add this so the print function doesn't crash
            'classes': sorted(y.unique().tolist())
        }
        
        return best_model, report   
    
    def train_all(self):
        """Train both crop and fertilizer models"""
        self.load_data()
        X, y_crop, y_fertilizer = self.prepare_features()
        
        # Train crop model
        self.crop_model, crop_report = self.train_model(X, y_crop, 'crop')
        
        # Train fertilizer model
        self.fertilizer_model, fertilizer_report = self.train_model(X, y_fertilizer, 'fertilizer')
        
        # Prepare metadata
        self.metadata = {
            'model_version': 'v1.0',
            'sklearn_version': sklearn.__version__,
            'training_date': datetime.utcnow().isoformat() + 'Z',
            'feature_names': FEATURE_COLUMNS,
            'crop_classes': sorted(y_crop.unique().tolist()),
            'fertilizer_classes': sorted(y_fertilizer.unique().tolist()),
            'soil_types': sorted(self.df['Soil'].unique().tolist()),
            'remark_map_size': len(self.remark_map),
            'normalization_maps': {
                'soil_type_mapping': {
                    'loamy': 'Loamy Soil',
                    'peaty': 'Peaty Soil',
                    'acidic': 'Acidic Soil',
                    'neutral': 'Neutral Soil',
                    'alkaline': 'Alkaline Soil'
                }
            }
        }
        
        # Combine reports
        training_report = {
            'crop': crop_report,
            'fertilizer': fertilizer_report,
            'metadata': self.metadata
        }
        
        return training_report
    
    def save_models(self):
        """Save trained models and metadata"""
        os.makedirs(config.MODELS_DIR, exist_ok=True)
        
        logger.info("Saving models and artifacts...")
        
        # Save ML models
        joblib.dump(self.crop_model, config.CROP_MODEL_PATH)
        logger.info(f"  ✓ Crop model saved to {config.CROP_MODEL_PATH}")
        
        joblib.dump(self.fertilizer_model, config.FERTILIZER_MODEL_PATH)  # should point to fert_model.joblib
        logger.info(f"  ✓ Fertilizer model saved to {config.FERTILIZER_MODEL_PATH}")
        
        # Save remark map
        joblib.dump(self.remark_map, config.REMARK_MAP_PATH)
        logger.info(f"  ✓ Remark map saved to {config.REMARK_MAP_PATH}")
        
        # Save metadata
        with open(config.METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        logger.info(f"  ✓ Metadata saved to {config.METADATA_PATH}")
        
        logger.info(f"\nAll artifacts saved to {config.MODELS_DIR}")


def print_training_summary(training_report):
    """Print a detailed training summary for both models safely"""
    
    print("\n" + "="*80)
    print(" "*25 + "TRAINING SUMMARY")
    print("="*80)
    
    # Process both models (crop and fertilizer)
    for model_key in ['crop', 'fertilizer']:
        if model_key not in training_report:
            continue
            
        report = training_report[model_key]
        model_name = "CROP RECOMMENDATION" if model_key == 'crop' else "FERTILIZER RECOMMENDATION"
        
        print("\n" + "─"*80)
        print(f"  {model_name} MODEL")
        print("─"*80)
        print(f"  Model Algorithm:        {report.get('best_model', 'Unknown')}")
        print(f"  Number of Classes:      {report.get('num_classes', 'N/A')}")
        print(f"  Training Samples:       {report.get('train_samples', 0)}")
        print(f"  Validation Samples:     {report.get('val_samples', 0)}")
        print(f"  Test Samples:           {report.get('test_samples', 0)}")
        print()
        print("  Performance Metrics:")
        # We check accuracy_score if test_accuracy is missing
        acc = report.get('test_accuracy', 0)
        print(f"    • Test Accuracy:                {acc:.4f} ({acc*100:.2f}%)")
        # print(f"    • Test F1-Score (Macro):        {report.get('test_f1_macro', 0):.4f}")
        # print(f"    • Test F1-Score (Weighted):     {report.get('test_f1_weighted', 0):.4f}")
        
        if 'classes' in report:
            print()
            print(f"  Classes ({len(report['classes'])}):")
            classes_str = ", ".join(report['classes'][:10])
            if len(report['classes']) > 10:
                classes_str += f", ... (+{len(report['classes']) - 10} more)"
            print(f"    {classes_str}")

    # Metadata Section
    if 'metadata' in training_report:
        metadata = training_report['metadata']
        print("\n" + "─"*80)
        print("  ADDITIONAL INFO")
        print("─"*80)
        print(f"  Model Version:          {metadata.get('model_version', 'v1.0')}")
        print(f"  Sklearn Version:        {metadata.get('sklearn_version', 'N/A')}")
        print(f"  Training Date:          {metadata.get('training_date', 'N/A')}")
        print(f"  Soil Types:             {len(metadata.get('soil_types', []))}")

    print("\n" + "="*80)
    print(" "*25 + "TRAINING COMPLETED")
    print("="*80 + "\n")

def main():
    """Main training script"""
    logger.info("="*60)
    logger.info("Starting model training")
    logger.info("="*60)
    
    trainer = ModelTrainer()
    training_report = trainer.train_all()
    trainer.save_models()
    
    # Save training report
    report_path = os.path.join(config.MODELS_DIR, 'training_report.json')
    with open(report_path, 'w') as f:
        json.dump(training_report, f, indent=2)
    
    logger.info(f"Training report saved to {report_path}")
    logger.info("="*60)
    logger.info("Training completed successfully!")
    logger.info("="*60)
    
    # Print detailed summary
    print_training_summary(training_report)

if __name__ == '__main__':
    main()