from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
import datetime

from ..agents.orchestrator_agent import PipelineOrchestrator
from ..database import get_db, PipelineRun

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

class PipelineRequest(BaseModel):
    file_id: str
    target_column: Optional[str] = None

def run_background_pipeline(file_id: str, target_column: Optional[str], job_id: str):
    try:
        orchestrator = PipelineOrchestrator()
        orchestrator.run(file_id, target_column, job_id)
    except Exception as e:
        print(f"Background pipeline execution failed for job {job_id}: {e}")

@router.post("/run", response_model=Dict[str, Any])
async def run_pipeline(req: PipelineRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job_id = str(uuid.uuid4())
    # Pre-create the pipeline run record in the database as pending
    try:
        pipeline_run = PipelineRun(
            file_id=req.file_id,
            job_id=job_id,
            status="pending",
            started_at=datetime.datetime.utcnow(),
            meta_json={"steps": {}}
        )
        db.add(pipeline_run)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during pipeline initialization: {str(e)}")

    # Add execution to background tasks
    background_tasks.add_task(run_background_pipeline, req.file_id, req.target_column, job_id)

    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Pipeline execution started in the background."
    }

@router.get("/status/{job_id}", response_model=Dict[str, Any])
async def get_pipeline_status(job_id: str, db: Session = Depends(get_db)):
    run = db.query(PipelineRun).filter(PipelineRun.job_id == job_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline job not found.")
    
    # Return status, steps, and any metadata/insights if complete
    return {
        "job_id": run.job_id,
        "file_id": run.file_id,
        "status": run.status,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "steps": (run.meta_json or {}).get("steps", {}),
        "metadata": run.meta_json or {}
    }
