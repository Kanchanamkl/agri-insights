# MICFRS Backend - Multi-Input Crop and Fertilizer Recommendation System

A Flask-based backend API that provides crop and fertilizer recommendations using machine learning models trained on soil and environmental data.

## Features

- **Dual Model Predictions**: Separate models for crop and fertilizer recommendations
- **RESTful API**: Clean API design with JSON request/response
- **MySQL Persistence**: Stores all predictions for future analytics
- **Request Validation**: Pydantic-based input validation
- **Structured Logging**: Rotating file logs with different levels
- **Production-Ready**: Modular code structure with proper error handling

## Prerequisites

- Python 3.10 or higher
- MySQL 8.0 or higher
- Windows OS (as per project requirements)

## Installation

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup MySQL Database

Create a new database in MySQL:

```sql
CREATE DATABASE micfrs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configure Environment

Create `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=micfrs_db
DB_USER=root
DB_PASSWORD=your_password
```

### 5. Initialize Database

Create database tables:

```bash
python scripts/init_database.py
```

**Expected Output:**
```
Database Initialization
============================================================
Connecting to database: micfrs_db
Creating database tables...
Database initialization completed successfully!
============================================================
Database: micfrs_db
Host: localhost:3306
Tables created:
  - prediction_logs
```

**Optional:** Seed sample data for testing:

```bash
python scripts/seed_sample_data.py
```

### 6. Verify Database Setup

Verify database connection and check table status:

```bash
python scripts/verify_database.py
```

**Expected Output:**
```
Database Verification
============================================================
Database: micfrs_db
Host: localhost:3306
User: root

Tables found: 1
  - prediction_logs

Prediction Logs Statistics:
  Total records: 0
============================================================
```

### 7. Prepare Dataset

Place your `fertilizer_recommendation_dataset.csv` in the `data/` directory:

```bash
mkdir data
# Copy your dataset to data/fertilizer_recommendation_dataset.csv
```

## Training Models

Before running the API, you must train the models:

```bash
python scripts/train.py
```

This will:
- Load and preprocess the dataset
- Train both crop and fertilizer models
- Evaluate models and select the best performers
- Save models to `models/` directory
- Create metadata file

**Expected Output:**
```
Crop Model: RandomForest (F1: 0.95)
Fertilizer Model: GradientBoosting (F1: 0.93)
```

## Running the API

Start the Flask server:

```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Database Operations

### Manual Table Creation

If you need to manually create tables using SQL:

```sql
CREATE TABLE prediction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Soil inputs
    nitrogen FLOAT NOT NULL,
    phosphorous FLOAT NOT NULL,
    potassium FLOAT NOT NULL,
    carbon FLOAT NOT NULL,
    ph FLOAT NOT NULL,
    soil_type VARCHAR(50) NOT NULL,
    moisture FLOAT NOT NULL,
    
    -- Environmental inputs
    rainfall FLOAT NOT NULL,
    temperature FLOAT NOT NULL,
    humidity FLOAT NOT NULL,
    
    -- Field context
    region VARCHAR(100),
    land_size FLOAT,
    irrigation_type VARCHAR(50),
    previous_crop VARCHAR(100),
    
    -- Predictions
    predicted_crop VARCHAR(100) NOT NULL,
    crop_confidence FLOAT NOT NULL,
    predicted_fertilizer VARCHAR(100) NOT NULL,
    fertilizer_confidence FLOAT NOT NULL,
    remark TEXT,
    
    -- Metadata
    model_version VARCHAR(50),
    raw_request_json JSON,
    raw_response_json JSON,
    
    INDEX idx_created_at (created_at),
    INDEX idx_crop (predicted_crop),
    INDEX idx_fertilizer (predicted_fertilizer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### View Stored Predictions

Connect to MySQL and query:

```sql
-- View latest predictions
SELECT id, predicted_crop, predicted_fertilizer, crop_confidence, fertilizer_confidence, created_at
FROM prediction_logs
ORDER BY created_at DESC
LIMIT 10;

-- Count predictions by crop
SELECT predicted_crop, COUNT(*) as count
FROM prediction_logs
GROUP BY predicted_crop
ORDER BY count DESC;

