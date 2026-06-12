import os
import joblib
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import (
    RandomForestClassifier, 
    RandomForestRegressor, 
    HistGradientBoostingClassifier, 
    HistGradientBoostingRegressor
)
from sklearn.metrics import (
    accuracy_score, 
    f1_score, 
    roc_auc_score, 
    r2_score, 
    mean_squared_error, 
    mean_absolute_error
)

class ModelSelectionAgent:
    def __init__(self):
        pass

    @staticmethod
    def _safe_float(val, default=0.0):
        """Converts value to float, replacing NaN/Inf with a safe default."""
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return f

    def detect_problem_type(self, df: pd.DataFrame, target_column: str) -> str:
        """
        Detects if the target column points to a classification or regression problem.
        """
        target_series = df[target_column].dropna()
        if pd.api.types.is_float_dtype(target_series):
            return "regression"
        
        unique_count = target_series.nunique()
        if unique_count <= 10:
            return "classification"
        else:
            return "regression"

    def train_and_evaluate(self, df: pd.DataFrame, target_column: str, report_dir: str, file_id: str) -> Dict[str, Any]:
        """
        Trains multiple ML models, computes comparative evaluation metrics, 
        selects the best model, and serializes it using joblib.
        """
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in the dataset.")

        problem_type = self.detect_problem_type(df, target_column)
        
        # Split features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]

        # Convert targets appropriately to avoid training warnings/errors
        if problem_type == "classification":
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)), index=y.index)

        # Train-Test Split (80/20)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        if problem_type == "classification":
            y_train = y_train.astype(int)
            y_test = y_test.astype(int)
        else:
            y_train = y_train.astype(float)
            y_test = y_test.astype(float)

        models = {}
        leaderboard = []

        if problem_type == "classification":
            # 1. Logistic Regression
            models["Logistic Regression"] = LogisticRegression(max_iter=1000, random_state=42)
            
            # 2. Random Forest Classifier
            models["Random Forest"] = RandomForestClassifier(random_state=42)
            
            # 3. XGBoost Classifier
            try:
                from xgboost import XGBClassifier
                models["XGBoost"] = XGBClassifier(random_state=42, eval_metric="logloss")
            except Exception:
                models["XGBoost"] = HistGradientBoostingClassifier(random_state=42)

            # 4. LightGBM Classifier
            try:
                from lightgbm import LGBMClassifier
                import logging
                logging.getLogger("lightgbm").setLevel(logging.ERROR)
                models["LightGBM"] = LGBMClassifier(random_state=42, verbose=-1)
            except Exception:
                # Fallback if lightgbm import/initialization fails
                pass
            
            # Train and evaluate classification models
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    
                    acc = self._safe_float(accuracy_score(y_test, y_pred))
                    f1 = self._safe_float(f1_score(y_test, y_pred, average="weighted"))
                    
                    # Compute ROC-AUC safely — requires at least 2 classes in y_test
                    roc_auc = 0.5
                    n_classes_in_test = len(np.unique(y_test))
                    if n_classes_in_test >= 2:
                        try:
                            if n_classes_in_test == 2:
                                if hasattr(model, "predict_proba"):
                                    y_prob = model.predict_proba(X_test)[:, 1]
                                    roc_auc = self._safe_float(roc_auc_score(y_test, y_prob), 0.5)
                                else:
                                    roc_auc = self._safe_float(roc_auc_score(y_test, y_pred), 0.5)
                            else:
                                if hasattr(model, "predict_proba"):
                                    y_prob = model.predict_proba(X_test)
                                    roc_auc = self._safe_float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted"), 0.5)
                        except Exception:
                            roc_auc = 0.5
                        
                    leaderboard.append({
                        "model_name": name,
                        "accuracy": acc,
                        "f1_score": f1,
                        "roc_auc": roc_auc
                    })
                except Exception as e:
                    print(f"Failed to train classification model {name}: {e}")

            # Sort leaderboard by F1 score descending
            leaderboard.sort(key=lambda x: x["f1_score"], reverse=True)
            best_model_name = leaderboard[0]["model_name"]
            best_model = models[best_model_name]
            best_metrics = leaderboard[0]

        else:
            # 1. Linear Regression
            models["Linear Regression"] = LinearRegression()
            
            # 2. Random Forest Regressor
            models["Random Forest Regressor"] = RandomForestRegressor(random_state=42)
            
            # 3. XGBoost Regressor
            try:
                from xgboost import XGBRegressor
                models["XGBoost Regressor"] = XGBRegressor(random_state=42)
            except Exception:
                models["XGBoost Regressor"] = HistGradientBoostingRegressor(random_state=42)

            # Train and evaluate regression models
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    
                    r2 = self._safe_float(r2_score(y_test, y_pred))
                    mse = self._safe_float(mean_squared_error(y_test, y_pred))
                    mae = self._safe_float(mean_absolute_error(y_test, y_pred))
                    
                    leaderboard.append({
                        "model_name": name,
                        "r2_score": r2,
                        "mse": mse,
                        "mae": mae
                    })
                except Exception as e:
                    print(f"Failed to train regression model {name}: {e}")

            # Sort leaderboard by R2 score descending
            leaderboard.sort(key=lambda x: x["r2_score"], reverse=True)
            best_model_name = leaderboard[0]["model_name"]
            best_model = models[best_model_name]
            best_metrics = leaderboard[0]

        # Save best model to disk
        os.makedirs(report_dir, exist_ok=True)
        model_filename = f"{file_id}_best_model.joblib"
        model_path = os.path.join(report_dir, model_filename)
        joblib.dump(best_model, model_path)

        return {
            "problem_type": problem_type,
            "leaderboard": leaderboard,
            "best_model_name": best_model_name,
            "best_model_metrics": best_metrics,
            "saved_model_path": model_filename
        }

