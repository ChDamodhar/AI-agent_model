from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import os
import json
import pandas as pd
import os
import json
import pandas as pd

from ..utils.file_handler import (
    save_upload_file,
    get_csv_metadata,
    get_file_path,
    get_cleaned_file_path,
    get_engineered_file_path,
    REPORT_DIR,
    replace_nan_values,
)
from ..database import get_db, Dataset
from ..agents.cleaning_agent import CleaningAgent
from ..agents.eda_agent import EDAAgent
from ..agents.feature_engineering_agent import FeatureEngineeringAgent
from ..agents.model_selection_agent import ModelSelectionAgent
from ..agents.hyperparameter_tuning_agent import HyperparameterTuningAgent
from ..agents.explainability_agent import ExplainabilityAgent
from ..agents.report_agent import ReportAgent
from ..agents.business_insight_agent import BusinessInsightAgent
from fastapi.responses import FileResponse

router = APIRouter(prefix="/data", tags=["data"])

class AnalyzeRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None

class TuneRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None
    n_trials: Optional[int] = 20

class ExplainRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None

class InsightRequest(BaseModel):
    file_id: str

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV file, validate, save it, and store metadata in the database."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported."
        )
    contents = await file.read()
    # Save the uploaded file and obtain a unique file_id and path
    file_id, saved_path = save_upload_file(contents, file.filename)
    # Extract CSV metadata (column info, preview, etc.)
    try:
        metadata = get_csv_metadata(saved_path)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    # Insert a new Dataset record into the DB
    new_dataset = Dataset(file_id=file_id, filename=file.filename, meta_json=metadata)
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    return replace_nan_values({"file_id": file_id, "filename": file.filename, "metadata": metadata})

@router.post("/analyze")
async def analyze_dataset(request: AnalyzeRequest):
    """
    Trigger the auto-ML analysis pipeline for the given file_id.
    This runs data cleaning, exploratory data analysis, feature engineering, and model selection.
    """
    try:
        file_path = get_file_path(request.file_id)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf)
        )
        
    try:
        # Load the raw dataframe
        df = pd.read_csv(file_path)
        
        # 1. Instantiate and run the Cleaning Agent
        cleaning_agent = CleaningAgent()
        cleaned_df, cleaning_stats = cleaning_agent.clean_dataset(df)
        
        # Save cleaned file
        cleaned_file_path = get_cleaned_file_path(request.file_id)
        cleaned_df.to_csv(cleaned_file_path, index=False)
        
        # 2. Instantiate and run the EDA Agent on the cleaned dataset
        eda_agent = EDAAgent()
        
        # Detect or set target column
        target_column = request.target_column
        if not target_column:
            target_column = eda_agent.detect_target_column(cleaned_df)
            
        eda_report = eda_agent.perform_eda(cleaned_df, target_column)
        plot_paths = eda_agent.generate_plots(cleaned_df, target_column, REPORT_DIR, request.file_id)
        
        # Convert absolute paths to relative paths/names for API response
        relative_plot_paths = {}
        for k, path in plot_paths.items():
            relative_plot_paths[k] = os.path.basename(path)
            
        # 3. Instantiate and run the Feature Engineering Agent
        fe_agent = FeatureEngineeringAgent()
        engineered_df, fe_report = fe_agent.transform(cleaned_df, target_column)
        
        # Save engineered file
        engineered_file_path = get_engineered_file_path(request.file_id)
        engineered_df.to_csv(engineered_file_path, index=False)
        
        # 4. Instantiate and run the Model Selection Agent
        model_agent = ModelSelectionAgent()
        model_report = model_agent.train_and_evaluate(engineered_df, target_column, REPORT_DIR, request.file_id)
        
        # Load original filename if available
        metadata_path = os.path.join(REPORT_DIR, f"{request.file_id}_metadata.json")
        filename = f"{request.file_id}.csv"
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    existing_meta = json.load(f)
                    filename = existing_meta.get("filename", filename)
            except Exception:
                pass

        result = {
            "message": "Analysis completed successfully.",
            "file_id": request.file_id,
            "filename": filename,
            "target_column": target_column,
            "cleaning_report": cleaning_stats,
            "eda_report": eda_report,
            "eda_plots": relative_plot_paths,
            "feature_engineering_report": fe_report,
            "model_selection_report": model_report
        }
        
        # Replace NaN values for JSON serialization
        result = replace_nan_values(result)
        
        # Write metadata back
        with open(metadata_path, "w") as f:
            json.dump(result, f, indent=2)
            
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during data analysis: {str(e)}"
        )

