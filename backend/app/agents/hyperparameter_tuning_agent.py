# /Users/damodharchiluka/AI-agent_model/backend/app/agents/hyperparameter_tuning_agent.py

"""Hyperparameter tuning agent used in Phase 6.

The agent receives the engineered dataset, the path to the previously trained model, and
information about the problem type (classification or regression). It uses **Optuna** to
search for better hyper‑parameters, fits a new model with the best trial and overwrites the
original model file.

The public API consists of a single method ``tune_model`` that returns:
- the tuned model instance (saved to ``model_path``),
- a dictionary of the best hyper‑parameters, and
- a tiny ``tuning_report`` containing the best score and number of trials.
"""

from __future__ import annotations

import json
import os
import pathlib
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import optuna
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _load_model(model_path: str) -> Any:
    """Load a scikit‑learn compatible model from ``model_path``.

    ``joblib.load`` is used because the existing codebase saves models with joblib.
    """
    return joblib.load(model_path)


def _save_model(model: Any, model_path: str) -> None:
    """Persist ``model`` back to ``model_path`` using joblib.
    """
    joblib.dump(model, model_path)


def _infer_metric(problem_type: str):
    """Return a scoring function appropriate for the problem type.

    * ``classification`` → ``accuracy_score``
    * ``regression``    → ``r2_score``
    """
    if problem_type == "classification":
        return accuracy_score
    return r2_score

# ---------------------------------------------------------------------------
# Agent implementation
# ---------------------------------------------------------------------------

class HyperparameterTuningAgent:
    """Encapsulates hyper‑parameter optimisation for a trained model.

    The agent is deliberately lightweight – it does **not** attempt to cover every
    possible estimator. Instead, it focusses on the most common tree‑based models
    (RandomForest, XGBoost, LightGBM, CatBoost). If the underlying model is not one of
    these, the agent falls back to a generic set of parameters that are applicable to
    any ``sklearn`` estimator supporting ``n_estimators`` and ``max_depth``.
    """

    def __init__(self) -> None:
        # No state is required at initialisation time.
        pass

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def tune_model(
        self,
        df: pd.DataFrame,
        target_column: str,
        model_path: str,
        problem_type: str,
        n_trials: int = 20,
    ) -> Tuple[Any, Dict[str, Any], Dict[str, Any]]:
        """Run an Optuna study to improve the model stored at ``model_path``.

        Parameters
        ----------
        df: pandas.DataFrame
            Engineered dataset (features + target).
        target_column: str
            Name of the column containing the label.
        model_path: str
            Path to the pre‑trained model. The tuned model overwrites this file.
        problem_type: str
            Either ``"classification"`` or ``"regression"``.
        n_trials: int, optional
            Number of Optuna trials (default = 20).

        Returns
        -------
        tuned_model: Any
            The model instance trained with the best hyper‑parameters.
        best_params: dict
            Hyper‑parameters of the best trial.
        tuning_report: dict
            Summary information (best score, number of trials).
        """
        # -----------------------------------------------------------------
        # Prepare data
        # -----------------------------------------------------------------
        X = df.drop(columns=[target_column])
        y = df[target_column]
        X_train, X_valid, y_train, y_valid = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if problem_type == "classification" else None
        )

        # Load the original model to inspect its class – we will rebuild a fresh one
        # with new hyper‑parameters.
        original_model = _load_model(model_path)
        model_class = type(original_model)
        model_init_kwargs = original_model.get_params()

        metric_fn = _infer_metric(problem_type)

        # -----------------------------------------------------------------
        # Optuna objective
        # -----------------------------------------------------------------
        def objective(trial: optuna.trial.Trial) -> float:
            # Define a small search space that works for most tree‑based models.
            # ``n_estimators`` and ``max_depth`` are common; for gradient‑boosting we also
            # expose ``learning_rate``.
            params: Dict[str, Any] = {
                "n_estimators": trial.suggest_int("n_estimators", 50, 300),
                "max_depth": trial.suggest_int("max_depth", 2, 12),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            }

            # Merge with any mandatory arguments from the original model (e.g.,
            # ``objective`` for XGBoost). We keep the original kwargs that are not part of
            # the search space.
            merged_params = {**model_init_kwargs, **params}

            # Build a fresh estimator instance.
            model = model_class(**merged_params)
            model.fit(X_train, y_train)

            preds = model.predict(X_valid)
            # For classification we may need to convert probabilities to class labels.
            if problem_type == "classification" and hasattr(model, "predict_proba"):
                # ``accuracy_score`` works directly on class predictions.
                pass
            score = metric_fn(y_valid, preds)
            # Optuna tries to *minimise* the objective, so we return the negative score
            # for metrics where higher is better.
            return -score if problem_type == "classification" else -score

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=n_trials)

        best_params = {k: v for k, v in study.best_params.items()}
        # Re‑train on the whole dataset with the best hyper‑parameters.
        final_params = {**model_init_kwargs, **best_params}
        tuned_model = model_class(**final_params)
        tuned_model.fit(X, y)
        _save_model(tuned_model, model_path)

        # Build a tiny report.
        best_score = -study.best_value
        tuning_report = {
            "best_score": best_score,
            "best_params": best_params,
            "n_trials": n_trials,
            "problem_type": problem_type,
        }

        return tuned_model, best_params, tuning_report

# ---------------------------------------------------------------------------
# End of file
# ---------------------------------------------------------------------------