-- Count predictions by fertilizer
SELECT predicted_fertilizer, COUNT(*) as count
FROM prediction_logs
GROUP BY predicted_fertilizer
ORDER BY count DESC;

-- View full prediction details
SELECT *
FROM prediction_logs
WHERE id = 1;
```

### Clear All Data

To reset the database:

```sql
-- Delete all records
DELETE FROM prediction_logs;

-- Reset auto-increment
ALTER TABLE prediction_logs AUTO_INCREMENT = 1;
```

### Database Backup

Create a backup:

```bash
mysqldump -u root -p micfrs_db > backup_micfrs_$(date +%Y%m%d).sql
```

Restore from backup:

```bash
mysql -u root -p micfrs_db < backup_micfrs_20240101.sql
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "model_version": "v1.0_20240101_120000",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Make Prediction

```bash
POST /predict
Content-Type: application/json
```

Request Body:
```json
{
  "soil": {
    "nitrogen": 90,
    "phosphorus": 42,
    "potassium": 43,
    "carbon": 30,
    "pH": 6.5,
    "soilType": "Loamy",
    "moisture": 60
  },
  "environmental": {
    "rainfall": 202.9,
    "temperature": 26.5,
    "humidity": 80.3
  },
  "field": {
    "region": "Central",
    "landSize": 2.5,
    "irrigationType": "Drip",
    "previousCrop": "Rice"
  }
}
```

Response:
```json
{
  "success": true,
  "crop": {
    "label": "Maize",
    "confidence": 0.95,
    "top_k": [
      {"label": "Maize", "prob": 0.95},
      {"label": "Rice", "prob": 0.03},
      {"label": "Wheat", "prob": 0.02}
    ]
  },
  "fertilizer": {
    "label": "Urea",
    "confidence": 0.89,
    "top_k": [
      {"label": "Urea", "prob": 0.89},
      {"label": "DAP", "prob": 0.07},
      {"label": "NPK", "prob": 0.04}
    ]
  },
  "remark": "Apply urea in split doses for better nitrogen utilization",
  "meta": {
    "model_version": "v1.0_20240101_120000",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Sample cURL Request

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d @sample_request.json
```

## Feature Mapping

### Frontend → Dataset Mapping

| Frontend Field | Dataset Column | Notes |
|---------------|----------------|-------|
| `soil.phosphorus` | `Phosphorous` | Note spelling difference |
| `soil.pH` | `PH` | Case difference |
| `soil.nitrogen` | `Nitrogen` | Direct match |
| `soil.potassium` | `Potassium` | Direct match |
| `soil.carbon` | `Carbon` | Direct match |
| `soil.moisture` | `Moisture` | Direct match |
| `soil.soilType` | `Soil` | Must match dataset categories |
| `environmental.temperature` | `Temperature` | Direct match |
| `environmental.rainfall` | `Rainfall` | Direct match |
| `environmental.humidity` | `Humidity` | Direct match |

### Valid Soil Types

Ensure `soilType` matches one of the categories in your dataset (e.g., "Loamy", "Sandy", "Clay", "Black", "Red").

## Model Evaluation

To evaluate trained models on test data:

```bash
python scripts/evaluate.py
```

This generates:
- Classification reports for both models
- Metrics saved to `reports/metrics.json`

## Database Schema

### `prediction_logs` Table

Stores all prediction requests and results:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Auto-increment ID |
| `created_at` | TIMESTAMP | Record creation time |
| **Soil Inputs** | | |
| `nitrogen` | FLOAT | Nitrogen content |
| `phosphorous` | FLOAT | Phosphorus content |
| `potassium` | FLOAT | Potassium content |
| `carbon` | FLOAT | Carbon content |
| `ph` | FLOAT | Soil pH level |
| `soil_type` | VARCHAR(50) | Soil type |
| `moisture` | FLOAT | Soil moisture |
| **Environmental** | | |
| `rainfall` | FLOAT | Rainfall amount |
| `temperature` | FLOAT | Temperature |
| `humidity` | FLOAT | Humidity |
| **Field Context** | | |
| `region` | VARCHAR(100) | Geographic region |
| `land_size` | FLOAT | Land size |
| `irrigation_type` | VARCHAR(50) | Irrigation type |
| `previous_crop` | VARCHAR(100) | Previous crop |
| **Predictions** | | |
| `predicted_crop` | VARCHAR(100) | Recommended crop |
| `crop_confidence` | FLOAT | Crop confidence score |
| `predicted_fertilizer` | VARCHAR(100) | Recommended fertilizer |
| `fertilizer_confidence` | FLOAT | Fertilizer confidence |
| `remark` | TEXT | Additional remarks |
| **Metadata** | | |
| `model_version` | VARCHAR(50) | Model version used |
| `raw_request_json` | JSON | Full request payload |
| `raw_response_json` | JSON | Full response payload |

