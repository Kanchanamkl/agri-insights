import logging
from datetime import datetime
from typing import Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

def get_timestamp() -> str:
    """Return ISO-8601 formatted timestamp"""
    return datetime.utcnow().isoformat() + 'Z'

def safe_round(value: Any, decimals: int = 2) -> float:
    """Safely round numeric values"""
    try:
        return round(float(value), decimals)
    except (TypeError, ValueError):
        return 0.0
