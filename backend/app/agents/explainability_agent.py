import os
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import shap
from typing import Dict, Any, List, Tuple

class ExplainabilityAgent:
    def __init__(self):
        pass

    def _get_shap_matrix(self, shap_values) -> np.ndarray:
        """
        Extracts a 2D numpy array of SHAP values from various return types
        (Explanation object, list of arrays, multi-dimensional array).
        """
        # Explanation object
        if hasattr(shap_values, "values"):
            values = shap_values.values
        else:
            values = shap_values
            
        # List of classes (for classification)
        if isinstance(values, list):
            if len(values) > 1:
                return values[1]  # positive class
            return values[0]
            
        # Numpy array
        if isinstance(values, np.ndarray):
            # Shape (n_samples, n_features, n_classes)
            if len(values.shape) == 3:
                if values.shape[2] > 1:
                    return values[:, :, 1]
                return values[:, :, 0]
            return values
            
        raise ValueError("Could not parse SHAP values format.")

    def generate_explanations(
        self, 
        df: pd.DataFrame, 
        target_column: str, 
        model_path: str, 
        report_dir: str, 
        file_id: str
    ) -> Dict[str, Any]:
        """
        Computes SHAP values, generates feature importances, 
        saves a summary plot, and returns summary data.
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")

        model = joblib.load(model_path)
        
        # Prepare data
        X = df.drop(columns=[target_column])
        
        # Downsample features for SHAP to a representative subset to optimize execution speed
        X_shap = X.sample(min(300, len(X)), random_state=42)
        
        model_name = model.__class__.__name__
        
        # Select appropriate SHAP Explainer
        explainer = None
        shap_values = None
        
        # Linear models
        if hasattr(model, "coef_") and not model_name.startswith("RandomForest"):
            try:
                explainer = shap.LinearExplainer(model, X_shap)
                shap_values = explainer(X_shap)
            except Exception:
                pass
                
        # Tree models / general models fallback
        if shap_values is None:
            try:
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(X_shap)
            except Exception:
                try:
                    explainer = shap.Explainer(model, X_shap)
                    shap_values = explainer(X_shap)
                except Exception:
                    # Fallback to KernelExplainer with limited background
                    background = X_shap.sample(min(50, len(X_shap)), random_state=42)
                    explainer = shap.KernelExplainer(model.predict, background)
                    shap_values = explainer.shap_values(X_shap)

        # Parse SHAP values matrix
        shap_matrix = self._get_shap_matrix(shap_values)
        
         # Calculate feature importance
        mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)
        
        feature_importance = []
        for col, imp in zip(X_shap.columns, mean_abs_shap):
            feature_importance.append({
                "feature": col,
                "importance": float(imp)
            })
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        
        # Save summary plot
        os.makedirs(report_dir, exist_ok=True)
        plot_filename = f"{file_id}_shap_summary.png"
        plot_path = os.path.join(report_dir, plot_filename)
        
        plt.figure(figsize=(10, 6))
        # shap.summary_plot can accept Explanation objects or raw values + data
        if hasattr(shap_values, "values"):
            shap.summary_plot(shap_values, X_shap, show=False)
        else:
            shap.summary_plot(shap_matrix, X_shap, show=False)
            
        plt.tight_layout()
        plt.savefig(plot_path, dpi=150)
        plt.close()
        
        return {
            "model_name": model_name,
            "feature_importance": feature_importance,
            "shap_plot_path": plot_filename
        }
