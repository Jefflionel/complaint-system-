import os
import shutil
import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import schemas
import security

# Notice the specific staff prefix!
router = APIRouter(prefix="/api/staff/complaints", tags=["Staff Management & Analytics"])
DbSession = Annotated[Session, Depends(get_db)]
UPLOAD_DIR = "uploads"

@router.get("/district/{district_id}", response_model=List[schemas.ComplaintResponse])
def get_district_complaints(
    district_id: int, 
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    if district_id < 1 or district_id > 7:
        raise HTTPException(status_code=400, detail="Invalid Yaoundé district ID")

    complaints = db.query(models.Complaint)\
        .filter(models.Complaint.district_id == district_id)\
        .order_by(models.Complaint.created_at.desc())\
        .all()
    return complaints

@router.patch("/{complaint_id}/resolve", response_model=schemas.ComplaintResponse)
async def update_complaint_status(
    complaint_id: int,
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)],
    status: Annotated[schemas.ComplaintStatus | None, Form()] = None,
    assigned_department: Annotated[schemas.DepartmentKey | None, Form()] = None,
    resolution_notes: Annotated[str | None, Form()] = None,
    resolution_photo: UploadFile = File(None) 
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
# FEATURE E1 & E2: THE ANALYTICS ENGINE
# ═══════════════════════════════════════════════════════
@router.get("/district/{district_id}/analytics")
def get_district_analytics(
    district_id: int,
    db: DbSession,
    staff_id: Annotated[int, Depends(security.get_current_staff_id)]
):
    """Generates chart data for the Staff Dashboard."""
    
    # Count complaints grouped by their Status (Feature E1)
    status_counts = db.query(
        models.Complaint.status, func.count(models.Complaint.id)
    ).filter(models.Complaint.district_id == district_id).group_by(models.Complaint.status).all()

    # Count complaints grouped by their Category (Feature E2)
    category_counts = db.query(
        models.Complaint.category, func.count(models.Complaint.id)
    ).filter(models.Complaint.district_id == district_id).group_by(models.Complaint.category).all()

    # Format the data cleanly for the frontend charts
    return {
        "statuses": {status: count for status, count in status_counts},
        "categories": {category: count for category, count in category_counts}
    }