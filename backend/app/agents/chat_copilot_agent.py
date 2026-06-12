import os
import json
from typing import Dict, Any, List

from .rag_agent import RAGAgent
from .business_insight_agent import BusinessInsightAgent

class ChatCopilotAgent:
    """Dataset Copilot agent that answers user questions about a processed dataset."""

    def __init__(self, top_k: int = 5):
        self.rag = RAGAgent(top_k=top_k)
        self.insight_agent = BusinessInsightAgent()
        self.default_top_k = top_k

    def _build_context(self, report_data: Dict[str, Any], rag_docs: List[Dict[str, Any]]) -> str:
        parts: List[str] = []
        target = report_data.get("target_column", "N/A")
        parts.append(f"Dataset target column: {target}.")
        model_report = report_data.get("model_selection_report", {})
        best_model = model_report.get("best_model_name", "N/A")
        metrics = model_report.get("best_model_metrics", {})
        parts.append(f"Best predictive model: {best_model} with metrics {metrics}.")
        if report_data.get("business_insights"):
            insights = report_data["business_insights"]
            parts.append("Existing business insights: " + "; ".join(insights) + ".")
        if rag_docs:
            rag_text = " ".join(doc.get("content", "") for doc in rag_docs)
            parts.append("Relevant knowledge‑base information: " + rag_text)
        return "\n".join(parts)

    def _generate_fallback_answer(self, report_data: Dict[str, Any], query: str) -> str:
        """Generate a meaningful rule-based answer from report metadata when LLM is unavailable."""
        q = query.lower()
        model_report = report_data.get("model_selection_report", {})
        best_model = model_report.get("best_model_name", "N/A")
        metrics = model_report.get("best_model_metrics", {})
        target = report_data.get("target_column", "the target variable")
        cleaning = report_data.get("cleaning_report", {})
        eda = report_data.get("eda_report", {})
        feat_eng = report_data.get("feature_engineering_report", {})
        tuning = report_data.get("tuning_report", {})
        expl = report_data.get("explanation_report", {})
        insights = report_data.get("business_insights", [])

        # Best model
        if any(k in q for k in ["best model", "which model", "top model", "best predictive", "model performance"]):
            leaderboard = model_report.get("leaderboard", [])
            if best_model != "N/A":
                acc = metrics.get("accuracy", metrics.get("r2_score", "N/A"))
                resp = f"**Best Model: {best_model}**\n\nThis model achieved the highest performance on your dataset with "
                if isinstance(acc, float):
                    resp += f"an accuracy of **{acc*100:.1f}%**" if acc <= 1 else f"an R² score of **{acc:.4f}**"
                resp += f" predicting **{target}**."
                if len(leaderboard) > 1:
                    resp += f"\n\nAll {len(leaderboard)} models were evaluated and ranked. {best_model} came out on top."
                if tuning and tuning.get("tunable"):
                    resp += f"\n\nAfter hyperparameter tuning, the score improved from {tuning.get('baseline_metric', 'N/A'):.4f} to {tuning.get('tuned_metric', 'N/A'):.4f}."
                return resp

        # Features / SHAP
        if any(k in q for k in ["feature", "important", "shap", "impact", "driver", "variable"]):
            feat_imp = expl.get("feature_importance", [])
            if feat_imp:
                top3 = feat_imp[:3]
                names = [f["feature"] for f in top3]
                resp = f"**Top Predictive Features for '{target}':**\n\n"
                for i, f in enumerate(top3, 1):
                    resp += f"{i}. **{f['feature']}** — SHAP importance: {f['importance']:.5f}\n"
                resp += f"\nThese features have the highest influence on predicting **{target}** based on SHAP analysis."
                return resp
            elif feat_eng:
                added = feat_eng.get("features_added", [])
                if added:
                    return f"Feature engineering created **{len(added)} new features** including: {', '.join(added[:5])}. These were used for model training."

        # Data quality / cleaning
        if any(k in q for k in ["data quality", "missing", "duplicate", "clean", "outlier", "null"]):
            rows_removed = cleaning.get("rows_removed", 0)
            missing = cleaning.get("missing_values_filled", 0)
            dups = cleaning.get("duplicates_removed", 0)
            return (
                f"**Data Quality Summary:**\n\n"
                f"• **{rows_removed}** rows removed during cleaning\n"
                f"• **{missing}** missing values filled\n"
                f"• **{dups}** duplicate rows removed\n\n"
                f"The dataset was cleaned and prepared for machine learning analysis."
            )

        # Business insights
        if any(k in q for k in ["business", "strategy", "decision", "insight", "recommend", "action"]):
            if insights:
                resp = "**Business Insights from your analysis:**\n\n"
                for i, ins in enumerate(insights[:4], 1):
                    resp += f"{i}. {ins}\n\n"
                return resp

        # Tuning
        if any(k in q for k in ["tuning", "hyperparameter", "optuna", "trial", "optimiz"]):
            if tuning:
                if tuning.get("tunable"):
                    return (
                        f"**Hyperparameter Tuning Results:**\n\n"
                        f"• Model: **{tuning.get('model_name', best_model)}**\n"
                        f"• Baseline score: **{tuning.get('baseline_metric', 'N/A'):.4f}**\n"
                        f"• Tuned score: **{tuning.get('tuned_metric', 'N/A'):.4f}**\n"
                        f"• Trials run: **{tuning.get('n_trials', 0)}**\n"
                        f"• Best params: `{json.dumps(tuning.get('best_params', {}))}`"
                    )
                else:
                    return f"**{tuning.get('model_name', best_model)}** is a linear model — it is not eligible for Optuna-based hyperparameter search. The baseline score of **{tuning.get('baseline_metric', 'N/A')}** is already optimal."

        # EDA / dataset stats
        if any(k in q for k in ["eda", "statistics", "distribution", "correlation", "dataset", "rows", "columns", "size"]):
            shape = eda.get("shape", {})
            rows = shape.get("rows", eda.get("num_rows", "N/A"))
            cols = shape.get("cols", eda.get("num_cols", "N/A"))
            return (
                f"**Dataset Summary:**\n\n"
                f"• **{rows}** rows × **{cols}** columns\n"
                f"• Target column: **{target}**\n"
                f"• Best model trained: **{best_model}**"
            )

        # Generic fallback
        if best_model != "N/A":
            acc = metrics.get("accuracy", metrics.get("r2_score"))
            resp = (
                f"Based on your dataset analysis, the best model is **{best_model}** "
                f"predicting **{target}**"
            )
            if acc:
                resp += f" with a score of **{acc:.4f}**"
            resp += "."
            if insights:
                resp += f"\n\n**Key insight:** {insights[0]}"
            return resp

        return (
            "I have access to your dataset analysis. Could you be more specific? "
            "You can ask me about:\n"
            "• The best predictive model and its accuracy\n"
            "• Most important features driving predictions\n"
            "• Data quality issues found\n"
            "• Business insights and recommendations\n"
            "• Hyperparameter tuning results"
        )

    def answer_question(self, report_data: Dict[str, Any], query: str, top_k: int = 5) -> Dict[str, Any]:
        """Return an answer and source references for a user query."""
        try:
            self.rag.top_k = top_k
            rag_docs = self.rag.query(query)
        except Exception:
            rag_docs = []

        context = self._build_context(report_data, rag_docs)
        system_prompt = (
            "You are a senior data‑science consultant acting as a conversational assistant. "
            "Provide concise, non‑technical answers using the provided dataset analysis "
            "and any relevant knowledge‑base information."
        )
        full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {query}"

        # Try LLM first
        answer = self.insight_agent._call_llm(full_prompt)

        # If LLM unavailable, generate a smart fallback
        if not answer or not answer.strip():
            answer = self._generate_fallback_answer(report_data, query)

        return {"answer": answer, "sources": rag_docs}