## Directory Structure

```
backend/
├── app.py                    # Flask application entry point
├── config.py                 # Configuration management
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (not in git)
├── .env.example              # Environment template
├── README.md                 # This file
├── data/                     # Dataset directory
│   └── fertilizer_recommendation_dataset.csv
├── models/                   # Saved models
│   ├── crop_model.pkl
│   ├── fertilizer_model.pkl
│   ├── fertilizer_remark_map.pkl
│   └── metadata.json
├── scripts/                  # Training and evaluation scripts
│   ├── train.py
│   ├── evaluate.py
│   ├── init_database.py      # Database initialization script
│   ├── seed_sample_data.py   # Seed sample data script
│   └── verify_database.py    # Verify database setup script
├── src/                      # Source code
│   ├── api/
│   │   ├── routes.py         # API endpoints
│   │   └── schemas.py        # Request/response validation
│   ├── ml/
│   │   ├── feature_mapper.py # Frontend → ML feature mapping
│   │   ├── predictor.py      # Prediction logic
│   │   ├── model_registry.py # Model loading
│   │   └── explainability.py # Model interpretation
│   ├── db/
│   │   ├── database.py       # Database connection
│   │   ├── models.py         # SQLAlchemy models
│   │   └── repository.py     # Data access layer
│   └── utils/
│       ├── logging_config.py # Logging setup
│       └── time_utils.py     # Time utilities
├── logs/                     # Application logs
│   └── app.log
└── reports/                  # Evaluation reports
    └── metrics.json
```

## Troubleshooting

### Models Not Found Error

```
FileNotFoundError: Crop model not found at models/crop_model.pkl
```

**Solution:** Run `python scripts/train.py` first to train models.

### Database Connection Error

```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

**Solution:**
1. Verify MySQL is running
2. Check credentials in `.env`
3. Ensure database `micfrs_db` exists

### Table Does Not Exist Error

```
sqlalchemy.exc.ProgrammingError: (pymysql.err.ProgrammingError) (1146, "Table 'micfrs_db.prediction_logs' doesn't exist")
```

**Solution:**
1. Run database initialization: `python scripts/init_database.py`
2. Or restart the Flask app - tables are created automatically

### No Data Appears in Database

**Verify the `/predict` endpoint is being called successfully:**
1. Check logs: `logs/app.log`
2. Verify database connection
3. Test with curl request
4. Check for database errors in logs

### Import Errors

```
ModuleNotFoundError: No module named 'flask'
```

**Solution:**
1. Activate virtual environment: `venv\Scripts\activate`
2. Install dependencies: `pip install -r requirements.txt`

## Logging

Logs are written to `logs/app.log` with rotation (max 10MB per file, 5 backups).

Log levels:
- DEBUG: Detailed diagnostic information
- INFO: General informational messages
- WARNING: Warning messages
- ERROR: Error messages
- CRITICAL: Critical errors

## Dataset Assumptions

The training pipeline assumes:
1. Dataset has columns: Temperature, Moisture, Rainfall, PH, Nitrogen, Phosphorous, Potassium, Carbon, Soil, Crop, Fertilizer, Remark
2. No missing values in feature columns
3. Categorical 'Soil' column contains consistent values
4. Target variables (Crop, Fertilizer) are properly labeled

## Development

### Adding New Features

1. Update `FeatureMapper.FEATURE_MAP` in `src/ml/feature_mapper.py`
2. Update request schema in `src/api/schemas.py`
3. Retrain models with new features

### Changing Models

Edit `scripts/train.py` to add/remove model candidates from the `models` dictionary.

## License

[Your License Here]

## Contact

[Your Contact Information]