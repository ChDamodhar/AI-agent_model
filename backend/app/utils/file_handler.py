import os
import uuid
import pandas as pd
import math
from typing import Dict, Any, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
REPORT_DIR = os.path.join(BASE_DIR, "reports")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def replace_nan_values(obj):
    """
    Recursively replaces NaN and inf values with None in dictionaries and lists.
    This makes the data JSON-serializable.
    """
    if isinstance(obj, dict):
        return {k: replace_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_values(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj

def save_upload_file(file_content: bytes, filename: str) -> Tuple[str, str]:
    """
    Saves the uploaded file to the uploads directory.
    Returns: (file_id, saved_file_path)
    """
    file_id = str(uuid.uuid4())
    _, ext = os.path.splitext(filename)
    if not ext:
        ext = ".csv"  # Default to csv if no ext
    
    saved_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_content)
        
    return file_id, file_path

def get_csv_metadata(file_path: str) -> Dict[str, Any]:
    """
    Reads CSV and extracts basic metadata.
    """
    try:
        # Load the dataframe to get metadata
        df_full = pd.read_csv(file_path)
        shape = df_full.shape
        columns = list(df_full.columns)
        dtypes = {col: str(dtype) for col, dtype in df_full.dtypes.items()}
        
        # Get head for preview
        preview = df_full.head(5).to_dict(orient="records")
        # Replace NaN values with None for JSON serialization
        preview = replace_nan_values(preview)
        
        return {
            "num_rows": shape[0],
            "num_cols": shape[1],
            "columns": columns,
            "data_types": dtypes,
            "preview": preview
        }
    except Exception as e:
        raise ValueError(f"Invalid CSV file: {str(e)}")

def get_file_path(file_id: str) -> str:
    """
    Gets path for a file ID.
    """
    # Assuming CSV for now
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File with ID {file_id} not found.")
    return file_path

def get_cleaned_file_path(file_id: str) -> str:
    """
    Gets path for the cleaned file ID.
    """
    return os.path.join(UPLOAD_DIR, f"{file_id}_cleaned.csv")

def get_engineered_file_path(file_id: str) -> str:
    """
    Gets path for the engineered file ID.
    """
    return os.path.join(UPLOAD_DIR, f"{file_id}_engineered.csv")


