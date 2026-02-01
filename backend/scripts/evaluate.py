import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

from config import Config
from src.utils.logging_config import setup_logging

logger = setup_logging(Config.LOG_FILE, Config.LOG_LEVEL)

def load_models():
    """Load saved models"""
    crop_model = joblib.load(Config.MODEL_DIR / 'crop_model.pkl')
    fertilizer_model = joblib.load(Config.MODEL_DIR / 'fertilizer_model.pkl')
    
    with open(Config.MODEL_DIR / 'metadata.json', 'r') as f:
        metadata = json.load(f)
    
    return crop_model, fertilizer_model, metadata

def load_test_data():
    """Load and split dataset to get test set"""
    from sklearn.model_selection import train_test_split
    
    df = pd.read_csv(Config.DATASET_PATH)
    
    numeric_features = [
        'Temperature', 'Moisture', 'Rainfall', 'PH',
        'Nitrogen', 'Phosphorous', 'Potassium', 'Carbon'
    ]
    categorical_features = ['Soil']
    
    X = df[numeric_features + categorical_features]
    y_crop = df['Crop']
    y_fertilizer = df['Fertilizer']
    
    # Recreate the same split
    X_temp, X_test, y_crop_temp, y_crop_test, y_fert_temp, y_fert_test = \
        train_test_split(
            X, y_crop, y_fertilizer,
            test_size=Config.TEST_SIZE,
            random_state=Config.RANDOM_STATE,
            stratify=y_crop
        )
    
    return X_test, y_crop_test, y_fert_test

def evaluate_model(model, X_test, y_test, model_name):
    """Evaluate model and print metrics"""
    logger.info(f"\n{'='*60}")
    logger.info(f"Evaluating {model_name} Model")
    logger.info(f"{'='*60}")
    
    y_pred = model.predict(X_test)
    
    # Classification report
    report = classification_report(y_test, y_pred, output_dict=True)
    
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred))
    
    return report

def save_metrics(crop_report, fert_report):
    """Save evaluation metrics to JSON"""
    Config.REPORTS_DIR.mkdir(exist_ok=True)
    
    metrics = {
        'crop_model': {
            'accuracy': crop_report['accuracy'],
            'macro_avg': crop_report['macro avg'],
            'weighted_avg': crop_report['weighted avg']
        },
        'fertilizer_model': {
            'accuracy': fert_report['accuracy'],
            'macro_avg': fert_report['macro avg'],
            'weighted_avg': fert_report['weighted avg']
        }
    }
    
    metrics_path = Config.REPORTS_DIR / 'metrics.json'
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    logger.info(f"\nMetrics saved to {metrics_path}")

def main():
    """Main evaluation pipeline"""
    try:
        logger.info("Loading models...")
        crop_model, fertilizer_model, metadata = load_models()
        
        logger.info("Loading test data...")
        X_test, y_crop_test, y_fert_test = load_test_data()
        
        # Evaluate crop model
        crop_report = evaluate_model(crop_model, X_test, y_crop_test, "Crop")
        
        # Evaluate fertilizer model
        fert_report = evaluate_model(fertilizer_model, X_test, y_fert_test, "Fertilizer")
        
        # Save metrics
        save_metrics(crop_report, fert_report)
        
        logger.info("\nEvaluation completed successfully!")
        
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()