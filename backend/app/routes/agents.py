from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import pandas as pd
import os
import json

from ..database import get_db
from ..agents.cleaning_agent import CleaningAgent
from ..agents.eda_agent import EDAAgent
from ..agents.feature_engineering_agent import FeatureEngineeringAgent
from ..agents.model_selection_agent import ModelSelectionAgent
from ..agents.hyperparameter_tuning_agent import HyperparameterTuningAgent
from ..agents.explainability_agent import ExplainabilityAgent
from ..agents.business_insight_agent import BusinessInsightAgent
from ..utils.file_handler import (
    get_file_path,
    get_cleaned_file_path,
    get_engineered_file_path,
    REPORT_DIR,
    replace_nan_values,
)

def update_metadata(file_id: str, updates: Dict[str, Any]):
    metadata_path = os.path.join(REPORT_DIR, f"{file_id}_metadata.json")
    meta = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                meta = json.load(f)
        except Exception:
            pass
    # Clean NaN/Inf values before saving
    clean_updates = replace_nan_values(updates)
    meta.update(clean_updates)
    try:
        with open(metadata_path, "w") as f:
            json.dump(meta, f, indent=2)
    except Exception as e:
        print(f"Failed to write metadata for {file_id}: {e}")

router = APIRouter(prefix="/agents", tags=["agents"])

class AgentRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None

class TuningRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None
    n_trials: Optional[int] = 20

class InsightRequest(BaseModel):
    file_id: str

