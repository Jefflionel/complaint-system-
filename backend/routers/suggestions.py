# backend/routers/suggestions.py
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
import schemas
import security

router = APIRouter(prefix="/api/suggestions", tags=["Public Suggestion Box"])
DbSession = Annotated[Session, Depends(get_db)]

@router.post("/", response_model=schemas.SuggestionResponse, status_code=status.HTTP_201_CREATED)
def submit_suggestion(
    suggestion: schemas.SuggestionCreate,
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)]
):
    """Citizens submit improvement ideas."""
    new_idea = models.Suggestion(
        user_id=current_user_id,
        title=suggestion.title,
        description=suggestion.description,
        category=suggestion.category,
        district_id=suggestion.district_id
    )
    db.add(new_idea)
    db.commit()
    db.refresh(new_idea)
    
    setattr(new_idea, 'support_count', 0)
    return new_idea

@router.get("/district/{district_id}", response_model=List[schemas.SuggestionResponse])
def get_district_suggestions(
    district_id: int,
    db: DbSession,
):
    """Fetches all suggestions for a district, sorted by most popular."""
    # Build a smart query that counts upvotes automatically
    query = db.query(
        models.Suggestion, 
        func.count(models.SuggestionSupport.id).label('dynamic_count')
    ).outerjoin(models.SuggestionSupport)\
     .filter(models.Suggestion.district_id == district_id)\
     .group_by(models.Suggestion.id)\
     .order_by(func.count(models.SuggestionSupport.id).desc()).all()

    # Map the results cleanly to our schema
    final_suggestions = []
    for row in query:
        idea = row.Suggestion
        setattr(idea, 'support_count', row.dynamic_count)
        final_suggestions.append(idea)
        
    return final_suggestions

@router.patch("/{suggestion_id}/upvote")
def upvote_suggestion(
    suggestion_id: int,
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)]
):
    """Adds support to an idea and returns the new count. Prevents double-voting."""
    idea = db.query(models.Suggestion).filter(models.Suggestion.id == suggestion_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    new_support = models.SuggestionSupport(user_id=current_user_id, suggestion_id=suggestion_id)
    
    try:
        db.add(new_support)
        db.commit()
        
        # Calculate the new total and send it back to the frontend
        new_count = db.query(models.SuggestionSupport).filter(models.SuggestionSupport.suggestion_id == suggestion_id).count()
        return {"support_count": new_count}
        
    except IntegrityError:
        # The UniqueConstraint triggered because they already voted!
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already supported this suggestion.")