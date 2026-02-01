from datetime import datetime
from typing import Optional

def get_current_timestamp() -> str:
    """Get current timestamp in ISO 8601 format"""
    return datetime.utcnow().isoformat() + 'Z'

def parse_timestamp(timestamp_str: str) -> Optional[datetime]:
    """Parse ISO 8601 timestamp string to datetime"""
    try:
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None

def format_datetime(dt: datetime) -> str:
    """Format datetime to ISO 8601 string"""
    return dt.isoformat() + 'Z' if dt else None
