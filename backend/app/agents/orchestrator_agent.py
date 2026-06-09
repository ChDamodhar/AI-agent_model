import os
import json
import datetime
from typing import Optional, Dict, Any
import pandas as pd

from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from .cleaning_agent import CleaningAgent
from .eda_agent import EDAAgent
from .feature_engineering_agent import FeatureEngineeringAgent
from .model_selection_agent import ModelSelectionAgent
from .hyperparameter_tuning_agent import HyperparameterTuningAgent
from .explainability_agent import ExplainabilityAgent

# Database imports
from ..database import SessionLocal, PipelineRun


class PipelineState(BaseModel):
    """LangGraph state model for the pipeline execution."""

    file_id: str
    target_column: Optional[str] = None
    report_dir: str = "./reports"
    raw_path: Optional[str] = None
    cleaned_path: Optional[str] = None
    engineered_path: Optional[str] = None
    metadata: Dict[str, Any] = {}
    model_config = {"arbitrary_types_allowed": True}
    # In‑memory DataFrames (not persisted)
    df: Optional[pd.DataFrame] = None
    cleaned_df: Optional[pd.DataFrame] = None
    engineered_df: Optional[pd.DataFrame] = None
    model_result: Optional[Dict[str, Any]] = None
    tuned_model: Optional[Any] = None
    best_params: Optional[Dict[str, Any]] = None


class PipelineOrchestrator:
    """Orchestrates the data science pipeline using LangGraph.

    The graph is defined once per instance and can be executed synchronously via ``run``.
    """

    def __init__(self, report_dir: Optional[str] = None):
        self.report_dir = report_dir or os.getenv("REPORT_DIR", "./reports")
        os.makedirs(self.report_dir, exist_ok=True)
        # Initialise agents (stateless)
        self.cleaner = CleaningAgent()
        self.eda = EDAAgent()
        self.fe = FeatureEngineeringAgent()
        self.model_selector = ModelSelectionAgent()
        self.tuner = HyperparameterTuningAgent()
        self.explainer = ExplainabilityAgent()
        # Build LangGraph
        self.graph = self._build_graph()

    # ---------------------------------------------------------------------
    # Graph construction helpers
    # ---------------------------------------------------------------------
    def _build_graph(self) -> StateGraph:
        graph = StateGraph(PipelineState)

        # Nodes ------------------------------------------------------------
        def load_raw(state: PipelineState) -> PipelineState:
            raw_path = os.path.join(self.report_dir, f"{state.file_id}_raw.csv")
            if not os.path.exists(raw_path):
                raise FileNotFoundError(f"Raw data file {raw_path} not found")
            df = pd.read_csv(raw_path)
            state.raw_path = raw_path
            state.df = df
            state.metadata["file_id"] = state.file_id
            return state

        def cleaning(state: PipelineState) -> PipelineState:
            cleaned_df, cleaning_report = self.cleaner.clean_dataset(state.df)
            cleaned_path = os.path.join(self.report_dir, f"{state.file_id}_cleaned.csv")
            cleaned_df.to_csv(cleaned_path, index=False)
            state.cleaned_df = cleaned_df
            state.cleaned_path = cleaned_path
            state.metadata["cleaning_report"] = cleaning_report
            state.metadata["cleaned_path"] = cleaned_path
            return state

        def eda(state: PipelineState) -> PipelineState:
            eda_report = self.eda.perform_eda(state.cleaned_df, state.target_column)
            state.metadata["eda_report"] = eda_report
            return state

        def feature_engineering(state: PipelineState) -> PipelineState:
            engineered_df, fe_report = self.fe.transform(state.cleaned_df, state.target_column)
            engineered_path = os.path.join(self.report_dir, f"{state.file_id}_engineered.csv")
            engineered_df.to_csv(engineered_path, index=False)
            state.engineered_df = engineered_df
            state.engineered_path = engineered_path
            state.metadata["feature_engineering_report"] = fe_report
            state.metadata["engineered_path"] = engineered_path
            return state

        def model_selection(state: PipelineState) -> PipelineState:
            model_result = self.model_selector.train_and_evaluate(
                state.engineered_df, state.target_column, self.report_dir, state.file_id
            )
            state.model_result = model_result
            state.metadata["model_selection"] = model_result
            return state

        def tuning(state: PipelineState) -> PipelineState:
            problem_type = state.model_result.get("problem_type")
            model_path = os.path.join(self.report_dir, f"{state.file_id}_best_model.joblib")
            tuned_model, best_params, tuning_report = self.tuner.tune_model(
                state.engineered_df,
                state.target_column,
                model_path,
                problem_type,
                n_trials=20,
            )
            state.tuned_model = tuned_model
            state.best_params = best_params
            state.metadata["tuning_report"] = tuning_report
            state.metadata["best_hyperparameters"] = best_params
            return state

        def explainability(state: PipelineState) -> PipelineState:
            explanation_report = self.explainer.generate_explanations(
                state.tuned_model,
                state.engineered_df,
                state.target_column,
                self.report_dir,
                state.file_id,
            )
            state.metadata["explainability_report"] = explanation_report
            return state

        def finalize(state: PipelineState) -> PipelineState:
            metadata_path = os.path.join(self.report_dir, f"{state.file_id}_metadata.json")
            with open(metadata_path, "w") as f:
                json.dump(state.metadata, f, indent=2, default=str)
            state.metadata["metadata_path"] = metadata_path
            return state

        # Register nodes
        graph.add_node("load", load_raw)
        graph.add_node("clean", cleaning)
        graph.add_node("eda", eda)
        graph.add_node("fe", feature_engineering)
        graph.add_node("model", model_selection)
        graph.add_node("tune", tuning)
        graph.add_node("explain", explainability)
        graph.add_node("final", finalize)

        # Edges (sequential flow)
        graph.add_edge("load", "clean")
        graph.add_edge("clean", "eda")
        graph.add_edge("eda", "fe")
        graph.add_edge("fe", "model")
        graph.add_edge("model", "tune")
        graph.add_edge("tune", "explain")
        graph.add_edge("explain", "final")
        graph.add_edge("final", END)

        return graph

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def run(self, file_id: str, target_column: Optional[str] = None) -> Dict[str, Any]:
        """Execute the pipeline for a dataset via the LangGraph state graph.

        Returns the consolidated metadata dictionary produced in the ``final`` node.
        """
        # Start DB session and create a PipelineRun record
        db = SessionLocal()
        try:
            pipeline_run = PipelineRun(
                file_id=file_id,
                status="running",
                started_at=datetime.datetime.utcnow()
            )
            db.add(pipeline_run)
            db.commit()
            db.refresh(pipeline_run)
        except Exception as e:
            db.close()
            raise
        # Execute graph
        init_state = PipelineState(file_id=file_id, target_column=target_column, report_dir=self.report_dir)
        result_state = self.graph.invoke(init_state)
        # Update PipelineRun with results
        try:
            pipeline_run.status = "completed"
            pipeline_run.finished_at = datetime.datetime.utcnow()
            pipeline_run.meta_json = result_state.metadata
            db.add(pipeline_run)
            db.commit()
        finally:
            db.close()
        return result_state.metadata
