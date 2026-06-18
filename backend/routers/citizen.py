# backend/routers/citizen.py
import os
import shutil
import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from services.ticket_service import generate_ticket_id
import security

router = APIRouter(prefix="/api/citizen/complaints", tags=["Citizen Complaints"])
DbSession = Annotated[Session, Depends(get_db)]

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True) 

@router.post("/", response_model=schemas.ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)],
    title: Annotated[str, Form(...)],
    description: Annotated[str, Form(...)],
    location: Annotated[str, Form(...)], # <-- NEW LOCATION FIELD
    district_id: Annotated[int, Form(...)],
    category_name: Annotated[schemas.ComplaintCategoryKey, Form(...)],
    is_anonymous: Annotated[bool, Form()] = False,
    latitude: Annotated[float | None, Form()] = None,
    longitude: Annotated[float | None, Form()] = None,
    photo: Annotated[UploadFile, File(...)] = ... 
):
    ticket_id = generate_ticket_id(db)
    
    # FIX: We NO LONGER set user_id to None here. 
    # We always save it to keep the citizen connected to their ticket!
    
    file_extension = photo.filename.split(".")[-1]
    unique_filename = f"{ticket_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    new_complaint = models.Complaint(
        ticket_id=ticket_id,
        user_id=current_user_id, # FIX: Always the logged-in user!
        title=title,
        description=description,
        location=location,       # NEW: Save the location text
        category=category_name,
        district_id=district_id,
        is_anonymous=is_anonymous, # This flag is saved to hide names later
        latitude=latitude,
        longitude=longitude,
        photo_path=file_path,  
        status=schemas.ComplaintStatus.PENDING 
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint

@router.get("/me", response_model=List[schemas.ComplaintResponse])
def get_my_complaints(
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)]
):
    complaints = db.query(models.Complaint)\
        .filter(models.Complaint.user_id == current_user_id)\
        .order_by(models.Complaint.created_at.desc())\
        .all()
    return complaints