@router.post("/tune")
async def tune_model(request: TuneRequest):
    """
    Trigger hyperparameter tuning for the selected best model of the given file_id.
    """
    try:
        engineered_file_path = get_engineered_file_path(request.file_id)
        if not os.path.exists(engineered_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Engineered dataset for file ID {request.file_id} not found. Run analysis first."
            )
            
        model_filename = f"{request.file_id}_best_model.joblib"
        model_path = os.path.join(REPORT_DIR, model_filename)
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trained model for file ID {request.file_id} not found. Run analysis first."
            )
            
        df = pd.read_csv(engineered_file_path)
        
        # Determine target column
        target_column = request.target_column
        if not target_column:
            eda_agent = EDAAgent()
            target_column = eda_agent.detect_target_column(df)
            
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target column '{target_column}' not found in the engineered dataset."
            )
            
        # Detect problem type
        model_agent = ModelSelectionAgent()
        problem_type = model_agent.detect_problem_type(df, target_column)
        
        # Tune model
        tuning_agent = HyperparameterTuningAgent()
        tuned_model, best_params, tuning_report = tuning_agent.tune_model(
            df=df,
            target_column=target_column,
            model_path=model_path,
            problem_type=problem_type,
            n_trials=request.n_trials
        )
        
        # Load and update metadata
        metadata_path = os.path.join(REPORT_DIR, f"{request.file_id}_metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    existing_meta = json.load(f)
                existing_meta["tuning_report"] = tuning_report
                with open(metadata_path, "w") as f:
                    json.dump(existing_meta, f, indent=2)
            except Exception:
                pass

        return replace_nan_values({
            "message": "Hyperparameter tuning completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "problem_type": problem_type,
            "tuning_report": tuning_report
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during hyperparameter tuning: {str(e)}"
        )

@router.post("/explain")
async def explain_model(request: ExplainRequest):
    """
    Generate model explanations using SHAP for the given file_id.
    """
    try:
        engineered_file_path = get_engineered_file_path(request.file_id)
        if not os.path.exists(engineered_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Engineered dataset for file ID {request.file_id} not found. Run analysis first."
            )
            
        model_filename = f"{request.file_id}_best_model.joblib"
        model_path = os.path.join(REPORT_DIR, model_filename)
        if not os.path.exists(model_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trained model for file ID {request.file_id} not found. Run analysis first."
            )
            
        df = pd.read_csv(engineered_file_path)
        
        # Determine target column
        target_column = request.target_column
        if not target_column:
            eda_agent = EDAAgent()
            target_column = eda_agent.detect_target_column(df)
            
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target column '{target_column}' not found in the engineered dataset."
            )
            
        # Generate explanations
        explain_agent = ExplainabilityAgent()
        explanation_report = explain_agent.generate_explanations(
            df=df,
            target_column=target_column,
            model_path=model_path,
            report_dir=REPORT_DIR,
            file_id=request.file_id
        )
        
        # Load and update metadata
        metadata_path = os.path.join(REPORT_DIR, f"{request.file_id}_metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    existing_meta = json.load(f)
                existing_meta["explanation_report"] = explanation_report
                with open(metadata_path, "w") as f:
                    json.dump(existing_meta, f, indent=2)
            except Exception:
                pass

        return replace_nan_values({
            "message": "Model explanation completed successfully.",
            "file_id": request.file_id,
            "target_column": target_column,
            "explanation_report": explanation_report
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during model explanation generation: {str(e)}"
        )

from ..agents.chat_copilot_agent import ChatCopilotAgent
from pydantic import BaseModel
from typing import List, Dict, Any

class ChatRequest(BaseModel):
    file_id: str
    message: str
    top_k: int = 5

class SourceInfo(BaseModel):
    id: str | None = None
    content: str
    metadata: Dict[str, Any] | None = None
    distance: float | None = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """Answer a user question about a dataset using the Dataset Copilot.

    It loads the analysis metadata, retrieves relevant knowledge from the RAG store,
    builds a business‑oriented prompt, and returns the LLM answer with source references.
    """
    try:
        agent = ChatCopilotAgent()
        # Load metadata JSON for the given file_id
        metadata_path = os.path.join(REPORT_DIR, f"{req.file_id}_metadata.json")
        if not os.path.exists(metadata_path):
            return ChatResponse(
                answer="I couldn't find the analysis metadata for this dataset. Please run the Model Selection or the full ML Pipeline first so I can analyze your results and help you!",
                sources=[]
            )
        with open(metadata_path, "r") as f:
            report_data = json.load(f)
        result = agent.answer_question(report_data, req.message, top_k=req.top_k)
        # Convert RAG docs to SourceInfo models
        sources = []
        for doc in result.get("sources", []):
            sources.append(SourceInfo(
                id=doc.get("id"),
                content=doc.get("content", ""),
                metadata=doc.get("metadata", {}),
                distance=doc.get("distance")
            ))
        return ChatResponse(answer=result.get("answer", ""), sources=sources)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insight")
async def generate_insight(request: InsightRequest):
    """Generate business insights using the BusinessInsightAgent."""
    metadata_path = os.path.join(REPORT_DIR, f"{request.file_id}_metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis metadata for file ID {request.file_id} not found. Please run model selection or the full analysis pipeline first."
        )
    try:
        with open(metadata_path, "r") as f:
            report_data = json.load(f)
        insight_agent = BusinessInsightAgent()
        result = insight_agent.generate_insights(report_data)
        # Extract insights list; result may be a dict with 'insights' key or a raw list
        insights_list = result.get("insights", []) if isinstance(result, dict) else result
        # Store only the list in metadata
        report_data["business_insights"] = insights_list
        with open(metadata_path, "w") as f:
            json.dump(report_data, f, indent=2)
        return replace_nan_values({"message": "Business insights generated.", "file_id": request.file_id, "insights": insights_list})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating business insights: {str(e)}"
        )

@router.get("/plot/{file_id}/{plot_name}")
async def get_plot(file_id: str, plot_name: str):
    """Serve a generated EDA plot image safely."""
    if ".." in plot_name or "/" in plot_name or "\\" in plot_name:
        raise HTTPException(status_code=400, detail="Invalid plot name.")
    
    # Try multiple naming conventions (with or without file_id prefix)
    possible_paths = [
        os.path.join(REPORT_DIR, f"{file_id}_{plot_name}"),
        os.path.join(REPORT_DIR, plot_name)
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return FileResponse(path, media_type="image/png")
            
    raise HTTPException(status_code=404, detail="Plot image not found.")

@router.get("/preview/{file_id}")
async def get_dataset_preview(file_id: str):
    """Return a preview (first 10 rows) of the dataset (raw or cleaned)."""
    try:
        file_path = get_file_path(file_id)
    except FileNotFoundError:
        try:
            file_path = get_cleaned_file_path(file_id)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Dataset file not found.")

    try:
        df = pd.read_csv(file_path, nrows=10)
        columns = list(df.columns)
        rows = json.loads(df.to_json(orient="records"))
        return {
            "columns": columns,
            "rows": rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset preview: {str(e)}")

@router.get("/metadata/{file_id}")
async def get_metadata(file_id: str):
    """Retrieve metadata JSON for the given file_id."""
    metadata_path = os.path.join(REPORT_DIR, f"{file_id}_metadata.json")
    if not os.path.exists(metadata_path):
        return {}
    try:
        with open(metadata_path, "r") as f:
            data = json.load(f)
        return replace_nan_values(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metadata: {str(e)}")

@router.get("/report/{report_id}")
async def get_report(report_id: str):
    """
    Retrieve report details or file download by report_id.
    """
    return {
        "report_id": report_id,
        "status": "completed",
        "download_url": f"/api/v1/data/report/download/{report_id}/pdf",
        "summary": "Report download links are ready. Use format 'pdf' or 'pptx' to download."
    }

@router.get("/report/download/{file_id}/{format}")
async def download_report(file_id: str, format: str):
    """
    Generate and download the report in either PDF or PPTX format.
    """
    if format not in ["pdf", "pptx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Use 'pdf' or 'pptx'."
        )
        
    metadata_path = os.path.join(REPORT_DIR, f"{file_id}_metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis metadata for file ID {file_id} not found. Run analysis first."
        )
        
    try:
        with open(metadata_path, "r") as f:
            report_data = json.load(f)
            
        report_agent = ReportAgent()
        
        if format == "pdf":
            filename = report_agent.generate_pdf_report(report_data, REPORT_DIR, file_id)
            media_type = "application/pdf"
        else:
            filename = report_agent.generate_pptx_report(report_data, REPORT_DIR, file_id)
            media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            
        file_path = os.path.join(REPORT_DIR, filename)
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating report: {str(e)}"
        )
