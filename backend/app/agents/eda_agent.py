import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, List

class EDAAgent:
    def __init__(self):
        pass

    def perform_eda(self, df: pd.DataFrame, target_column: str = None) -> Dict[str, Any]:
        """
        Computes statistical properties of the dataset.
        """
        # Determine target column if not specified
        if not target_column:
            target_column = self.detect_target_column(df)

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

        # 1. Numerical Analysis
        numerical_summary = {}
        for col in numeric_cols:
            col_data = df[col].dropna()
            if not col_data.empty:
                numerical_summary[col] = {
                    "mean": float(col_data.mean()),
                    "median": float(col_data.median()),
                    "std": float(col_data.std()) if len(col_data) > 1 else 0.0,
                    "min": float(col_data.min()),
                    "max": float(col_data.max()),
                    "q25": float(col_data.quantile(0.25)),
                    "q75": float(col_data.quantile(0.75)),
                    "missing_count": int(df[col].isnull().sum())
                }
            else:
                numerical_summary[col] = {
                    "mean": 0.0, "median": 0.0, "std": 0.0, "min": 0.0, "max": 0.0,
                    "q25": 0.0, "q75": 0.0, "missing_count": int(df[col].isnull().sum())
                }

        # 2. Categorical Analysis
        categorical_summary = {}
        for col in categorical_cols:
            col_data = df[col].dropna()
            value_counts = col_data.value_counts().head(10).to_dict()
            # Convert keys to string to avoid serialization issues
            value_counts = {str(k): int(v) for k, v in value_counts.items()}
            categorical_summary[col] = {
                "unique_count": int(col_data.nunique()),
                "value_counts": value_counts,
                "missing_count": int(df[col].isnull().sum())
            }

        # 3. Correlations
        correlations = {}
        if len(numeric_cols) > 1:
            corr_df = df[numeric_cols].corr()
            # Replace NaN with 0 for JSON serialization
            corr_df = corr_df.fillna(0.0)
            correlations = corr_df.to_dict()

        # 4. Target distribution
        target_summary = {}
        if target_column in df.columns:
            t_data = df[target_column].dropna()
            t_counts = t_data.value_counts().to_dict()
            t_counts = {str(k): int(v) for k, v in t_counts.items()}
            t_pct = (t_data.value_counts(normalize=True) * 100).to_dict()
            t_pct = {str(k): float(v) for k, v in t_pct.items()}
            target_summary = {
                "target_column": target_column,
                "counts": t_counts,
                "percentages": t_pct
            }

        return {
            "target_column": target_column,
            "numerical_summary": numerical_summary,
            "categorical_summary": categorical_summary,
            "correlations": correlations,
            "target_summary": target_summary
        }

    def detect_target_column(self, df: pd.DataFrame) -> str:
        """
        Attempts to detect the target variable.
        """
        cols = [c.lower() for c in df.columns]
        target_candidates = ["churn", "target", "label", "class", "y", "output", "clicked"]
        
        for cand in target_candidates:
            if cand in cols:
                # Find matching original casing
                idx = cols.index(cand)
                return df.columns[idx]
                
        # Default to the last column
        return df.columns[-1] if not df.empty else None

    def generate_plots(self, df: pd.DataFrame, target_column: str, report_dir: str, file_id: str) -> Dict[str, str]:
        """
        Generates and saves exploratory data analysis plots.
        Returns a dictionary of plot types and their file paths.
        """
        os.makedirs(report_dir, exist_ok=True)
        saved_plots = {}

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        # 1. Correlation Heatmap
        if len(numeric_cols) > 1:
            try:
                fig, ax = plt.subplots(figsize=(8, 6))
                corr = df[numeric_cols].corr().fillna(0.0)
                sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f", ax=ax, vmin=-1, vmax=1)
                ax.set_title("Correlation Heatmap")
                fig.tight_layout()
                
                plot_path = os.path.join(report_dir, f"{file_id}_correlation.png")
                fig.savefig(plot_path, dpi=100)
                plt.close(fig)
                saved_plots["correlation_heatmap"] = plot_path
            except Exception as e:
                print(f"Failed to generate correlation heatmap: {e}")

        # 2. Target Variable Distribution
        if target_column in df.columns:
            try:
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.countplot(data=df, x=target_column, ax=ax, hue=target_column, legend=False, palette="viridis")
                ax.set_title(f"Target Distribution: {target_column}")
                fig.tight_layout()
                
                plot_path = os.path.join(report_dir, f"{file_id}_target_dist.png")
                fig.savefig(plot_path, dpi=100)
                plt.close(fig)
                saved_plots["target_distribution"] = plot_path
            except Exception as e:
                print(f"Failed to generate target distribution plot: {e}")

        # 3. Numeric Distributions & Boxplots (Save up to 4 numerical features to avoid disk bloat)
        numeric_features_to_plot = [col for col in numeric_cols if col != target_column][:4]
        
        for col in numeric_features_to_plot:
            # Distribution plot (Histogram + KDE)
            try:
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(df[col], kde=True, ax=ax, color="skyblue")
                ax.set_title(f"Distribution of {col}")
                fig.tight_layout()
                
                plot_path = os.path.join(report_dir, f"{file_id}_dist_{col}.png")
                fig.savefig(plot_path, dpi=100)
                plt.close(fig)
                saved_plots[f"distribution_{col}"] = plot_path
            except Exception as e:
                print(f"Failed to generate distribution plot for {col}: {e}")

            # Boxplot grouped by target (if target is present and has low cardinality)
            if target_column in df.columns and df[target_column].nunique() <= 10:
                try:
                    fig, ax = plt.subplots(figsize=(6, 4))
                    sns.boxplot(data=df, x=target_column, y=col, ax=ax, hue=target_column, legend=False, palette="Set2")
                    ax.set_title(f"{col} by {target_column}")
                    fig.tight_layout()
                    
                    plot_path = os.path.join(report_dir, f"{file_id}_box_{col}_by_target.png")
                    fig.savefig(plot_path, dpi=100)
                    plt.close(fig)
                    saved_plots[f"boxplot_{col}"] = plot_path
                except Exception as e:
                    print(f"Failed to generate boxplot for {col}: {e}")

        plt.close('all')
        return saved_plots
