import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List

class FeatureEngineeringAgent:
    def __init__(self):
        pass

    def detect_column_types(self, df: pd.DataFrame, target_column: str = None) -> Dict[str, List[str]]:
        """
        Dynamically detects column types in the dataframe, excluding the target column.
        """
        types = {
            "numerical": [],
            "categorical": [],
            "datetime": [],
            "text": []
        }

        for col in df.columns:
            if col == target_column:
                continue

            # Check if datetime
            is_dt = False
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                is_dt = True
            elif df[col].dtype == object or str(df[col].dtype) in ['string', 'str', 'object']:
                # Check for date-like names and parseability
                col_lower = col.lower()
                if any(kw in col_lower for kw in ["date", "time", "timestamp", "created", "updated"]):
                    try:
                        pd.to_datetime(df[col], errors='raise')
                        is_dt = True
                    except Exception:
                        pass
            
            if is_dt:
                types["datetime"].append(col)
                continue

            # Check if numeric
            if pd.api.types.is_numeric_dtype(df[col]):
                # If numeric but only has 2 unique values (like binary indicators 0 and 1),
                # we don't scale it, but keep it in numerical lists
                types["numerical"].append(col)
                continue

            # Non-numeric columns (categorical or text)
            cardinality = df[col].nunique()
            if cardinality < 20:
                types["categorical"].append(col)
            else:
                types["text"].append(col)

        return types

    def transform(self, df: pd.DataFrame, target_column: str = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Applies scaling, encoding, and extraction transformations to the dataset.
        Returns:
            Tuple[transformed_df, engineering_report]
        """
        engineered_df = df.copy()
        transformations = []

        # Detect types
        col_types = self.detect_column_types(engineered_df, target_column)
        
        # 1. Datetime feature extraction
        for col in col_types["datetime"]:
            if col in engineered_df.columns:
                try:
                    dt_series = pd.to_datetime(engineered_df[col])
                    engineered_df[f"{col}_year"] = dt_series.dt.year
                    engineered_df[f"{col}_month"] = dt_series.dt.month
                    engineered_df[f"{col}_quarter"] = dt_series.dt.quarter
                    engineered_df[f"{col}_day"] = dt_series.dt.day
                    engineered_df[f"{col}_dayofweek"] = dt_series.dt.dayofweek
                    
                    engineered_df.drop(columns=[col], inplace=True)
                    transformations.append(f"Extracted date parts (year, month, quarter, day, day of week) from datetime column '{col}'")
                except Exception as e:
                    transformations.append(f"Failed to parse datetime for column '{col}': {str(e)}")

        # 2. Categorical One-Hot Encoding
        for col in col_types["categorical"]:
            if col in engineered_df.columns:
                try:
                    # Convert to string to avoid numeric representation issues in categories
                    cat_series = engineered_df[col].astype(str)
                    dummies = pd.get_dummies(cat_series, prefix=col, drop_first=True, dtype=int)
                    engineered_df = pd.concat([engineered_df.drop(columns=[col]), dummies], axis=1)
                    transformations.append(f"Applied One-Hot Encoding to categorical column '{col}'")
                except Exception as e:
                    transformations.append(f"Failed to encode categorical column '{col}': {str(e)}")

        # 3. Drop High-Cardinality Text columns
        for col in col_types["text"]:
            if col in engineered_df.columns:
                engineered_df.drop(columns=[col], inplace=True)
                transformations.append(f"Dropped high-cardinality text column '{col}' to prevent overfitting in tabular models")

        # 4. Numerical Scaling (Z-score Standardization)
        # Apply standard scaling only to continuous numeric features (e.g., more than 10 unique values)
        for col in col_types["numerical"]:
            if col in engineered_df.columns and col != target_column:
                unique_vals = engineered_df[col].nunique()
                # Skip binary flags / indicators (0 and 1)
                if unique_vals > 2:
                    try:
                        mean_val = float(engineered_df[col].mean())
                        std_val = float(engineered_df[col].std())
                        
                        if std_val > 0:
                            engineered_df[col] = (engineered_df[col] - mean_val) / std_val
                            transformations.append(f"Standardized continuous column '{col}' (mean={mean_val:.2f}, std={std_val:.2f})")
                        else:
                            # Standard deviation is 0 (constant column), we can drop it
                            engineered_df.drop(columns=[col], inplace=True)
                            transformations.append(f"Dropped constant numeric column '{col}' (std=0)")
                    except Exception as e:
                        transformations.append(f"Failed to scale numerical column '{col}': {str(e)}")

        # Clean up columns order: place target at the end if it exists
        if target_column in engineered_df.columns:
            target_series = engineered_df[target_column]
            engineered_df.drop(columns=[target_column], inplace=True)
            engineered_df[target_column] = target_series

        report = {
            "columns_detected": col_types,
            "transformations_applied": transformations,
            "original_shape": list(df.shape),
            "engineered_shape": list(engineered_df.shape),
            "engineered_columns": list(engineered_df.columns)
        }

        return engineered_df, report
