# backend/routers/staff.py
import os
import shutil
import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
import models
import schemas
import security

router = APIRouter(prefix="/api/staff/complaints", tags=["Staff Management & Analytics"])
DbSession = Annotated[Session, Depends(get_db)]
UPLOAD_DIR = "uploads"

# A small Pydantic model strictly for receiving the JSON status update from JS
class StatusUpdate(BaseModel):
    status: schemas.ComplaintStatus

@router.get("/", response_model=List[schemas.ComplaintResponse])
def get_my_district_complaints(
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    """Automatically fetches complaints for the district the logged-in staff belongs to."""
    # 1. Find the staff member to get their district_id
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    # 2. Fetch complaints matching that exact district
    complaints = db.query(models.Complaint)\
        .filter(models.Complaint.district_id == staff.district_id)\
        .order_by(models.Complaint.created_at.desc())\
        .all()
    
    return complaints


@router.patch("/{complaint_id}/status", response_model=schemas.ComplaintResponse)
def update_complaint_status_json(
    complaint_id: int,
    payload: StatusUpdate,
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    """Updates the status via a clean JSON request from the Staff Dashboard."""
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = payload.status
    db.commit()
    db.refresh(complaint)
    
    return complaint


# (Optional) Keep your original resolve endpoint if you plan to build the photo upload form later!
@router.patch("/{complaint_id}/resolve", response_model=schemas.ComplaintResponse)
async def update_complaint_status_with_photo(
    complaint_id: int,
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)],
    status: Annotated[schemas.ComplaintStatus | None, Form()] = None,
    assigned_department: Annotated[schemas.DepartmentKey | None, Form()] = None,
    resolution_notes: Annotated[str | None, Form()] = None,
    resolution_photo: Annotated[UploadFile | None, File()] = None
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if status:
        complaint.status = status
    if assigned_department:
        complaint.assigned_department = assigned_department
    if resolution_notes:
        complaint.resolution_notes = resolution_notes

    if resolution_photo and resolution_photo.filename:
        file_extension = resolution_photo.filename.split(".")[-1]
        unique_filename = f"RESOLVED_{complaint.ticket_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resolution_photo.file, buffer)
        complaint.resolution_photo_path = file_path

    db.commit()
    db.refresh(complaint)
    return complaint
# ═══════════════════════════════════════════════════════
# THE ANALYTICS ENGINE
# ═══════════════════════════════════════════════════════
@router.get("/analytics")
def get_my_district_analytics(
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    """Generates chart data automatically for the staff's assigned district."""
    # Find the staff's district
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    # Count complaints grouped by their Status 
    status_counts = db.query(
        models.Complaint.status, func.count(models.Complaint.id)
    ).filter(models.Complaint.district_id == staff.district_id).group_by(models.Complaint.status).all()

    # Count complaints grouped by their Category 
    category_counts = db.query(
        models.Complaint.category, func.count(models.Complaint.id)
    ).filter(models.Complaint.district_id == staff.district_id).group_by(models.Complaint.category).all()

    return {
        "statuses": {status: count for status, count in status_counts},
        "categories": {category: count for category, count in category_counts}
    }
# suggestion endpoint
@router.get("/suggestions", response_model=List[schemas.SuggestionResponse])
def get_my_district_suggestions(
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    """Fetches suggestions for the logged-in staff's assigned district."""
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    
    query = db.query(
        models.Suggestion, 
        func.count(models.SuggestionSupport.id).label('dynamic_count')
    ).outerjoin(models.SuggestionSupport, models.Suggestion.id == models.SuggestionSupport.suggestion_id)\
     .filter(models.Suggestion.district_id == staff.district_id)\
     .group_by(models.Suggestion.id)\
     .order_by(func.count(models.SuggestionSupport.id).desc()).all()

    final_suggestions = []
    for row in query:
        idea = row.Suggestion
        setattr(idea, 'support_count', row.dynamic_count)
        final_suggestions.append(idea)
        
    return final_suggestions