# Data Cleaning Agent
@router.post("/cleaning")
async def run_cleaning(request: AgentRequest, db: Session = Depends(get_db)):
    """Run the data cleaning agent on the uploaded dataset."""
    try:
        file_path = get_file_path(request.file_id)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf)
        )

    try:
        df = pd.read_csv(file_path)
        cleaning_agent = CleaningAgent()
        cleaned_df, cleaning_stats = cleaning_agent.clean_dataset(df)

        # Save cleaned file
        cleaned_file_path = get_cleaned_file_path(request.file_id)
        cleaned_df.to_csv(cleaned_file_path, index=False)

        result = {
            "message": "Data cleaning completed successfully.",
            "file_id": request.file_id,
            "cleaning_report": cleaning_stats,
        }
        update_metadata(request.file_id, {
            "file_id": request.file_id,
            "cleaning_report": cleaning_stats
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during data cleaning: {str(e)}"
        )

# EDA Agent
@router.post("/eda")
async def run_eda(request: AgentRequest, db: Session = Depends(get_db)):
    """Run the EDA agent on the cleaned dataset."""
    try:
        cleaned_file_path = get_cleaned_file_path(request.file_id)
        if not os.path.exists(cleaned_file_path):
            # Try with original file
            cleaned_file_path = get_file_path(request.file_id)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf)
        )

    try:
        df = pd.read_csv(cleaned_file_path)
        eda_agent = EDAAgent()

        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(df)

        eda_report = eda_agent.perform_eda(df, target_column)
        plot_paths = eda_agent.generate_plots(df, target_column, REPORT_DIR, request.file_id)

        relative_plot_paths = {}
        for k, path in plot_paths.items():
            relative_plot_paths[k] = os.path.basename(path)

        result = {
            "message": "EDA completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "eda_report": eda_report,
            "eda_plots": relative_plot_paths,
        }
        update_metadata(request.file_id, {
            "target_column": target_column,
            "eda_report": eda_report,
            "eda_plots": relative_plot_paths
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during EDA: {str(e)}"
        )

# Feature Engineering Agent
@router.post("/feature-engineering")
async def run_feature_engineering(request: AgentRequest, db: Session = Depends(get_db)):
    """Run the feature engineering agent."""
    try:
        cleaned_file_path = get_cleaned_file_path(request.file_id)
        if not os.path.exists(cleaned_file_path):
            cleaned_file_path = get_file_path(request.file_id)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf)
        )

    try:
        df = pd.read_csv(cleaned_file_path)
        eda_agent = EDAAgent()

        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(df)

        fe_agent = FeatureEngineeringAgent()
        engineered_df, fe_report = fe_agent.transform(df, target_column)

        engineered_file_path = get_engineered_file_path(request.file_id)
        engineered_df.to_csv(engineered_file_path, index=False)

        result = {
            "message": "Feature engineering completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "feature_engineering_report": fe_report,
        }
        update_metadata(request.file_id, {
            "feature_engineering_report": fe_report
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during feature engineering: {str(e)}"
        )

# Model Selection Agent
@router.post("/model-selection")
async def run_model_selection(request: AgentRequest, db: Session = Depends(get_db)):
    """Run the model selection agent."""
    try:
        engineered_file_path = get_engineered_file_path(request.file_id)
        if not os.path.exists(engineered_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineered dataset not found. Run feature engineering first."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    try:
        df = pd.read_csv(engineered_file_path)
        eda_agent = EDAAgent()

        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(df)

        model_agent = ModelSelectionAgent()
        model_report = model_agent.train_and_evaluate(df, target_column, REPORT_DIR, request.file_id)

        result = {
            "message": "Model selection completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "model_selection_report": model_report,
        }
        update_metadata(request.file_id, {
            "model_selection_report": model_report
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during model selection: {str(e)}"
        )

# Hyperparameter Tuning Agent
@router.post("/tuning")
async def run_tuning(request: TuningRequest, db: Session = Depends(get_db)):
    """Run the hyperparameter tuning agent."""
    try:
        engineered_file_path = get_engineered_file_path(request.file_id)
        if not os.path.exists(engineered_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineered dataset not found. Run feature engineering and model selection first."
            )

        model_filename = f"{request.file_id}_best_model.joblib"
        model_path = os.path.join(REPORT_DIR, model_filename)
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trained model not found. Run model selection first."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    try:
        df = pd.read_csv(engineered_file_path)
        eda_agent = EDAAgent()

        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(df)

        model_agent = ModelSelectionAgent()
        problem_type = model_agent.detect_problem_type(df, target_column)

        tuning_agent = HyperparameterTuningAgent()
        tuned_model, best_params, tuning_report = tuning_agent.tune_model(
            df=df,
            target_column=target_column,
            model_path=model_path,
            problem_type=problem_type,
            n_trials=request.n_trials
        )

        result = {
            "message": "Hyperparameter tuning completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "problem_type": problem_type,
            "tuning_report": tuning_report,
        }
        update_metadata(request.file_id, {
            "tuning_report": tuning_report
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during hyperparameter tuning: {str(e)}"
        )

# Explainability Agent
@router.post("/explainability")
async def run_explainability(request: AgentRequest, db: Session = Depends(get_db)):
    """Run the explainability agent."""
    try:
        engineered_file_path = get_engineered_file_path(request.file_id)
        if not os.path.exists(engineered_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineered dataset not found. Run feature engineering and model selection first."
            )

        model_filename = f"{request.file_id}_best_model.joblib"
        model_path = os.path.join(REPORT_DIR, model_filename)
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trained model not found. Run model selection first."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    try:
        df = pd.read_csv(engineered_file_path)
        eda_agent = EDAAgent()

        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(df)

        explain_agent = ExplainabilityAgent()
        explanation_report = explain_agent.generate_explanations(
            df=df,
            target_column=target_column,
            model_path=model_path,
            report_dir=REPORT_DIR,
            file_id=request.file_id
        )

        result = {
            "message": "Model explanation completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "explanation_report": explanation_report,
        }
        update_metadata(request.file_id, {
            "explanation_report": explanation_report
        })
        return replace_nan_values(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during model explanation: {str(e)}"
        )

# Business Insights Agent
@router.post("/business-insights")
async def run_business_insights(request: InsightRequest, db: Session = Depends(get_db)):
    """Run the business insights agent."""
    metadata_path = os.path.join(REPORT_DIR, f"{request.file_id}_metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis metadata not found. Please run model selection or the full analysis pipeline first."
        )

    try:
        with open(metadata_path, "r") as f:
            report_data = json.load(f)

        insight_agent = BusinessInsightAgent()
        result = insight_agent.generate_insights(report_data)

        insights_list = result.get("insights", []) if isinstance(result, dict) else result

        return replace_nan_values({
            "message": "Business insights generated.",
            "file_id": request.file_id,
            "insights": insights_list
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating business insights: {str(e)}"
        )
