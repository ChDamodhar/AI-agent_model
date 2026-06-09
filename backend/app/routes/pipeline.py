from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..agents.orchestrator_agent import PipelineOrchestrator

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

class PipelineRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None

@router.post("/run", response_model=Dict[str, Any])
async def run_pipeline(req: PipelineRequest):
    try:
        orchestrator = PipelineOrchestrator()
        result = orchestrator.run(req.file_id, req.target_column)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Raw data file not found for given file_id.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
