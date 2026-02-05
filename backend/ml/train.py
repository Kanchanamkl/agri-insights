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

logger = get_logger(__name__)

class ModelTrainer:
    def __init__(self):
        self.df = None
        self.crop_model = None
        self.fertilizer_model = None
        self.remark_map = None
        self.metadata = {}
        
    def load_data(self):
        """Load and validate dataset"""
        logger.info(f"Loading dataset from {config.DATASET_PATH}")
        self.df = pd.read_csv(config.DATASET_PATH)
        
        required_cols = [
            'Temperature', 'Moisture', 'Rainfall', 'PH',
            'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon',
            'Soil', 'Crop', 'Fertilizer', 'Remark'
        ]
        
        missing = set(required_cols) - set(self.df.columns)
        if missing:
            raise ValueError(f"Missing columns: {missing}")
        
        logger.info(f"Dataset loaded: {len(self.df)} rows, {len(self.df.columns)} columns")
        logger.info(f"Soil types: {self.df['Soil'].unique().tolist()}")
        logger.info(f"Crop classes: {self.df['Crop'].nunique()}")
        logger.info(f"Fertilizer classes: {self.df['Fertilizer'].nunique()}")
        
    def prepare_features(self):
        """Prepare feature matrix and targets"""
        feature_cols = [
            'Temperature', 'Moisture', 'Rainfall', 'PH',
            'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon', 'Soil'
        ]
        
        X = self.df[feature_cols].copy()
        y_crop = self.df['Crop'].copy()
        y_fertilizer = self.df['Fertilizer'].copy()
        
        # Build remark map: fertilizer -> most common remark
        self.remark_map = {}
        for fert in y_fertilizer.unique():
            remarks = self.df[self.df['Fertilizer'] == fert]['Remark']
            self.remark_map[fert] = remarks.mode()[0] if len(remarks) > 0 else ""
        
        return X, y_crop, y_fertilizer, feature_cols
    
    def build_preprocessor(self, feature_cols):
        """Build preprocessing pipeline"""
        numeric_features = [
            'Temperature', 'Moisture', 'Rainfall', 'PH',
            'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon'
        ]
        categorical_features = ['Soil']
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numeric_features),
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
            ]
        )
        
        return preprocessor
    
    def train_model(self, X, y, task_name='crop'):
        """Train model with hyperparameter tuning"""
        logger.info(f"Training {task_name} model...")
        
        # Stratified split
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42, stratify=y
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=0.15, random_state=42, stratify=y_temp
        )
        
        logger.info(f"Split: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
        
        # Build preprocessor
        preprocessor = self.build_preprocessor(X.columns.tolist())
        
        # Model candidates
        models = {
            'LogisticRegression': LogisticRegression(
                multi_class='multinomial',
                max_iter=1000,
                random_state=42
            ),
            'RandomForest': RandomForestClassifier(random_state=42),
            'GradientBoosting': GradientBoostingClassifier(random_state=42)
        }
        
        param_grids = {
            'LogisticRegression': {
                'classifier__C': [0.1, 1, 10],
                'classifier__solver': ['lbfgs']  # Reduced from ['lbfgs', 'saga']
            },
            'RandomForest': {
                'classifier__n_estimators': [100],  # Reduced from [100, 200]
                'classifier__max_depth': [10, 20],  # Reduced from [10, 20, None]
                'classifier__min_samples_split': [2]  # Reduced from [2, 5]
            },
            'GradientBoosting': {
                'classifier__n_estimators': [100],  # Reduced from [100, 200]
                'classifier__learning_rate': [0.1],  # Reduced from [0.05, 0.1]
                'classifier__max_depth': [3]  # Reduced from [3, 5]
            }
        }
        
        best_score = 0
        best_model = None
        best_name = None
        
        for name, clf in models.items():
            logger.info(f"  Testing {name}...")
            pipeline = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', clf)
            ])
            
            search = RandomizedSearchCV(
                pipeline,
                param_grids[name],
                n_iter=3,  # Changed from 10 to 3
                cv=3,
                scoring='f1_macro',
                random_state=42,
                n_jobs=-1
            )
            
            search.fit(X_train, y_train)
            score = search.best_score_
            
            logger.info(f"    {name} CV F1-macro: {score:.4f}")
            
            if score > best_score:
                best_score = score
                best_model = search.best_estimator_
                best_name = name
        
        logger.info(f"  Best model: {best_name} (F1={best_score:.4f})")
        
        # Evaluate on test set
        y_pred = best_model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        f1_macro = f1_score(y_test, y_pred, average='macro')
        f1_weighted = f1_score(y_test, y_pred, average='weighted')
        
        logger.info(f"  Test accuracy: {acc:.4f}")
        logger.info(f"  Test F1-macro: {f1_macro:.4f}")
        logger.info(f"  Test F1-weighted: {f1_weighted:.4f}")
        
        report = {
            'task': task_name,
            'best_model': best_name,
            'cv_f1_macro': float(best_score),
            'test_accuracy': float(acc),
            'test_f1_macro': float(f1_macro),
            'test_f1_weighted': float(f1_weighted),
            'classification_report': classification_report(y_test, y_pred),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'classes': sorted(y.unique().tolist())
        }
        
        return best_model, report
    
    def train_all(self):
        """Train both crop and fertilizer models"""
        self.load_data()
        X, y_crop, y_fertilizer, feature_cols = self.prepare_features()
        
        # Train crop model
        self.crop_model, crop_report = self.train_model(X, y_crop, 'crop')
        
        # Train fertilizer model
        self.fertilizer_model, fertilizer_report = self.train_model(X, y_fertilizer, 'fertilizer')
        
        # Prepare metadata
        self.metadata = {
            'model_version': 'v1.0',
            'sklearn_version': sklearn.__version__,
            'training_date': datetime.utcnow().isoformat() + 'Z',
            'feature_names': feature_cols,
            'crop_classes': sorted(y_crop.unique().tolist()),
            'fertilizer_classes': sorted(y_fertilizer.unique().tolist()),
            'soil_types': sorted(self.df['Soil'].unique().tolist()),
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
        
        logger.info("Saving models...")
        joblib.dump(self.crop_model, config.CROP_MODEL_PATH)
        joblib.dump(self.fertilizer_model, config.FERTILIZER_MODEL_PATH)
        joblib.dump(self.remark_map, config.REMARK_MAP_PATH)
        
        with open(config.METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        
        logger.info(f"Models saved to {config.MODELS_DIR}")

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

if __name__ == '__main__':
    main()
