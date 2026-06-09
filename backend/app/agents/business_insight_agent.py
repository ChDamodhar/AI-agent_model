import os
import json
import urllib.request
from typing import Dict, Any, List

class BusinessInsightAgent:
    def __init__(self):
        pass

    def _call_llm(self, prompt: str) -> str:
        """
        Attempts to call available LLMs: Gemini, OpenAI, or local Ollama.
        Returns empty string if all fail or are unavailable.
        """
        # 1. Try Gemini API
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key:
            try:
                url = f"https://generativelink.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                data = {"contents": [{"parts": [{"text": prompt}]}]}
                req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=10) as response:
                    res = json.loads(response.read().decode("utf-8"))
                    return res["candidates"][0]["content"]["parts"][0]["text"]
            except Exception:
                pass

        # OpenAI API block removed; Gemini is now the primary LLM
        # openai_key = os.environ.get("OPENAI_API_KEY")
        # if openai_key:
        #     try:
        #         url = "https://api.openai.com/v1/chat/completions"
        #         headers = {
        #             "Content-Type": "application/json",
        #             "Authorization": f"Bearer {openai_key}"
        #         }
        #         data = {
        #             "model": "gpt-4o-mini",
        #             "messages": [{"role": "user", "content": prompt}],
        #             "temperature": 0.3
        #         }
        #         req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        #         with urllib.request.urlopen(req, timeout=10) as response:
        #             res = json.loads(response.read().decode("utf-8"))
        #             return res["choices"][0]["message"]["content"]
        #     except Exception:
        #         pass

        # 3. Try local Ollama
        try:
            url = "http://localhost:11434/api/generate"
            headers = {"Content-Type": "application/json"}
            data = {
                "model": "gemma",  # Or llama3
                "prompt": prompt,
                "stream": False
            }
            req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                return res["response"]
        except Exception:
            pass

        return ""

    def generate_fallback_insights(self, report_data: dict) -> List[str]:
        """
        Generates rule-based analytical business insights from data stats and correlations
        if no LLM API is available.
        """
        insights = []
        eda = report_data.get("eda_report", {})
        target = eda.get("target_column", "target")
        correlations = eda.get("correlations", {})
        explanation = report_data.get("explanation_report", {})
        feat_imp = explanation.get("feature_importance", [])
        
        if not feat_imp:
            # Fallback if SHAP wasn't run
            feat_imp = [{"feature": k, "importance": 1.0} for k in correlations.keys() if k != target]
            
        top_features = [f["feature"] for f in feat_imp[:3]]
        
        insights.append(f"Identified outcome: Optimize target column '{target}' to drive key business outcomes.")
        
        for feat in top_features:
            corr_val = 0.0
            if feat in correlations and target in correlations[feat]:
                corr_val = correlations[feat][target]
                
            display_feat = feat.replace("_", " ").title()
            
            if corr_val > 0.1:
                insights.append(
                    f"Risk Factor '{display_feat}': Shows positive correlation ({corr_val:.2f}) with '{target}'. "
                    f"Recommend monitoring segments with high '{display_feat}' to minimize negative outcomes."
                )
            elif corr_val < -0.1:
                insights.append(
                    f"Support Opportunity '{display_feat}': Shows negative correlation ({corr_val:.2f}) with '{target}'. "
                    f"Proactive engagement for users with lower '{display_feat}' values can improve retention."
                )
            else:
                insights.append(
                    f"Complex Driver '{display_feat}': Flagged as a key non-linear predictor. "
                    f"Even without strong linear correlation, its values help differentiate '{target}' segments."
                )
                
        best_model = report_data.get("model_selection_report", {}).get("best_model_name", "ML model")
        insights.append(f"Model Recommendation: Deploy the trained '{best_model}' to start forecasting '{target}' on production streams.")
        
        return insights

    def generate_insights(self, report_data: dict) -> Dict[str, Any]:
        """
        Builds insights using an LLM or falls back to rule-based analytics.
        """
        # Formulate rich context prompt
        eda = report_data.get("eda_report", {})
        target = eda.get("target_column", "target")
        model_name = report_data.get("model_selection_report", {}).get("best_model_name", "ML Model")
        model_metric = report_data.get("model_selection_report", {}).get("best_model_metrics", {})
        
        explanation = report_data.get("explanation_report", {})
        feat_imp = explanation.get("feature_importance", [])
        
        prompt = (
            f"You are an expert business analyst and data scientist.\n"
            f"Generate 3-5 actionable non-technical business insights from this ML report:\n"
            f"- Outcome target to analyze: '{target}'\n"
            f"- Best predictive model: '{model_name}' (Evaluation: {json.dumps(model_metric)})\n"
            f"- Key predictive features (SHAP importance): {json.dumps(feat_imp[:5])}\n"
            f"- Numerical correlations with target: {json.dumps(eda.get('correlations', {}))}\n\n"
            f"Format the output as a clean JSON list of strings, for example:\n"
            f'["Insight 1...", "Insight 2...", "Insight 3..."]'
        )

        response_text = self._call_llm(prompt)
        
        insights_list = []
        source = "LLM"
        
        if response_text:
            try:
                # Attempt to extract JSON list
                start = response_text.find("[")
                end = response_text.rfind("]") + 1
                if start != -1 and end != -1:
                    insights_list = json.loads(response_text[start:end])
            except Exception:
                pass
                
        if not insights_list:
            # Fallback
            insights_list = self.generate_fallback_insights(report_data)
            source = "Rule-based Fallback"
            
        return {
            "insights": insights_list,
            "source": source
        }
