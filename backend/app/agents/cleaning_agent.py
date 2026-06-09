import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any

class CleaningAgent:
    def __init__(self):
        pass

    def clean_dataset(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Detects and cleans missing values, duplicates, and outliers from a dataframe.
        
        Returns:
            Tuple[cleaned_df, cleaning_stats]
        """
        stats = {
            "original_shape": df.shape,
            "duplicates_removed": 0,
            "missing_values": 0,
            "outliers_detected": 0,
            "cleaned_shape": df.shape
        }

        # Make a copy to avoid modifying original dataframe in-place
        cleaned_df = df.copy()

        # 1. Duplicate Rows
        initial_rows = len(cleaned_df)
        cleaned_df.drop_duplicates(inplace=True)
        stats["duplicates_removed"] = initial_rows - len(cleaned_df)

        # 2. Missing Values Detection and Imputation
        missing_count_before = cleaned_df.isnull().sum().sum()
        stats["missing_values"] = int(missing_count_before)
        
        for col in cleaned_df.columns:
            null_count = cleaned_df[col].isnull().sum()
            if null_count > 0:
                if pd.api.types.is_numeric_dtype(cleaned_df[col]):
                    median_val = cleaned_df[col].median()
                    # If whole column is null, fill with 0
                    if pd.isnull(median_val):
                        median_val = 0
                    cleaned_df[col] = cleaned_df[col].fillna(median_val)
                else:
                    mode_series = cleaned_df[col].mode()
                    if not mode_series.empty:
                        mode_val = mode_series[0]
                    else:
                        mode_val = "Unknown"
                    cleaned_df[col] = cleaned_df[col].fillna(mode_val)

        # 3. Outliers Detection and Capping (IQR Method)
        for col in cleaned_df.columns:
            if pd.api.types.is_numeric_dtype(cleaned_df[col]):
                col_data = cleaned_df[col]
                # Calculate IQR
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                
                if iqr > 0:
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    
                    # Detect outliers
                    outliers_mask = (col_data < lower_bound) | (col_data > upper_bound)
                    outliers_count = outliers_mask.sum()
                    stats["outliers_detected"] += int(outliers_count)
                    
                    # Cap outliers
                    cleaned_df[col] = np.clip(col_data, lower_bound, upper_bound)

        stats["cleaned_shape"] = cleaned_df.shape

        return cleaned_df, {
            "missing_values": stats["missing_values"],
            "duplicates_removed": stats["duplicates_removed"],
            "outliers_detected": stats["outliers_detected"],
            "original_shape": list(stats["original_shape"]),
            "cleaned_shape": list(stats["cleaned_shape"])
        }
