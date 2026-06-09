import os
from typing import Dict, Any, List

from .rag_agent import RAGAgent
from .business_insight_agent import BusinessInsightAgent

class ChatCopilotAgent:
    """Dataset Copilot agent that answers user questions about a processed dataset.

    It combines:
    1. Retrieval‑Augmented Generation (RAG) top‑k (default 5) from the knowledge base.
    2. Existing analysis metadata (target column, best model, business insights).
    3. An LLM (fallback logic from BusinessInsightAgent) with a business‑oriented system prompt.
    """

    def __init__(self, top_k: int = 5):
        # Initialise RAG with default collection name and persistence location.
        self.rag = RAGAgent(top_k=top_k)
        self.insight_agent = BusinessInsightAgent()
        self.default_top_k = top_k

    def _build_context(self, report_data: Dict[str, Any], rag_docs: List[Dict[str, Any]]) -> str:
        """Create a textual context string that blends dataset metadata and RAG results."""
        parts: List[str] = []
        # Basic dataset info
        target = report_data.get("target_column", "N/A")
        parts.append(f"Dataset target column: {target}.")
        # Model info
        model_report = report_data.get("model_selection_report", {})
        best_model = model_report.get("best_model_name", "N/A")
        metrics = model_report.get("best_model_metrics", {})
        parts.append(f"Best predictive model: {best_model} with metrics {metrics}.")
        # Existing business insights if any
        if report_data.get("business_insights"):
            insights = report_data["business_insights"]
            parts.append("Existing business insights: " + "; ".join(insights) + ".")
        # RAG knowledge
        if rag_docs:
            rag_text = " ".join(doc.get("content", "") for doc in rag_docs)
            parts.append("Relevant knowledge‑base information: " + rag_text)
        return "\n".join(parts)

    def answer_question(self, report_data: Dict[str, Any], query: str, top_k: int = 5) -> Dict[str, Any]:
        """Return an answer and source references for a user query.

        Parameters
        ----------
        report_data: dict
            The metadata JSON produced by the analysis pipeline.
        query: str
            The user question.
        top_k: int, optional
            Number of RAG documents to retrieve (default 5).
        """
        # Adjust RAG retrieval size if needed
        self.rag.top_k = top_k
        rag_docs = self.rag.query(query)
        # Build the prompt with context
        context = self._build_context(report_data, rag_docs)
        system_prompt = (
            "You are a senior data‑science consultant acting as a conversational assistant. "
            "Provide concise, non‑technical answers using the provided dataset analysis "
            "and any relevant knowledge‑base information."
        )
        full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {query}"
        # Generate answer with LLM fallback logic
        answer = self.insight_agent._call_llm(full_prompt)
        return {"answer": answer, "sources": rag_docs}
